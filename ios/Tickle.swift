import CoreHaptics
import UIKit

struct AnyHapticAnimationState: HapticAnimationState {
    var hapticEvents: [CHHapticEvent]
    var hapticCurves: [CHHapticParameterCurve]

    init(hapticEvents: [CHHapticEvent], hapticCurves: [CHHapticParameterCurve]) {
        self.hapticEvents = hapticEvents
        self.hapticCurves = hapticCurves
    }
}


class Tickle: HybridTickleSpec {
  func stopAllHaptics() throws {
    haptics.stopAllHapticPlayers()
  }

  func initializeEngine() throws {
    haptics.createAndStartHapticEngine()
  }

  func destroyEngine() throws {
    haptics.destroyEngine()
  }

  // MARK: - Continuous Player Methods

  func createContinuousPlayer(playerId: String, initialIntensity: Double, initialSharpness: Double) throws {
    haptics.createContinuousPlayer(playerId: playerId, initialIntensity: Float(initialIntensity), initialSharpness: Float(initialSharpness))
  }

  func startContinuousPlayer(playerId: String) throws {
    haptics.startContinuousPlayer(playerId: playerId)
  }

  func updateContinuousPlayer(playerId: String, intensityControl: Double, sharpnessControl: Double) throws {
    haptics.updateContinuousPlayer(playerId: playerId, intensityControl: Float(intensityControl), sharpnessControl: Float(sharpnessControl))
  }

  func stopContinuousPlayer(playerId: String) throws {
    haptics.stopContinuousPlayer(playerId: playerId)
  }
  
  func destroyContinuousPlayer(playerId: String) throws {
    haptics.destroyContinuousPlayer(playerId: playerId)
  }
  
  // MARK: - Global Haptics Enable/Disable
  
  func setHapticsEnabled(enabled: Bool) throws {
    haptics.hapticsEnabled = enabled
  }
  
  func getHapticsEnabled() throws -> Bool {
    return haptics.hapticsEnabled
  }

  
  func startHaptic(events: [HapticEvent], curves: [HapticCurve]) throws {
    let hapticEvents = events.map { event -> CHHapticEvent in
      let eventType: CHHapticEvent.EventType = (event.type == .continuous) ? .hapticContinuous : .hapticTransient
      let parameters = event.parameters.map { parameter -> CHHapticEventParameter in
        let parameterID: CHHapticEvent.ParameterID = (parameter.type == .intensity) ? .hapticIntensity : .hapticSharpness
        return CHHapticEventParameter(parameterID: parameterID, value: Float(parameter.value))
      }
      return CHHapticEvent(
        eventType: eventType,
        parameters: parameters,
        relativeTime: event.relativeTime / 1000.0,
        duration: event.type == .continuous ? (event.duration ?? 1000.0) / 1000.0 : 0
      )
    }

    var hapticCurves: [CHHapticParameterCurve] = []
    for curve in curves {
      let parameterID: CHHapticDynamicParameter.ID = (curve.type == .intensity) ? .hapticIntensityControl : .hapticSharpnessControl
      
      var controlPoints: [CHHapticParameterCurve.ControlPoint] = []
      for controlPoint in curve.controlPoints {
        let point = CHHapticParameterCurve.ControlPoint(
          relativeTime: controlPoint.relativeTime / 1000.0,
          value: Float(controlPoint.value)
        )
        controlPoints.append(point)
      }
      
      // Find the matching continuous event to get its duration.
      // The curve's relativeTime should match a continuous event's relativeTime.
      var matchingEvent: HapticEvent? = nil
      for event in events {
        let isContinuous = event.type == .continuous
        let diff = event.relativeTime - curve.relativeTime
        let timeDiff = diff < 0 ? -diff : diff
        if isContinuous && timeDiff < 1 {
          matchingEvent = event
          break
        }
      }
      
      // Add a reset control point at the end of the continuous event.
      // This ensures hapticIntensityControl/hapticSharpnessControl return to 1.0 (neutral)
      // so subsequent events (like transients) aren't affected by this curve's final value.
      if let event = matchingEvent, let duration = event.duration {
        let resetTime = duration / 1000.0
        // Only add if it's after the last control point
        if let lastPoint = controlPoints.last, resetTime > lastPoint.relativeTime {
          controlPoints.append(CHHapticParameterCurve.ControlPoint(relativeTime: resetTime, value: 1.0))
        }
      }
      
      let hapticCurve = CHHapticParameterCurve(
        parameterID: parameterID,
        controlPoints: controlPoints,
        relativeTime: curve.relativeTime / 1000.0
      )
      hapticCurves.append(hapticCurve)
    }

    let state = AnyHapticAnimationState(hapticEvents: hapticEvents, hapticCurves: hapticCurves)
    haptics.createHapticPlayers(for: [state])
    haptics.startHapticPlayer(for: state)
  }
  
  // MARK: - System Haptics (Predefined OS-level feedback)
  
  func triggerImpact(style: HapticImpactStyle) throws {
    guard haptics.hapticsEnabled else { return }
    
    let feedbackStyle = style.toUIFeedbackStyle()
    let generator = UIImpactFeedbackGenerator(style: feedbackStyle)
    generator.prepare()
    generator.impactOccurred()
  }
  
  func triggerNotification(type: HapticNotificationType) throws {
    guard haptics.hapticsEnabled else { return }
    
    let feedbackType = type.toUIFeedbackType()
    let generator = UINotificationFeedbackGenerator()
    generator.prepare()
    generator.notificationOccurred(feedbackType)
  }
  
  func triggerSelection() throws {
    guard haptics.hapticsEnabled else { return }
    
    let generator = UISelectionFeedbackGenerator()
    generator.prepare()
    generator.selectionChanged()
  }
}

// MARK: - Type Conversions

extension HapticImpactStyle {
  func toUIFeedbackStyle() -> UIImpactFeedbackGenerator.FeedbackStyle {
    switch self {
    case .rigid:
      return .rigid
    case .heavy:
      return .heavy
    case .medium:
      return .medium
    case .light:
      return .light
    case .soft:
      return .soft
    }
  }
}

extension HapticNotificationType {
  func toUIFeedbackType() -> UINotificationFeedbackGenerator.FeedbackType {
    switch self {
    case .error:
      return .error
    case .success:
      return .success
    case .warning:
      return .warning
    }
  }
}
