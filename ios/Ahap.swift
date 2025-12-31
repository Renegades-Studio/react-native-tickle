import CoreHaptics

struct AnyHapticAnimationState: HapticAnimationState {
    var hapticEvents: [CHHapticEvent]
    var hapticCurves: [CHHapticParameterCurve]

    init(hapticEvents: [CHHapticEvent], hapticCurves: [CHHapticParameterCurve]) {
        self.hapticEvents = hapticEvents
        self.hapticCurves = hapticCurves
    }
}


class Ahap: HybridAhapSpec {
  func stopAllHaptics() throws {
    haptics.stopAllHapticPlayers()
  }

  func initializeEngine() throws {
    haptics.createAndStartHapticEngine()
  }

  func destroyEngine() throws {
    haptics.clearHapticPlayers()
  }

  // MARK: - Continuous Player Methods

  func createContinuousPlayer(initialIntensity: Double, initialSharpness: Double) throws {
    haptics.createContinuousPlayer(initialIntensity: Float(initialIntensity), initialSharpness: Float(initialSharpness))
  }

  func startContinuousPlayer() throws {
    haptics.startContinuousPlayer()
  }

  func updateContinuousPlayer(intensityControl: Double, sharpnessControl: Double) throws {
    haptics.updateContinuousPlayer(intensityControl: Float(intensityControl), sharpnessControl: Float(sharpnessControl))
  }

  func stopContinuousPlayer() throws {
    haptics.stopContinuousPlayer()
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
    relativeTime: event.relativeTime,
    duration: event.type == .continuous ? event.duration ?? 1.0 : 0
    )
}

let hapticCurves = curves.map { curve -> CHHapticParameterCurve in
    let parameterID: CHHapticDynamicParameter.ID = (curve.type == .intensity) ? .hapticIntensityControl : .hapticSharpnessControl
    let controlPoints = curve.controlPoints.map { controlPoint -> CHHapticParameterCurve.ControlPoint in
        return CHHapticParameterCurve.ControlPoint(relativeTime: controlPoint.relativeTime, value: Float(controlPoint.value))
    }
    return CHHapticParameterCurve(
        parameterID: parameterID,
        controlPoints: controlPoints,
        relativeTime: curve.relativeTime
    )
}

let state = AnyHapticAnimationState(hapticEvents: hapticEvents, hapticCurves: hapticCurves)
haptics.createHapticPlayers(for: [state])
haptics.startHapticPlayer(for: state)
  }
}
