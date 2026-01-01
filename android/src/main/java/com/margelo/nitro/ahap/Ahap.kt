package com.margelo.nitro.ahap
  
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class Ahap : HybridAhapSpec() {
  override val memorySize: Long
    get() = 0L

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

  override fun createContinuousPlayer(initialIntensity: Double, initialSharpness: Double) {
    // TODO: Android haptics implementation not yet supported
  }

  override fun startContinuousPlayer() {
    // TODO: Android haptics implementation not yet supported
  }

  override fun updateContinuousPlayer(intensityControl: Double, sharpnessControl: Double) {
    // TODO: Android haptics implementation not yet supported
  }

  override fun stopContinuousPlayer() {
    // TODO: Android haptics implementation not yet supported
  }
}
