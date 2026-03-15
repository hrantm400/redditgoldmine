import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR = "a, button, .btn-neo, .btn-neo-main, .btn-neo-black, .card-neo, input, select, textarea, .lesson-item, .faq-question";

const useInteractionSound = () => {
  const audioCtxRef = useRef(null);
  const hasUserGestureRef = useRef(false);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const ensureContext = async () => {
      if (!audioCtxRef.current) {
        try {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
          console.warn("AudioContext not supported:", e);
          return null;
        }
      }

      const ctx = audioCtxRef.current;
      
      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch (e) {
          console.warn("Failed to resume AudioContext:", e);
        }
      }

      return ctx;
    };

    const playRichTone = async (type = "click") => {
      const ctx = await ensureContext();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        
        // Create multiple oscillators for richer sound
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator();
        
        // Create gain nodes for volume control
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();
        const gain3 = ctx.createGain();
        const masterGain = ctx.createGain();
        
        // Create filter for richer tone
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.Q.value = 1;
        
        if (type === "click") {
          // Click sound - punchy and percussive (volume slightly reduced)
          osc1.type = "sawtooth";
          osc1.frequency.setValueAtTime(220, now);
          osc1.frequency.exponentialRampToValueAtTime(110, now + 0.1);
          
          osc2.type = "square";
          osc2.frequency.setValueAtTime(330, now);
          osc2.frequency.exponentialRampToValueAtTime(165, now + 0.1);
          
          osc3.type = "triangle";
          osc3.frequency.setValueAtTime(440, now);
          osc3.frequency.exponentialRampToValueAtTime(220, now + 0.1);
          
          filter.frequency.setValueAtTime(2000, now);
          filter.frequency.exponentialRampToValueAtTime(800, now + 0.15);
          
          gain1.gain.setValueAtTime(0, now);
          gain1.gain.linearRampToValueAtTime(0.08, now + 0.005);
          gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
          
          gain2.gain.setValueAtTime(0, now);
          gain2.gain.linearRampToValueAtTime(0.05, now + 0.005);
          gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
          
          gain3.gain.setValueAtTime(0, now);
          gain3.gain.linearRampToValueAtTime(0.035, now + 0.005);
          gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
          
          masterGain.gain.setValueAtTime(0, now);
          masterGain.gain.linearRampToValueAtTime(0.15, now + 0.01);
          masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
          
          osc1.connect(gain1);
          osc2.connect(gain2);
          osc3.connect(gain3);
          
          gain1.connect(filter);
          gain2.connect(filter);
          gain3.connect(filter);
          
          filter.connect(masterGain);
          masterGain.connect(ctx.destination);
          
          osc1.start(now);
          osc2.start(now);
          osc3.start(now);
          
          osc1.stop(now + 0.2);
          osc2.stop(now + 0.15);
          osc3.stop(now + 0.12);
        } else {
          // Hover sound отключен – на наведение курсора звук не воспроизводим
          return;
        }
      } catch (error) {
        // Silently ignore audio errors
        console.warn("Audio playback error:", error);
      }
    };

    // Hover handler отключен, чтобы звук был только на кликах

    const handlePointerDown = async (event) => {
      hasUserGestureRef.current = true;
      const target = event.target;
      
      // Initialize context on first click
      if (!isInitializedRef.current) {
        await ensureContext();
        isInitializedRef.current = true;
      }
      
      if (target instanceof Element && target.closest(INTERACTIVE_SELECTOR)) {
        playRichTone("click");
      }
    };

    // Initialize on any user interaction
    const handleUserInteraction = async () => {
      hasUserGestureRef.current = true;
      if (!isInitializedRef.current) {
        await ensureContext();
        isInitializedRef.current = true;
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("click", handleUserInteraction, { once: true });
    document.addEventListener("keydown", handleUserInteraction, { once: true });
    document.addEventListener("touchstart", handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
      
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);
};

export default useInteractionSound;
