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
}

let haptics = HapticFeedback.shared
