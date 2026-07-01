package com.margelo.nitro.tickle

import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class Tickle : HybridTickleSpec() {
  override val memorySize: Long
    get() = 0L

  private val haptics = HapticFeedback.shared

  override fun startHaptic(events: Array<HapticEvent>, curves: Array<HapticCurve>) {
    haptics.startHaptic(events, curves)
  }

  override fun stopAllHaptics() {
    haptics.stopAllHaptics()
  }

  override fun initializeEngine() {
    haptics.initializeEngine()
  }

  override fun destroyEngine() {
    haptics.destroyEngine()
  }

  // MARK: - Continuous Player Methods

  override fun createContinuousPlayer(playerId: String, initialIntensity: Double, initialSharpness: Double) {
    haptics.createContinuousPlayer(playerId, initialIntensity, initialSharpness)
  }

  override fun startContinuousPlayer(playerId: String) {
    haptics.startContinuousPlayer(playerId)
  }

  override fun updateContinuousPlayer(playerId: String, intensityControl: Double, sharpnessControl: Double) {
    haptics.updateContinuousPlayer(playerId, intensityControl, sharpnessControl)
  }

  override fun stopContinuousPlayer(playerId: String) {
    haptics.stopContinuousPlayer(playerId)
  }

  override fun destroyContinuousPlayer(playerId: String) {
    haptics.destroyContinuousPlayer(playerId)
  }

  // MARK: - Global Haptics Enable/Disable

  override fun setHapticsEnabled(enabled: Boolean) {
    haptics.hapticsEnabled = enabled
  }

  override fun getHapticsEnabled(): Boolean {
    return haptics.hapticsEnabled
  }

  // MARK: - System Haptics (Predefined OS-level feedback)

  override fun triggerImpact(style: HapticImpactStyle) {
    haptics.triggerImpact(style)
  }

  override fun triggerNotification(type: HapticNotificationType) {
    haptics.triggerNotification(type)
  }

  override fun triggerSelection() {
    haptics.triggerSelection()
  }
}
