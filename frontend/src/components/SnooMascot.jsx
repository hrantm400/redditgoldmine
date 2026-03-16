import { useEffect, useRef } from 'react';

const SnooMascot = ({ className = "" }) => {
  const layerFaceRef = useRef(null);
  const layerHeadRef = useRef(null);
  const layerEarsRef = useRef(null);
  const layerAntennaRef = useRef(null);
  const groundShadowRef = useRef(null);
  const snooModelRef = useRef(null);
  const eyeLeftRef = useRef(null);
  const eyeRightRef = useRef(null);

  // Linear interpolation function
  const lerp = (start, end, factor) => start + (end - start) * factor;

  useEffect(() => {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let animationFrameId;

    const handleMouseMove = (e) => {
      // Normalize coordinates between -1 and 1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      targetX = x;
      targetY = y;
    };

    const handleMouseLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      currentX = lerp(currentX, targetX, 0.08);
      currentY = lerp(currentY, targetY, 0.08);

      if (layerFaceRef.current) {
        layerFaceRef.current.setAttribute('transform', `translate(${currentX * 35}, ${currentY * 25})`);
      }
      if (layerHeadRef.current) {
        layerHeadRef.current.setAttribute('transform', `translate(${currentX * 12}, ${currentY * 8})`);
      }
      if (layerEarsRef.current) {
        layerEarsRef.current.setAttribute('transform', `translate(${currentX * -10}, ${currentY * -5})`);
      }
      if (layerAntennaRef.current) {
        layerAntennaRef.current.setAttribute('transform', `translate(${currentX * 15}, ${currentY * 10}) rotate(${currentX * 15}, 250, 160)`);
      }
      if (groundShadowRef.current) {
        groundShadowRef.current.setAttribute('transform', `translate(${currentX * -15}, 0) scale(${1 - Math.abs(currentY) * 0.1})`);
      }
      if (snooModelRef.current) {
        snooModelRef.current.style.transform = `rotateX(${currentY * -15}deg) rotateY(${currentX * 15}deg)`;
        snooModelRef.current.style.transformOrigin = "250px 270px";
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    let blinkTimeout;
    
    const triggerBlink = () => {
      if (eyeLeftRef.current && eyeRightRef.current) {
        eyeLeftRef.current.classList.add('blinking-eye');
        eyeRightRef.current.classList.add('blinking-eye');
        
        setTimeout(() => {
          if (eyeLeftRef.current && eyeRightRef.current) {
            eyeLeftRef.current.classList.remove('blinking-eye');
            eyeRightRef.current.classList.remove('blinking-eye');
          }
        }, 200);
      }
      const nextBlinkTime = Math.random() * 4000 + 2000;
      blinkTimeout = setTimeout(triggerBlink, nextBlinkTime);
    };

    let initialBlink = setTimeout(triggerBlink, 2000);

    return () => {
      clearTimeout(initialBlink);
      clearTimeout(blinkTimeout);
    };
  }, []);

  return (
    <div className={`w-full max-w-[600px] mx-auto perspective-[1000px] ${className}`} style={{ perspective: '1000px' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .snoo-svg {
            width: 100%;
            height: auto;
            overflow: visible;
            filter: drop-shadow(0 20px 30px rgba(0,0,0,0.5));
            transition: transform 0.2s ease-out;
        }

        .blinking-eye {
            animation: snoo-blink 0.2s ease-in-out;
        }

        @keyframes snoo-blink {
            0% { transform: scaleY(1); }
            50% { transform: scaleY(0.05); }
            100% { transform: scaleY(1); }
        }

        #eye-left { transform-origin: 190px 270px; }
        #eye-right { transform-origin: 310px 270px; }
        
        #antenna-ball {
            animation: snoo-float 4s ease-in-out infinite;
        }

        @keyframes snoo-float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
        }
      `}} />

      <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" className="snoo-svg">
          <defs>
              <radialGradient id="head-grad" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="70%" stopColor="#f0f4f8" />
                  <stop offset="100%" stopColor="#d1d5db" />
              </radialGradient>

              <radialGradient id="eye-grad" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ff7b47" />
                  <stop offset="100%" stopColor="#FF4500" />
              </radialGradient>

              <radialGradient id="shadow-grad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(0,0,0,0.6)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
          </defs>

          {/* Ground shadow */}
          <ellipse id="ground-shadow" ref={groundShadowRef} cx="250" cy="450" rx="180" ry="20" fill="url(#shadow-grad)" />

          <g id="snoo-model" ref={snooModelRef}>
              {/* Antenna */}
              <g id="layer-antenna" ref={layerAntennaRef}>
                  <path d="M 250 160 C 250 100, 270 70, 320 70" fill="none" stroke="#000" strokeWidth="12" strokeLinecap="round" />
                  <circle id="antenna-ball" cx="320" cy="70" r="22" fill="url(#head-grad)" stroke="#000" strokeWidth="10" />
              </g>

              {/* Ears */}
              <g id="layer-ears" ref={layerEarsRef}>
                  <ellipse cx="90" cy="270" rx="35" ry="35" fill="url(#head-grad)" stroke="#000" strokeWidth="10" />
                  <ellipse cx="410" cy="270" rx="35" ry="35" fill="url(#head-grad)" stroke="#000" strokeWidth="10" />
              </g>

              {/* Head Base */}
              <g id="layer-head" ref={layerHeadRef}>
                  <ellipse cx="250" cy="270" rx="150" ry="110" fill="url(#head-grad)" stroke="#000" strokeWidth="12" />
              </g>

              {/* Face/Eyes */}
              <g id="layer-face" ref={layerFaceRef}>
                  <ellipse id="eye-left" ref={eyeLeftRef} className="eye" cx="190" cy="260" rx="26" ry="36" fill="url(#eye-grad)" stroke="#000" strokeWidth="5" />
                  <ellipse id="eye-right" ref={eyeRightRef} className="eye" cx="310" cy="260" rx="26" ry="36" fill="url(#eye-grad)" stroke="#000" strokeWidth="5" />
                  <path id="mouth" d="M 200 320 Q 250 355 300 320" fill="none" stroke="#000" strokeWidth="10" strokeLinecap="round" />
              </g>
          </g>
      </svg>
    </div>
  );
};

export default SnooMascot;
