package com.margelo.nitro.tickle

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.margelo.nitro.NitroModules
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * Android haptics engine backing the Tickle Nitro module.
 *
 * Mirrors the structure of the iOS `HapticFeedback` (TickleUtils.swift), but Android has no
 * CoreHaptics equivalent, so this is an approximation built on [Vibrator]/[VibrationEffect]:
 *  - `intensity` maps to vibration amplitude (0..255).
 *  - `sharpness` selects composition primitives on API 30+ (sharp -> CLICK/TICK, dull -> THUD)
 *    for transient patterns and system haptics; it has no effect on the continuous/waveform path.
 *  - Android exposes a single system vibrator, so only one pattern/continuous player is
 *    physically active at a time ("last writer wins").
 */
class HapticFeedback private constructor() {

  companion object {
    val shared = HapticFeedback()

    private const val PREFS_NAME = "com.tickle.prefs"
    private const val HAPTICS_ENABLED_KEY = "com.tickle.hapticsEnabled"

    private const val MAX_AMPLITUDE = 255

    /** Duration used for the (looping) continuous player sustain tail. */
    private const val CONTINUOUS_DURATION_MS = 30_000L

    /** Timeline sampling resolution when rendering [startHaptic] patterns. */
    private const val SAMPLE_STEP_MS = 16.0

    /** How long a single transient event vibrates for. */
    private const val TRANSIENT_MS = 12.0

    // MARK: Continuous player tuning
    //
    // Android has no API to modulate a playing vibration, so every intensity change must
    // supersede the current effect (each supersede briefly brakes the actuator). To hide those
    // seams we never issue a *flat* amplitude: each update plays a short amplitude RAMP from the
    // current level to the new target (amplitude changes *within* one waveform are seamless),
    // followed by a sustain tail. Continuous motion within each effect masks the supersede seams.

    /** Window over which each continuous update ramps from the current amplitude to the target. */
    private const val CONTINUOUS_RAMP_MS = 120L

    /** Resolution of the ramp (smaller = smoother ramp, more steps per update). */
    private const val CONTINUOUS_RAMP_STEP_MS = 12L

    /** Sustain segment played (and looped) at the target amplitude after the ramp. */
    private const val CONTINUOUS_HOLD_MS = 3_000L

    /** Keep the actuator energized while a player is running so it never fully brakes mid-drag. */
    private const val CONTINUOUS_MIN_AMPLITUDE = 1

    /** Minimum amplitude delta before a continuous update re-issues the vibration. */
    private const val CONTINUOUS_UPDATE_THRESHOLD = 2

    // MARK: Composition primitives (Phase 2)

    /** Above this many transients, fall back to the waveform renderer instead of a composition. */
    private const val MAX_COMPOSITION_PRIMITIVES = 100

    /** Max inter-primitive delay a composition accepts (ms); longer patterns fall back. */
    private const val MAX_PRIMITIVE_DELAY_MS = 10_000
  }

  private val lock = Any()

  /** State stored per continuous player id. */
  private class ContinuousPlayer(
    var intensity: Double,
    var sharpness: Double,
    var isRunning: Boolean = false,
    var lastAmplitude: Int = -1,
  )

  private val continuousPlayers = HashMap<String, ContinuousPlayer>()

  @Volatile
  private var cachedVibrator: Vibrator? = null

  // MARK: - Context / Vibrator resolution

  private val context: Context?
    get() = NitroModules.applicationContext?.applicationContext

  private fun resolveVibrator(): Vibrator? {
    cachedVibrator?.let { return it }
    val ctx = context ?: return null
    val vib = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val manager = ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
      manager?.defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      ctx.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
    cachedVibrator = vib
    return vib
  }

  private val supportsHaptics: Boolean
    get() = resolveVibrator()?.hasVibrator() == true

  // MARK: - Global Haptics Enable/Disable

  private val prefs: SharedPreferences?
    get() = context?.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  /**
   * Whether haptics are globally enabled. Persisted in SharedPreferences.
   * Defaults to true if not previously set (mirrors the iOS UserDefaults behavior).
   */
  var hapticsEnabled: Boolean
    get() = prefs?.getBoolean(HAPTICS_ENABLED_KEY, true) ?: true
    set(value) {
      prefs?.edit()?.putBoolean(HAPTICS_ENABLED_KEY, value)?.apply()
    }

