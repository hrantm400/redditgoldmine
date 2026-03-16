import { useEffect, useRef, useState } from 'react';

const SnooMascot = ({ className = "" }) => {
  const containerRef = useRef(null);
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculate center of the mascot
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate distance from mouse to center
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Max distance the eyes can move from center (in SVG coordinates)
      const maxEyeMove = 4; // This is a magic number based on the SVG viewBox (0 0 100 100)
      
      // Calculate angle and limit distance for the eyes
      const angle = Math.atan2(deltaY, deltaX);
      const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY) * 0.05, maxEyeMove);
      
      const moveX = Math.cos(angle) * distance;
      const moveY = Math.sin(angle) * distance;

      setEyePos({ x: moveX, y: moveY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className={`relative group ${className}`}>
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full drop-shadow-[8px_8px_0_#000] transition-transform duration-300 group-hover:-translate-y-2 group-hover:drop-shadow-[12px_12px_0_#ff4500]"
      >
        {/* Antenna Drop Shadow / Backdrop */}
        <path d="M 50 25 L 50 10 L 65 10" fill="none" stroke="black" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="65" cy="10" r="5" fill="black" />
        
        {/* Antenna */}
        <path d="M 50 25 L 50 10 L 65 10" fill="none" stroke="#000" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="65" cy="10" r="4" fill="#ff4500" stroke="black" strokeWidth="2" />

        {/* Head/Body Shape */}
        <path d="M 20 60 C 20 30 80 30 80 60 C 80 75 65 85 50 85 C 35 85 20 75 20 60 Z" fill="white" stroke="black" strokeWidth="5" />
        
        {/* Ears */}
        <circle cx="20" cy="50" r="8" fill="white" stroke="black" strokeWidth="4" className="animate-[wiggle_2s_ease-in-out_infinite]" />
        <circle cx="80" cy="50" r="8" fill="white" stroke="black" strokeWidth="4" className="animate-[wiggle_2s_ease-in-out_infinite_reverse]" />
        
        {/* Smile (Slightly smug neo-brutalist style) */}
        <path d="M 40 70 Q 50 78 60 70" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" />
        
        {/* Eye Backgrounds */}
        <circle cx="35" cy="45" r="8" fill="#fbd38d" stroke="black" strokeWidth="2" />
        <circle cx="65" cy="45" r="8" fill="#fbd38d" stroke="black" strokeWidth="2" />

        {/* Moving Pupils */}
        <g style={{ transform: `translate(${eyePos.x}px, ${eyePos.y}px)`, transition: 'transform 0.1s ease-out' }}>
          <circle cx="35" cy="45" r="4" fill="#ff4500" />
          <circle cx="65" cy="45" r="4" fill="#ff4500" />
          {/* Eye sparkles */}
          <circle cx="33" cy="43" r="1.5" fill="white" />
          <circle cx="63" cy="43" r="1.5" fill="white" />
        </g>
      </svg>
    </div>
  );
};

export default SnooMascot;
