//
//  AhapUtils.swift
//  Pods
//
//  Created by Alireza Hadjar on 9/14/25.
//

import SwiftUI
import CoreHaptics

public enum HapticFeedbackManager {
    public static func generateFeedback(style: UIImpactFeedbackGenerator.FeedbackStyle = .light) {
        let impactGenerator = UIImpactFeedbackGenerator(style: style)
        impactGenerator.prepare()
        impactGenerator.impactOccurred()
    }
}

protocol HapticAnimationState {
    var hapticEvents: [CHHapticEvent] { get }
    var hapticCurves: [CHHapticParameterCurve] { get }
}

class HapticFeedback {
    static let shared = HapticFeedback()

    private var engine: CHHapticEngine?
    private var hapticPlayers: [String: CHHapticAdvancedPatternPlayer] = [:]
    private var continuousPlayer: CHHapticAdvancedPatternPlayer?

    public func createAndStartHapticEngine() {
        // Create and configure a haptic engine.
        do {
            engine = try CHHapticEngine()
        } catch let error {
            print("Engine Creation Error: \(error)")
            return
        }

        // Mute audio to reduce latency for collision haptics.
        engine?.playsHapticsOnly = true

        // The stopped handler alerts you of engine stoppage.
        engine?.stoppedHandler = { reason in
            print("Stop Handler: The engine stopped for reason: \(reason.rawValue)")
            switch reason {
            case .audioSessionInterrupt:
                print("Audio session interrupt")
            case .applicationSuspended:
                print("Application suspended")
            case .idleTimeout:
                print("Idle timeout")
            case .systemError:
                print("System error")
            case .notifyWhenFinished:
                print("Playback finished")
            case .gameControllerDisconnect:
                print("Controller disconnected.")
            case .engineDestroyed:
                print("Engine destroyed.")
            @unknown default:
                print("Unknown error")
            }
        }

        // The reset handler provides an opportunity to restart the engine.
        engine?.resetHandler = {
            print("Reset Handler: Restarting the engine.")
            do {
                // Try restarting the engine.
                try self.engine?.start()
            } catch {
                print("Failed to start the engine")
            }
        }

        do {
            try engine?.start()
        } catch {
            print("Failed to start the engine: \(error)")
        }
    }

    public func createHapticPlayers<State: HapticAnimationState>(for states: [State]) {
        for state in states {
            let key = String(describing: state)
            guard hapticPlayers[key] == nil else { return }
            do {
                let pattern = try CHHapticPattern(events: state.hapticEvents, parameterCurves: state.hapticCurves)
                let player = try engine?.makeAdvancedPlayer(with: pattern)
                hapticPlayers[key] = player
            } catch let error {
                print("Haptic Player Creation Error: \(error)")
            }
        }
    }

    public func clearHapticPlayers() {
        hapticPlayers = [:]
    }

    public func startHapticPlayer<State: HapticAnimationState>(for state: State) {
        let key = String(describing: state)
        do {
            try hapticPlayers[key]?.start(atTime: CHHapticTimeImmediate)
        } catch let error {
            print("Error starting the haptic player: \(error)")
        }
    }

    public func stopHapticPlayer<State: HapticAnimationState>(for state: State) {
        let key = String(describing: state)
        do {
            try hapticPlayers[key]?.stop(atTime: CHHapticTimeImmediate)
        } catch let error {
            print("Error stopping the haptic player: \(error)")
        }
    }

    public func stopAllHapticPlayers() {
        for (key, player) in hapticPlayers {
            do {
                try player.stop(atTime: CHHapticTimeImmediate)
            } catch let error {
                print("Error stopping haptic player \(key): \(error)")
            }
        }
    }

    // MARK: - Continuous Player Methods

    public func createContinuousPlayer(initialIntensity: Float, initialSharpness: Float) {
        do {
            // Create an intensity parameter
            let intensity = CHHapticEventParameter(parameterID: .hapticIntensity, value: initialIntensity)
            
            // Create a sharpness parameter
            let sharpness = CHHapticEventParameter(parameterID: .hapticSharpness, value: initialSharpness)
            
            // Create a continuous event with a long duration
            let continuousEvent = CHHapticEvent(
                eventType: .hapticContinuous,
                parameters: [intensity, sharpness],
                relativeTime: 0,
                duration: 100
            )
            
            // Create a pattern from the continuous haptic event
            let pattern = try CHHapticPattern(events: [continuousEvent], parameters: [])
            
            // Create a player from the continuous haptic pattern
            continuousPlayer = try engine?.makeAdvancedPlayer(with: pattern)
        } catch let error {
            print("Continuous Player Creation Error: \(error)")
        }
    }

    public func startContinuousPlayer() {
        do {
            try continuousPlayer?.start(atTime: CHHapticTimeImmediate)
        } catch let error {
            print("Error starting continuous player: \(error)")
        }
    }

    public func updateContinuousPlayer(intensityControl: Float, sharpnessControl: Float) {
        // Create dynamic parameters for the updated intensity & sharpness
        let intensityParameter = CHHapticDynamicParameter(
            parameterID: .hapticIntensityControl,
            value: intensityControl,
            relativeTime: 0
        )
        
        let sharpnessParameter = CHHapticDynamicParameter(
            parameterID: .hapticSharpnessControl,
            value: sharpnessControl,
            relativeTime: 0
        )
        
        // Send dynamic parameters to the haptic player
        do {
            try continuousPlayer?.sendParameters([intensityParameter, sharpnessParameter], atTime: 0)
        } catch let error {
            print("Dynamic Parameter Error: \(error)")
        }
    }

    public func stopContinuousPlayer() {
        do {
            try continuousPlayer?.stop(atTime: CHHapticTimeImmediate)
        } catch let error {
            print("Error stopping continuous player: \(error)")
        }
    }
}

let haptics = HapticFeedback.shared