  // MARK: - Engine lifecycle

  /** Android needs no engine; we simply resolve/cache the vibrator handle. */
  fun initializeEngine() {
    cachedVibrator = null
    resolveVibrator()
  }

  /** Cancels any active vibration and marks continuous players stopped (configs are kept). */
  fun destroyEngine() {
    cancelVibration()
    synchronized(lock) {
      for (player in continuousPlayers.values) {
        player.isRunning = false
        player.lastAmplitude = -1
      }
    }
  }

  fun stopAllHaptics() {
    cancelVibration()
    synchronized(lock) {
      for (player in continuousPlayers.values) {
        player.isRunning = false
        player.lastAmplitude = -1
      }
    }
  }

  // MARK: - Custom pattern playback

  fun startHaptic(events: Array<HapticEvent>, curves: Array<HapticCurve>) {
    if (!hapticsEnabled) return
    if (!supportsHaptics) return

    // Phase 2: an all-transient pattern renders with crisper feel (and honors sharpness) as a
    // composition of primitives. Anything with a continuous segment/curve stays on the waveform
    // renderer, which the composition path can't represent.
    if (tryComposeTransients(events)) return

    val waveform = buildWaveform(events, curves) ?: return
    vibrateWaveform(waveform.first, waveform.second, repeat = -1)
  }

  /**
   * Renders the events + intensity curves into a single amplitude timeline, then run-length
   * encodes it into (timings, amplitudes) for [VibrationEffect.createWaveform].
   */
  private fun buildWaveform(
    events: Array<HapticEvent>,
    curves: Array<HapticCurve>,
  ): Pair<LongArray, IntArray>? {
    if (events.isEmpty()) return null

    var maxEnd = 0.0
    for (event in events) {
      val end = when (event.type) {
        HapticEventType.CONTINUOUS -> event.relativeTime + (event.duration ?: 0.0)
        HapticEventType.TRANSIENT -> event.relativeTime + TRANSIENT_MS
      }
      if (end > maxEnd) maxEnd = end
    }
    if (maxEnd <= 0.0) return null

    val bucketCount = ceil(maxEnd / SAMPLE_STEP_MS).toInt() + 1
    val amps = IntArray(bucketCount)

    for (event in events) {
      val baseIntensity = paramValue(event.parameters, HapticParameterType.INTENSITY, 1.0)
      when (event.type) {
        HapticEventType.TRANSIENT -> {
          val amp = toAmplitude(baseIntensity)
          val startIdx = (event.relativeTime / SAMPLE_STEP_MS).toInt()
          val endIdx = ((event.relativeTime + TRANSIENT_MS) / SAMPLE_STEP_MS).toInt()
          for (i in startIdx..endIdx) {
            if (i in amps.indices) amps[i] = max(amps[i], amp)
          }
        }
        HapticEventType.CONTINUOUS -> {
          val duration = event.duration ?: 0.0
          if (duration <= 0.0) continue
          val curve = findCurve(curves, HapticParameterType.INTENSITY, event.relativeTime)
          var t = 0.0
          while (t <= duration) {
            val intensityAt =
              if (curve != null) interpolateCurve(curve.controlPoints, t, baseIntensity)
              else baseIntensity
            val idx = ((event.relativeTime + t) / SAMPLE_STEP_MS).toInt()
            if (idx in amps.indices) amps[idx] = max(amps[idx], toAmplitude(intensityAt))
            t += SAMPLE_STEP_MS
          }
        }
      }
    }

    return runLengthEncode(amps, SAMPLE_STEP_MS.roundToInt().toLong())
  }

  // MARK: - Continuous players

  fun createContinuousPlayer(playerId: String, initialIntensity: Double, initialSharpness: Double) {
    synchronized(lock) {
      // Replace any existing player (matches iOS create semantics: stop + recreate, not running).
      continuousPlayers[playerId] = ContinuousPlayer(initialIntensity, initialSharpness)
    }
  }

