package com.margelo.nitro.ahap
  
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class Ahap : HybridAhapSpec() {
  override val memorySize: Long
    get() = 0L

  private var hapticsEnabled: Boolean = true

  override fun startHaptic(events: Array<HapticEvent>, curves: Array<HapticCurve>) {
    // TODO: Android haptics implementation not yet supported
  }

  override fun stopAllHaptics() {
    // TODO: Android haptics implementation not yet supported
  }

  override fun initializeEngine() {
    // TODO: Android haptics implementation not yet supported
  }

  override fun destroyEngine() {
    // TODO: Android haptics implementation not yet supported
  }

  override fun createContinuousPlayer(playerId: String, initialIntensity: Double, initialSharpness: Double) {
    // TODO: Android haptics implementation not yet supported
  }

  override fun startContinuousPlayer(playerId: String) {
    // TODO: Android haptics implementation not yet supported
  }

  override fun updateContinuousPlayer(playerId: String, intensityControl: Double, sharpnessControl: Double) {
    // TODO: Android haptics implementation not yet supported
  }

  override fun stopContinuousPlayer(playerId: String) {
    // TODO: Android haptics implementation not yet supported
  }
  
  override fun destroyContinuousPlayer(playerId: String) {
    // TODO: Android haptics implementation not yet supported
  }

  // MARK: - Global Haptics Enable/Disable

  override fun setHapticsEnabled(enabled: Boolean) {
    hapticsEnabled = enabled
  }

  override fun getHapticsEnabled(): Boolean {
    return hapticsEnabled
  }

  // MARK: - System Haptics (Predefined OS-level feedback)

  override fun triggerImpact(style: HapticImpactStyle) {
    // TODO: Android haptics implementation not yet supported
  }

  override fun triggerNotification(type: HapticNotificationType) {
    // TODO: Android haptics implementation not yet supported
  }

  override fun triggerSelection() {
    // TODO: Android haptics implementation not yet supported
  }
}
