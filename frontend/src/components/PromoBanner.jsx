import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Sparkles } from "lucide-react";

// You can change this link to the actual deStream checkout link
const PROMO_LINK = "https://destream.net/t/RedditGoldMine/YOUR_PROMO_LINK_HERE"; 

const PromoBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="w-full bg-neo-black text-white relative flex items-center justify-center py-2 px-4 shadow-neo border-b-4 border-black overflow-hidden z-[60]">
      {/* Animated Shine Effect */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <div className="absolute top-0 bottom-0 left-[-100%] w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] animate-[shine_3s_infinite]" />
      </div>

      <button
        onClick={(e) => {
          e.preventDefault();
          window.dispatchEvent(new Event("open-promo-modal"));
        }}
        className="flex items-center gap-2 md:gap-4 text-xs sm:text-sm md:text-base font-heavy tracking-wide hover:text-neo-main transition-colors text-center w-full justify-center group z-10"
      >
        <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-neo-main animate-pulse" />
        <span className="font-display">
          🔥 <span className="text-neo-main">LIMITED TIME:</span> Get BOTH Courses For Only <span className="underline decoration-wavy decoration-neo-main font-extrabold text-lg">$150</span> <span className="line-through text-gray-400 font-normal ml-1">(Instead of $274)</span>
        </span>
        <span className="hidden sm:inline-block bg-neo-main text-black px-2 py-0.5 ml-2 border-2 border-neo-black text-xs uppercase group-hover:-translate-y-0.5 transition-transform duration-200 shadow-neo-sm">
          Claim Now
        </span>
        <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-neo-main animate-pulse" />
      </button>

      {/* Close button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-2 md:right-4 p-1 hover:bg-white/20 rounded transition-colors z-20"
        aria-label="Close promotion"
      >
        <X className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      {/* Tailwind Animation for Shine */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shine {
          0% { left: -100%; }
          10% { left: 200%; }
          100% { left: 200%; }
        }
      `}} />
    </div>
  );
};

export default PromoBanner;