  fun startContinuousPlayer(playerId: String) {
    if (!hapticsEnabled) return
    if (!supportsHaptics) return

    val target: Int
    synchronized(lock) {
      val player = continuousPlayers[playerId] ?: return
      player.isRunning = true
      target = toContinuousAmplitude(player.intensity)
      player.lastAmplitude = target
    }
    // Ramp up from the resting minimum so the attack is smooth.
    playContinuousRamp(CONTINUOUS_MIN_AMPLITUDE, target)
  }

  fun updateContinuousPlayer(playerId: String, intensityControl: Double, sharpnessControl: Double) {
    val from: Int
    val to: Int
    synchronized(lock) {
      val player = continuousPlayers[playerId] ?: return
      player.intensity = intensityControl
      player.sharpness = sharpnessControl
      if (!player.isRunning) return

      to = toContinuousAmplitude(intensityControl)
      // Throttle: skip imperceptible changes so we don't supersede more than necessary.
      if (abs(to - player.lastAmplitude) < CONTINUOUS_UPDATE_THRESHOLD) return
      from = player.lastAmplitude.coerceIn(CONTINUOUS_MIN_AMPLITUDE, MAX_AMPLITUDE)
      player.lastAmplitude = to
    }
    playContinuousRamp(from, to)
  }

  fun stopContinuousPlayer(playerId: String) {
    synchronized(lock) {
      val player = continuousPlayers[playerId] ?: return
      player.isRunning = false
      player.lastAmplitude = -1
    }
    cancelVibration()
  }

  fun destroyContinuousPlayer(playerId: String) {
    val existed: Boolean
    synchronized(lock) {
      existed = continuousPlayers.remove(playerId) != null
    }
    if (existed) cancelVibration()
  }

