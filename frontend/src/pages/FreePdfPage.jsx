import React, { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import NeoPage from "../components/NeoPage";
import NeoFooter from "../components/NeoFooter";
import SiteHeader from "../components/SiteHeader";

const FreePdfPage = () => {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    const ctx = gsap.context(() => {
      gsap.utils.toArray(".g-fade-in").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
            },
          },
        );
      });
    });
    
    return () => ctx.revert();
  }, []);

  return (
    <NeoPage>
      <SiteHeader />
      <main className="pt-24 pb-24 min-h-[80vh] flex items-center">
        <div className="w-full">
            {/* FREE PDF LEAD MAGNET SECTION */}
            <section className="bg-neo-main py-16 sm:py-24 border-y-4 border-neo-black relative overflow-hidden">
                {/* Visual Flair / Background elements */}
                <div className="absolute top-10 left-10 w-32 h-32 border-8 border-black rounded-full opacity-20 hidden md:block" />
                <div className="absolute bottom-10 right-10 w-24 h-24 bg-white border-4 border-black rotate-12 opacity-80 hidden md:block" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-white opacity-5 rotate-3 pointer-events-none skew-y-3" />

                <div className="container mx-auto px-4 sm:px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center bg-white border-4 border-neo-black shadow-[16px_16px_0_0_#111] p-8 sm:p-12 g-fade-in relative z-10">
                        {/* Image Side */}
                        <div className="flex justify-center flex-col items-center">
                            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-black mb-2 text-center -rotate-2 transform">
                                The Redhack <span className="text-neo-main text-outline underline decoration-wavy decoration-neo-main leading-relaxed">Method</span>
                            </h3>
                            <div className="relative mt-6 group">
                                <div className="absolute inset-0 bg-neo-accent translate-x-4 translate-y-4 border-4 border-black transition-transform group-hover:translate-x-6 group-hover:translate-y-6"></div>
                                <div className="relative z-10 w-full max-w-sm h-auto bg-white border-4 border-black group-hover:-translate-y-2 group-hover:-translate-x-2 transition-transform duration-300">
                                  <svg viewBox="0 0 400 500" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                      <pattern id="dot-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                                        <circle cx="2" cy="2" r="2" fill="#d1d5db" />
                                      </pattern>
                                      
                                      <linearGradient id="snoo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#ff5714" />
                                        <stop offset="100%" stopColor="#cc3700" />
                                      </linearGradient>
                                    </defs>

                                    {/* Base Background */}
                                    <rect width="400" height="500" fill="#fdfbf7" />
                                    <rect width="400" height="500" fill="url(#dot-pattern)" />

                                    {/* Orange brutalist accent shape */}
                                    <path d="M 0 0 L 400 0 L 400 150 L 0 250 Z" fill="#ff4500" stroke="black" strokeWidth="4" />

                                    {/* Text placeholders to look like a book */}
                                    <rect x="30" y="30" width="80" height="15" fill="black" />
                                    <rect x="30" y="55" width="120" height="15" fill="black" />
                                    
                                    {/* Decorative brutalist star */}
                                    <path d="M 330 40 L 340 70 L 370 80 L 340 90 L 330 120 L 320 90 L 290 80 L 320 70 Z" fill="#FFD700" stroke="black" strokeWidth="4" className="animate-[spin_10s_linear_infinite]" style={{ transformOrigin: '330px 80px' }} />

                                    {/* Main Box containing Snoo */}
                                    <g transform="translate(60, 160)">
                                      <rect x="0" y="0" width="280" height="280" fill="#fbd38d" stroke="black" strokeWidth="6" className="shadow-none relative" />
                                      <rect x="10" y="10" width="280" height="280" fill="none" stroke="black" strokeWidth="4" strokeDasharray="10 5" />
                                      
                                      {/* Growing Arrow behind Snoo */}
                                      <path d="M 40 240 L 140 40 L 230 120 L 280 20" fill="none" stroke="#ff4500" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" className="animate-[pulse_2s_ease-in-out_infinite]" />
                                      <path d="M 230 20 L 280 20 L 280 70" fill="none" stroke="#ff4500" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />

                                      {/* Stylized Reddit Snoo head */}
                                      <g transform="translate(140, 150)" className="animate-[bounce_3s_ease-in-out_infinite]">
                                        {/* Antenna */}
                                        <path d="M 0 -70 C 20 -100, 60 -100, 60 -70" fill="none" stroke="black" strokeWidth="6" strokeLinecap="round" />
                                        <circle cx="60" cy="-70" r="12" fill="white" stroke="black" strokeWidth="4" />
                                        
                                        {/* Head */}
                                        <ellipse cx="0" cy="0" rx="75" ry="55" fill="url(#snoo-gradient)" stroke="black" strokeWidth="6" />
                                        
                                        {/* Ears */}
                                        <circle cx="-75" cy="0" r="18" fill="url(#snoo-gradient)" stroke="black" strokeWidth="5" />
                                        <circle cx="75" cy="0" r="18" fill="url(#snoo-gradient)" stroke="black" strokeWidth="5" />
                                        
                                        {/* Eyes */}
                                        <circle cx="-30" cy="-10" r="12" fill="white" stroke="black" strokeWidth="4" />
                                        <circle cx="30" cy="-10" r="12" fill="white" stroke="black" strokeWidth="4" />
                                        
                                        {/* Smile */}
                                        <path d="M -25 20 Q 0 40 25 20" fill="none" stroke="black" strokeWidth="6" strokeLinecap="round" />
                                      </g>

                                      {/* Pop ups */}
                                      <g transform="translate(180, 200)" className="animate-[bounce_4s_ease-in-out_infinite] delay-100">
                                        <rect x="0" y="0" width="80" height="40" rx="20" fill="white" stroke="black" strokeWidth="4" />
                                        <text x="40" y="26" fontSize="20" fontWeight="900" textAnchor="middle" fill="#ff4500">+1K</text>
                                      </g>
                                    </g>
                                    
                                    {/* Bottom Banner */}
                                    <rect x="-10" y="450" width="420" height="50" fill="black" transform="rotate(-2 200 475)" />
                                    <text x="200" y="482" fontSize="24" fontWeight="900" fill="white" textAnchor="middle" letterSpacing="2" className="uppercase" transform="rotate(-2 200 475)">Reddit Domination</text>
                                  </svg>
                                </div>
                                {/* Burst badge */}
                                <div className="absolute -top-6 -right-6 z-20 w-24 h-24 bg-neo-main border-4 border-black rounded-full flex items-center justify-center rotate-12 animate-[bounce_3s_infinite]">
                                  <span className="text-2xl font-heavy text-black text-center leading-none">100%<br/>FREE</span>
                                </div>
                            </div>
                        </div>

                        {/* Text / CTA Side */}
                        <div className="text-center lg:text-left flex flex-col justify-center">
                            <div className="inline-block bg-black text-white px-4 py-1 text-sm font-bold uppercase tracking-widest mb-6 transform -skew-x-6 shadow-neo-sm transform-left origin-left border-2 border-black max-w-fit mx-auto lg:mx-0">
                                Grab Your Free Guide
                            </div>
                            
                            <h2 className="text-4xl sm:text-5xl font-display font-black text-black mb-6 leading-tight">
                                Steal our exact blueprint for <span className="bg-neo-accent px-2 mx-1 border-2 border-black rotate-1 inline-block text-black">VIRAL</span> Reddit growth.
                            </h2>
                            
                            <p className="text-lg text-gray-800 mb-8 font-medium">
                                We packed our best beginner strategies into one easy-to-read PDF. Learn how to optimize your profile, avoid shadowbans, and get your first <strong>$1,000+</strong> organic traffic surge.
                            </p>
                            
                            {/* Insert Kit Link Here */}
                            <a 
                              href="https://drive.google.com/file/d/1ZwsJ69wPzDKFqCYbYpcuSaU9yh_LgJhl/view?usp=sharing" 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-neo bg-black text-white hover:bg-neo-main hover:text-black border-4 border-black text-xl sm:text-2xl py-4 sm:py-5 px-8 text-center transition-all shadow-[6px_6px_0_0_#fbd38d] hover:shadow-[2px_2px_0_0_#fbd38d] hover:translate-x-1 hover:translate-y-1 block w-full max-w-md mx-auto lg:mx-0 group"
                            >
                                <span className="flex items-center justify-center gap-3">
                                  DOWNLOAD PDF <span className="group-hover:translate-x-2 transition-transform">→</span>
                                </span>
                            </a>
                            <p className="text-sm text-gray-500 mt-4 text-center lg:text-left font-semibold">Join 5,000+ marketers already growing on Reddit.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
      </main>
      <NeoFooter />
    </NeoPage>
  );
};

export default FreePdfPage;
