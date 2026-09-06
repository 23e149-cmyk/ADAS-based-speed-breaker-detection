import { useCallback, useRef } from "react";

/**
 * useAudioWarning
 * ================
 * Plays a short, attention-getting beep using the Web Audio API
 * (an oscillator node) rather than shipping/loading an external audio
 * file - this keeps the prototype dependency-free and works in any
 * modern browser.
 *
 * The cooldown that prevents this from firing every frame lives on the
 * BACKEND (services/warning_service.py) - this hook simply plays a beep
 * each time it's told to via `play()`, which the app only calls when the
 * server sends `trigger_warning: true`.
 */
export function useAudioWarning() {
  const audioCtxRef = useRef(null);

  const play = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Two quick beeps, evocative of automotive collision-warning chimes.
      [0, 0.18].forEach((delay) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "square";
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.15);

        oscillator.connect(gain);
        gain.connect(ctx.destination);

        oscillator.start(ctx.currentTime + delay);
        oscillator.stop(ctx.currentTime + delay + 0.16);
      });
    } catch {
      // Audio is a nice-to-have; never let it crash the app (e.g. if the
      // browser blocks AudioContext before any user gesture has occurred).
    }
  }, []);

  return { play };
}