  /**
   * Plays an amplitude ramp from [fromAmp] to [toAmp] followed by a looped sustain at [toAmp].
   * The ramp gives continuous tactile motion within a single (seamless) waveform; the sustain
   * holds the level until the next update supersedes it.
   */
  private fun playContinuousRamp(fromAmp: Int, toAmp: Int) {
    if (!supportsHaptics) return
    val vibrator = resolveVibrator() ?: return

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val steps = max(1, (CONTINUOUS_RAMP_MS / CONTINUOUS_RAMP_STEP_MS).toInt())
      val timings = LongArray(steps + 1)
      val amplitudes = IntArray(steps + 1)
      val start = fromAmp.coerceIn(CONTINUOUS_MIN_AMPLITUDE, MAX_AMPLITUDE)
      val end = toAmp.coerceIn(CONTINUOUS_MIN_AMPLITUDE, MAX_AMPLITUDE)
      for (i in 1..steps) {
        val frac = i.toDouble() / steps
        timings[i - 1] = CONTINUOUS_RAMP_STEP_MS
        amplitudes[i - 1] =
          (start + (end - start) * frac).roundToInt().coerceIn(CONTINUOUS_MIN_AMPLITUDE, MAX_AMPLITUDE)
      }
      // Sustain tail, looped so the level holds if no further updates arrive.
      timings[steps] = CONTINUOUS_HOLD_MS
      amplitudes[steps] = end
      vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, steps))
    } else {
      // Legacy devices (API 24-25): no amplitude control, just a sustained on.
      @Suppress("DEPRECATION")
      vibrator.vibrate(longArrayOf(0L, CONTINUOUS_DURATION_MS), 0)
    }
  }

  // MARK: - System haptics (predefined OS-level feedback)

  fun triggerImpact(style: HapticImpactStyle) {
    if (!hapticsEnabled) return
    if (!supportsHaptics) return

    // Phase 2: composition primitives give OS-tuned feel and let us express the sharp/dull axis
    // (CLICK/TICK vs THUD). Fall back to predefined/one-shot on older or unsupported devices.
    val composed = when (style) {
      HapticImpactStyle.LIGHT -> playComposition(listOf(CompositionStep(Prim.TICK, 0.55f)))
      HapticImpactStyle.MEDIUM -> playComposition(listOf(CompositionStep(Prim.CLICK, 0.7f)))
      HapticImpactStyle.HEAVY -> playComposition(listOf(CompositionStep(Prim.CLICK, 1.0f)))
      HapticImpactStyle.RIGID -> playComposition(listOf(CompositionStep(Prim.TICK, 1.0f)))
      HapticImpactStyle.SOFT -> playComposition(listOf(CompositionStep(Prim.THUD, 0.7f)))
    }
    if (composed) return

    when (style) {
      HapticImpactStyle.HEAVY -> playPredefinedOrOneShot(Predefined.HEAVY_CLICK, 18L, 255)
      HapticImpactStyle.MEDIUM -> playPredefinedOrOneShot(Predefined.CLICK, 14L, 190)
      HapticImpactStyle.LIGHT -> playPredefinedOrOneShot(Predefined.TICK, 10L, 120)
      HapticImpactStyle.RIGID -> vibrateOneShot(8L, 255)
      HapticImpactStyle.SOFT -> vibrateOneShot(24L, 120)
    }
  }

  fun triggerNotification(type: HapticNotificationType) {
    if (!hapticsEnabled) return
    if (!supportsHaptics) return

    // Phase 2: sequence primitives with delays for a crisper multi-pulse feel.
    val composed = when (type) {
      // light tap, then a stronger confirmation
      HapticNotificationType.SUCCESS -> playComposition(
        listOf(CompositionStep(Prim.TICK, 0.6f), CompositionStep(Prim.CLICK, 1.0f, 90))
      )
      // two medium pulses
      HapticNotificationType.WARNING -> playComposition(
        listOf(CompositionStep(Prim.CLICK, 0.8f), CompositionStep(Prim.CLICK, 0.8f, 120))
      )
      // three sharp pulses
      HapticNotificationType.ERROR -> playComposition(
        listOf(
          CompositionStep(Prim.CLICK, 1.0f),
          CompositionStep(Prim.CLICK, 1.0f, 90),
          CompositionStep(Prim.CLICK, 1.0f, 90),
        )
      )
    }
    if (composed) return

    when (type) {
      HapticNotificationType.SUCCESS ->
        vibrateWaveform(longArrayOf(0L, 40L, 90L, 70L), intArrayOf(0, 130, 0, 210), -1)
      HapticNotificationType.WARNING ->
        vibrateWaveform(longArrayOf(0L, 60L, 90L, 60L), intArrayOf(0, 190, 0, 190), -1)
      HapticNotificationType.ERROR ->
        vibrateWaveform(
          longArrayOf(0L, 50L, 60L, 50L, 60L, 50L),
          intArrayOf(0, 230, 0, 230, 0, 230),
          -1,
        )
    }
  }

  fun triggerSelection() {
    if (!hapticsEnabled) return
    if (!supportsHaptics) return
    if (playComposition(listOf(CompositionStep(Prim.TICK, 0.4f)))) return
    playPredefinedOrOneShot(Predefined.TICK, 10L, 90)
  }

  /** OS-tuned predefined effects, resolved to real ids only inside the API 29+ guard. */
  private enum class Predefined { CLICK, HEAVY_CLICK, TICK }

  // MARK: - Composition primitives (Phase 2)

  /** Primitives we use; resolved to real VibrationEffect.Composition ids inside API guards. */
  private enum class Prim { CLICK, TICK, THUD, LOW_TICK }

  /** One step of a primitive composition. [delayMs] is the gap after the previous primitive. */
  private data class CompositionStep(val prim: Prim, val scale: Float, val delayMs: Int = 0)

  /**
   * Renders a transient-only pattern as a composition of primitives (crisper feel + sharpness).
   * Returns false — so the caller falls back to the waveform renderer — when the pattern has any
   * continuous segment, is too large, or the device lacks primitive support.
   */
  private fun tryComposeTransients(events: Array<HapticEvent>): Boolean {
    if (events.isEmpty()) return false
    if (events.size > MAX_COMPOSITION_PRIMITIVES) return false
    if (events.any { it.type != HapticEventType.TRANSIENT }) return false

    val sorted = events.sortedBy { it.relativeTime }
    val steps = ArrayList<CompositionStep>(sorted.size)
    var prevTime = 0.0
    for (event in sorted) {
      val intensity = paramValue(event.parameters, HapticParameterType.INTENSITY, 1.0)
      val sharpness = paramValue(event.parameters, HapticParameterType.SHARPNESS, 0.5)
      val prim = if (sharpness >= 0.5) Prim.CLICK else Prim.THUD
      val delay = (event.relativeTime - prevTime)
        .coerceIn(0.0, MAX_PRIMITIVE_DELAY_MS.toDouble())
        .roundToInt()
      steps.add(CompositionStep(prim, intensity.toFloat(), delay))
      prevTime = event.relativeTime
    }
    return playComposition(steps)
  }

  /**
   * Plays a primitive composition. Returns false (caller should fall back) when compositions
   * aren't available: API < 30, no vibrator, or the required primitives aren't supported.
   * Unsupported richer primitives (THUD/LOW_TICK) degrade to CLICK/TICK before the support check.
   */
  private fun playComposition(steps: List<CompositionStep>): Boolean {
    if (steps.isEmpty()) return false
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return false
    val vibrator = resolveVibrator() ?: return false

    val resolved = steps.map { it.copy(prim = usablePrimitive(it.prim, vibrator)) }
    val ids = IntArray(resolved.size) { primitiveId(resolved[it].prim) }
    if (!vibrator.arePrimitivesSupported(*ids).all { it }) return false

    val composition = VibrationEffect.startComposition()
    for (step in resolved) {
      composition.addPrimitive(
        primitiveId(step.prim),
        step.scale.coerceIn(0f, 1f),
        step.delayMs.coerceIn(0, MAX_PRIMITIVE_DELAY_MS),
      )
    }
    vibrator.vibrate(composition.compose())
    return true
  }

  /** Downgrades API-31 / unsupported primitives so the composition still plays on more devices. */
  private fun usablePrimitive(prim: Prim, vibrator: Vibrator): Prim {
    val needsApi31 = prim == Prim.THUD || prim == Prim.LOW_TICK
    if (needsApi31 && Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      return if (prim == Prim.THUD) Prim.CLICK else Prim.TICK
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R &&
      !vibrator.arePrimitivesSupported(primitiveId(prim)).first()
    ) {
      return when (prim) {
        Prim.THUD -> Prim.CLICK
        Prim.LOW_TICK -> Prim.TICK
        else -> prim
      }
    }
    return prim
  }

  /** Resolves a [Prim] to its VibrationEffect.Composition id. Call only under an API 30+ guard. */
  private fun primitiveId(prim: Prim): Int = when (prim) {
    Prim.CLICK -> VibrationEffect.Composition.PRIMITIVE_CLICK
    Prim.TICK -> VibrationEffect.Composition.PRIMITIVE_TICK
    Prim.THUD -> VibrationEffect.Composition.PRIMITIVE_THUD
    Prim.LOW_TICK -> VibrationEffect.Composition.PRIMITIVE_LOW_TICK
  }

  // MARK: - Low-level vibration helpers

  private fun cancelVibration() {
    resolveVibrator()?.cancel()
  }

  private fun vibrateOneShot(durationMs: Long, amplitude: Int) {
    val vibrator = resolveVibrator() ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val amp = amplitude.coerceIn(1, MAX_AMPLITUDE)
      vibrator.vibrate(VibrationEffect.createOneShot(durationMs, amp))
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(durationMs)
    }
  }

  private fun vibrateWaveform(timings: LongArray, amplitudes: IntArray, repeat: Int) {
    if (timings.isEmpty()) return
    val vibrator = resolveVibrator() ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, repeat))
    } else {
      // Legacy devices (API 24-25) have no amplitude control: fall back to an on/off pattern.
      @Suppress("DEPRECATION")
      vibrator.vibrate(toLegacyPattern(timings, amplitudes), repeat)
    }
  }

  /**
   * Plays a predefined effect on API 29+ (nicer OS-tuned feel), otherwise a one-shot fallback.
   */
  private fun playPredefinedOrOneShot(effect: Predefined, fallbackMs: Long, fallbackAmp: Int) {
    val vibrator = resolveVibrator() ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val effectId = when (effect) {
        Predefined.CLICK -> VibrationEffect.EFFECT_CLICK
        Predefined.HEAVY_CLICK -> VibrationEffect.EFFECT_HEAVY_CLICK
        Predefined.TICK -> VibrationEffect.EFFECT_TICK
      }
      vibrator.vibrate(VibrationEffect.createPredefined(effectId))
    } else {
      vibrateOneShot(fallbackMs, fallbackAmp)
    }
  }

  // MARK: - Timeline math

  private fun paramValue(
    params: Array<HapticEventParameter>,
    type: HapticParameterType,
    default: Double,
  ): Double {
    for (param in params) {
      if (param.type == type) return param.value
    }
    return default
  }

  private fun findCurve(
    curves: Array<HapticCurve>,
    type: HapticParameterType,
    eventTime: Double,
  ): HapticCurve? {
    for (curve in curves) {
      if (curve.type == type && abs(curve.relativeTime - eventTime) < 1.0) return curve
    }
    return null
  }

  /** Linear interpolation over a curve's control points (relative to the event start). */
  private fun interpolateCurve(
    points: Array<HapticCurveControlPoint>,
    t: Double,
    default: Double,
  ): Double {
    if (points.isEmpty()) return default
    val first = points.first()
    val last = points.last()
    if (t <= first.relativeTime) return first.value
    if (t >= last.relativeTime) return last.value
    for (i in 0 until points.size - 1) {
      val p1 = points[i]
      val p2 = points[i + 1]
      if (p1.relativeTime <= t && p2.relativeTime >= t) {
        if (p2.relativeTime == p1.relativeTime) return p1.value
        val ratio = (t - p1.relativeTime) / (p2.relativeTime - p1.relativeTime)
        return p1.value + ratio * (p2.value - p1.value)
      }
    }
    return default
  }

  private fun toAmplitude(intensity: Double): Int =
    (intensity.coerceIn(0.0, 1.0) * MAX_AMPLITUDE).roundToInt().coerceIn(0, MAX_AMPLITUDE)

  /** Like [toAmplitude] but never returns 0, so a running continuous player never fully brakes. */
  private fun toContinuousAmplitude(intensity: Double): Int =
    (intensity.coerceIn(0.0, 1.0) * MAX_AMPLITUDE).roundToInt().coerceIn(CONTINUOUS_MIN_AMPLITUDE, MAX_AMPLITUDE)

  private fun runLengthEncode(amps: IntArray, stepMs: Long): Pair<LongArray, IntArray>? {
    if (amps.isEmpty()) return null

    val timings = ArrayList<Long>()
    val amplitudes = ArrayList<Int>()
    var runAmp = amps[0]
    var runLen = 1
    for (i in 1 until amps.size) {
      if (amps[i] == runAmp) {
        runLen++
      } else {
        timings.add(runLen * stepMs)
        amplitudes.add(runAmp)
        runAmp = amps[i]
        runLen = 1
      }
    }
    timings.add(runLen * stepMs)
    amplitudes.add(runAmp)

    if (amplitudes.all { it == 0 }) return null
    return Pair(timings.toLongArray(), amplitudes.toIntArray())
  }

  /**
   * Converts an amplitude waveform into a legacy on/off pattern (alternating off, on, off, ...
   * starting with off) for devices below API 26.
   */
  private fun toLegacyPattern(timings: LongArray, amplitudes: IntArray): LongArray {
    val pattern = ArrayList<Long>()
    var expectingOff = true
    for (i in timings.indices) {
      val isOn = amplitudes[i] > 0
      // Emit a zero-length placeholder whenever the on/off state doesn't match the slot we're in.
      if (isOn && expectingOff) {
        pattern.add(0L)
        expectingOff = false
      } else if (!isOn && !expectingOff) {
        pattern.add(0L)
        expectingOff = true
      }
      pattern.add(timings[i])
      expectingOff = !expectingOff
    }
    return pattern.toLongArray()
  }
}
