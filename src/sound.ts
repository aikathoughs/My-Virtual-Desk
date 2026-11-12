import { useCallback, useEffect, useRef, useState } from "react";

export type SoundEffect =
  | "caseOpen"
  | "discRemove"
  | "driveOpen"
  | "discInsert"
  | "driveClose"
  | "discRead"
  | "videoLoad"
  | "driveEject"
  | "notebookOpen"
  | "pageFlip"
  | "power";

function createNoiseBuffer(ctx: AudioContext, seconds: number) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.08 * white) / 1.08;
    data[i] = last * 2.2;
  }
  return buffer;
}

export function useSoundController() {
  const [enabled, setEnabled] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const activeCleanupRef = useRef<(() => void) | null>(null);

  const stopActive = useCallback(() => {
    if (activeCleanupRef.current) {
      try {
        activeCleanupRef.current();
      } catch {
        // ignore already-stopped audio nodes
      }
      activeCleanupRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) stopActive();
  }, [enabled, stopActive]);

  const play = useCallback(
    (effect: SoundEffect) => {
      if (!enabled) return;
      if (!ctxRef.current) {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => undefined);
      }

      stopActive();
      const now = ctx.currentTime;
      const disposers: Array<() => void> = [];

      const playNoise = (
        duration: number,
        filterType: BiquadFilterType,
        startFreq: number,
        endFreq: number,
        peakGain: number,
        delay = 0,
        q = 1.8,
      ) => {
        const src = ctx.createBufferSource();
        src.buffer = createNoiseBuffer(ctx, duration);
        const filter = ctx.createBiquadFilter();
        filter.type = filterType;
        filter.Q.value = q;
        filter.frequency.setValueAtTime(startFreq, now + delay);
        filter.frequency.exponentialRampToValueAtTime(
          Math.max(40, endFreq),
          now + delay + duration,
        );
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.linearRampToValueAtTime(peakGain, now + delay + Math.min(0.04, duration * 0.25));
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
        src.connect(filter).connect(gain).connect(ctx.destination);
        src.start(now + delay);
        src.stop(now + delay + duration + 0.02);
        disposers.push(() => src.stop());
      };

      const playTone = (
        type: OscillatorType,
        startFreq: number,
        endFreq: number,
        duration: number,
        peakGain: number,
        delay = 0,
      ) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, now + delay);
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + delay + duration);
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.linearRampToValueAtTime(peakGain, now + delay + Math.min(0.02, duration * 0.2));
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + duration + 0.02);
        disposers.push(() => osc.stop());
      };

      switch (effect) {
        case "caseOpen":
          // Plastic latch click + light hinge flex
          playNoise(0.045, "bandpass", 1800, 950, 0.04, 0, 3.2);
          playTone("triangle", 620, 240, 0.035, 0.018, 0.01);
          break;
        case "discRemove":
          // Light plastic hub release + handling brush
          playTone("sine", 420, 190, 0.045, 0.016, 0);
          playNoise(0.16, "bandpass", 1100, 1600, 0.022, 0.02, 1.5);
          break;
        case "driveOpen":
          // Mechanical tray DC motor whirr + slide rails
          playTone("sawtooth", 135, 168, 0.42, 0.012, 0);
          playNoise(0.45, "bandpass", 420, 680, 0.025, 0, 2.2);
          playTone("triangle", 520, 310, 0.03, 0.015, 0.42);
          break;
        case "discInsert":
          // Subtle polycarbonate disc seating on tray spindle
          playNoise(0.06, "lowpass", 900, 320, 0.03, 0, 1.2);
          playTone("triangle", 310, 145, 0.06, 0.02, 0.015);
          break;
        case "driveClose":
          // Mechanical tray motor retract + locking click
          playTone("sawtooth", 162, 122, 0.4, 0.012, 0);
          playNoise(0.4, "bandpass", 620, 380, 0.024, 0, 2.0);
          playNoise(0.035, "bandpass", 1900, 1200, 0.038, 0.39, 3.5);
          break;
        case "discRead":
          // Quiet spinning optical drive seek + spin-up
          playNoise(0.65, "bandpass", 520, 980, 0.022, 0, 2.6);
          playTone("sine", 190, 340, 0.6, 0.01, 0.04);
          break;
        case "videoLoad":
          // Subtle vintage computer bus/disk processing chatter
          for (let i = 0; i < 4; i++) {
            playNoise(0.03, "bandpass", 1400 + i * 180, 900, 0.018, i * 0.09, 4.0);
          }
          break;
        case "driveEject":
          // Mechanical tray motor followed by soft latch click
          playNoise(0.03, "bandpass", 1600, 900, 0.03, 0, 3.0);
          playTone("sawtooth", 148, 175, 0.42, 0.012, 0.03);
          playNoise(0.42, "bandpass", 480, 740, 0.024, 0.03, 2.1);
          playTone("triangle", 640, 380, 0.035, 0.016, 0.45);
          break;
        case "notebookOpen":
          // Subtle heavy cover and paper movement
          playNoise(0.38, "bandpass", 680, 1150, 0.03, 0, 1.1);
          playNoise(0.18, "lowpass", 420, 220, 0.02, 0.14, 0.9);
          break;
        case "pageFlip":
          // Realistic paper turn swish
          playNoise(0.32, "bandpass", 950, 1650, 0.028, 0, 1.3);
          playNoise(0.12, "bandpass", 1400, 780, 0.016, 0.2, 1.6);
          break;
        case "power":
          playTone("triangle", 110, 68, 0.12, 0.025, 0);
          playNoise(0.04, "bandpass", 1200, 600, 0.03, 0, 2.5);
          break;
      }

      activeCleanupRef.current = () => {
        disposers.forEach((fn) => {
          try {
            fn();
          } catch {
            // ignore
          }
        });
      };
    },
    [enabled, stopActive],
  );

  const toggle = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume().catch(() => undefined);
    }
    setEnabled((prev) => !prev);
  }, []);

  return { enabled, toggle, play, stopActive };
}
