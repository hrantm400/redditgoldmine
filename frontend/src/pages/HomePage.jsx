import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";
import { CheckCircle, Clock, Lightbulb } from "lucide-react";
import NeoPage from "../components/NeoPage";
import NeoFooter from "../components/NeoFooter";
import SiteHeader from "../components/SiteHeader";
import { useAuth } from "../context/AuthContext";

const HomePage = () => {
  const homeRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    let lenis;
    let ctx;

    ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.to(".loader-text", { opacity: 1, duration: 0.5 })
        .to(".loader-text", { opacity: 0, duration: 0.5, delay: 1 })
        .to("#preloader", { y: "-100%", duration: 1, ease: "power3.inOut" })
        .to(
          ".hero-text-line > span",
          { y: 0, stagger: 0.15, duration: 1.2, ease: "power3.out" },
          "-=0.5",
        )
        .fromTo(
          ".g-fade-in",
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power2.out" },
          "-=0.8",
        );

      gsap.utils.toArray(".parallax-el").forEach((el) => {
        const speed = Number(el.getAttribute("data-speed") || 1);
        gsap.to(el, {
          y: () => -ScrollTrigger.maxScroll(window) * speed * 0.1,
          scrollTrigger: {
            trigger: document.body,
            start: "top top",
            end: "bottom top",
            scrub: 1.5,
          },
        });
      });

      const heroSection = document.querySelector("main > div > section");
      gsap.utils.toArray(".g-fade-in").forEach((el) => {
        if (el.closest("section") === heroSection) return;
        gsap.fromTo(
          el,
          { opacity: 0, y: 50, rotate: 3 },
          {
            opacity: 1,
            y: 0,
            rotate: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
            },
          },
        );
      });
    }, homeRef);

    lenis = new Lenis();
    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    return () => {
      ctx?.revert();
      lenis?.destroy();
    };
  }, []);

  return (
    <NeoPage>
      <div ref={homeRef}>
        <div id="preloader">
          <div className="loader-text">RedditGoldmine...</div>
        </div>

        <SiteHeader />

        <main id="smooth-wrapper">
          <div id="smooth-content">
            <section className="relative pt-24 pb-24 md:pt-32 md:pb-32 text-center overflow-hidden">
              <video
                className="absolute inset-0 w-full h-full object-cover opacity-60"
                src="/media/hero.mp4"
                autoPlay
                muted
                loop
                playsInline
              />
              <div className="absolute inset-0 bg-gradient-to-b from-neo-bg/85 to-neo-bg"></div>

              <div className="relative container mx-auto px-6">
                <div data-speed="0.8" className="parallax-el absolute top-1/4 left-10 w-24 h-24 bg-neo-main border-4 border-neo-black shadow-neo opacity-80 hidden md:block" />
                <div data-speed="1.2" className="parallax-el absolute bottom-1/4 right-10 w-32 h-32 bg-neo-accent border-4 border-neo-black shadow-neo rotate-12 hidden md:block" />

                {/* Decorative floating star SVG */}
                <div className="absolute top-20 right-[10%] hidden lg:block w-32 h-32 animate-[bounce_4s_infinite] pointer-events-none">
                  <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_15s_linear_infinite]">
                    <path d="M 50 0 L 60 40 L 100 50 L 60 60 L 50 100 L 40 60 L 0 50 L 40 40 Z" fill="#ff4500" stroke="black" strokeWidth="6" className="drop-shadow-[8px_8px_0_#000]" />
                    <circle cx="50" cy="50" r="15" fill="#FFD700" stroke="black" strokeWidth="4" />
                    <circle cx="50" cy="50" r="5" fill="black" />
                  </svg>
                </div>

                {/* Decorative floating cursor SVG */}
                <div className="absolute bottom-32 left-[15%] hidden md:block w-24 h-24 animate-[bounce_5s_infinite] delay-500 pointer-events-none skew-y-6">
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[10px_10px_0_#ff4500]">
                    <path d="M 20 20 L 80 50 L 55 60 L 70 90 L 55 95 L 40 65 L 20 80 Z" fill="white" stroke="black" strokeWidth="8" strokeLinejoin="miter" />
                  </svg>
                </div>

                <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-display font-extrabold text-neo-black mb-4 leading-none break-words px-2">
                  <span className="hero-text-line block">
                    <span>Crack the</span>
                  </span>
                  <span className="hero-text-line block">
                    <span className="text-outline text-neo-main">Reddit Code</span>
                  </span>
                </h1>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-neo-black mb-8 g-fade-in px-4">
                  Grow Karma & Drive Traffic Fast
                </h2>
                <p className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-gray-700 mb-10 g-fade-in px-4">
                  Learn the secrets to Reddit success with proven strategies for gaining karma, creating viral posts, and dominating niche communities. Transform your Reddit presence and take advantage of one of the most powerful platforms for personal and business growth.
                </p>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="btn-neo-main text-lg sm:text-xl px-8 sm:px-10 py-3 sm:py-4 g-fade-in"
                >
                  View The Courses
                </button>
              </div>
            </section>

            <div className="w-full bg-neo-main border-y-4 border-black py-4 sm:py-6 overflow-hidden flex items-center transform -skew-y-2 origin-left z-10 relative">
              <div className="marquee-container font-heavy text-3xl sm:text-4xl md:text-6xl text-black uppercase tracking-widest">
                <div className="marquee-content whitespace-nowrap">
                  /// PROVEN RESULTS /// EXPERT STRATEGIES /// TIME-SAVING /// 5,000+ KARMA /// REDDIT DOMINATION /// MONETIZE LIKE A PRO ///
                  /// PROVEN RESULTS /// EXPERT STRATEGIES /// TIME-SAVING /// 5,000+ KARMA /// REDDIT DOMINATION /// MONETIZE LIKE A PRO ///
                </div>
              </div>
            </div>

            <section className="bg-neo-bg py-16 sm:py-24">
              <div className="container mx-auto px-4 sm:px-6">
                <h3 className="text-4xl sm:text-5xl md:text-7xl font-display font-extrabold text-center text-neo-black mb-12 sm:mb-16 leading-tight">
                  Why <span className="text-outline">Reddit Goldmine?</span>
                </h3>
                <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
                  <article className="card-neo g-fade-in p-6 sm:p-8">
                    <div className="mb-6 w-20 h-20 relative group mx-auto sm:mx-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[6px_6px_0_#000]">
                        <rect x="10" y="10" width="80" height="80" rx="40" fill="#fbd38d" stroke="black" strokeWidth="8" className="group-hover:scale-95 transition-transform origin-center" />
                        <circle cx="50" cy="50" r="25" fill="white" stroke="black" strokeWidth="8" />
                        <circle cx="50" cy="50" r="10" fill="#ff4500" stroke="black" strokeWidth="6" className="animate-[pulse_2s_infinite]" />
                        <path d="M 25 50 L 45 70 L 85 20" fill="none" stroke="black" strokeWidth="10" strokeLinecap="square" strokeLinejoin="miter" className="drop-shadow-[4px_4px_0_#ff4500] group-hover:drop-shadow-[8px_8px_0_#ff4500] transition-all group-hover:-translate-y-2 group-hover:translate-x-1" />
                      </svg>
                    </div>
                    <h4 className="text-2xl sm:text-3xl font-display font-bold text-neo-black mb-3">Proven Results</h4>
                    <p className="text-base sm:text-lg text-gray-700">
                      Thousands of users have achieved massive success, gaining 5,000+ karma in just 72 hours. Our methods are tried, tested, and optimized for real results.
                    </p>
                  </article>
                  <article className="card-neo g-fade-in p-6 sm:p-8">
                    <div className="mb-6 w-20 h-20 relative group mx-auto sm:mx-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[6px_6px_0_#ff4500]">
                        <path d="M 50 15 C 20 15 20 60 40 70 L 40 85 L 60 85 L 60 70 C 80 60 80 15 50 15 Z" fill="#FFD700" stroke="black" strokeWidth="8" className="group-hover:-translate-y-2 group-hover:drop-shadow-[0_15px_15px_rgba(255,215,0,0.5)] transition-all ease-out duration-300" />
                        <line x1="38" y1="85" x2="62" y2="85" stroke="black" strokeWidth="6" />
                        <line x1="42" y1="94" x2="58" y2="94" stroke="black" strokeWidth="6" />
                        <path d="M 50 35 L 50 55 M 40 45 L 60 45" stroke="white" strokeWidth="6" strokeLinecap="round" className="animate-[spin_4s_linear_infinite] origin-[50px_45px]" />
                        <g stroke="black" strokeWidth="6" strokeLinecap="round" className="animate-[pulse_1.5s_infinite]">
                          <line x1="20" y1="15" x2="10" y2="5" />
                          <line x1="50" y1="5" x2="50" y2="-5" />
                          <line x1="80" y1="15" x2="90" y2="5" />
                        </g>
                      </svg>
                    </div>
                    <h4 className="text-2xl sm:text-3xl font-display font-bold text-neo-black mb-3">Expert Strategies</h4>
                    <p className="text-base sm:text-lg text-gray-700">
                      Created by Reddit growth experts, our courses provide insider info & actionable steps to dominate Reddit’s unique algorithm & drive traffic effectively.
                    </p>
                  </article>
                  <article className="card-neo g-fade-in p-6 sm:p-8">
                    <div className="mb-6 w-20 h-20 relative group mx-auto sm:mx-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[6px_6px_0_#000]">
                        <rect x="15" y="15" width="70" height="70" rx="15" fill="#fdfbf7" stroke="black" strokeWidth="8" className="group-hover:rotate-12 transition-transform ease-out duration-300 origin-center" />
                        <circle cx="50" cy="50" r="22" fill="none" stroke="black" strokeWidth="6" strokeDasharray="15 8" className="animate-[spin_10s_linear_infinite] origin-[50px_50px]" />
                        <line x1="50" y1="50" x2="50" y2="30" stroke="#ff4500" strokeWidth="6" strokeLinecap="round" className="animate-[spin_2s_linear_infinite] origin-[50px_50px]" />
                        <line x1="50" y1="50" x2="65" y2="50" stroke="black" strokeWidth="8" strokeLinecap="round" className="animate-[spin_12s_linear_infinite] origin-[50px_50px]" />
                        <circle cx="50" cy="50" r="6" fill="#fbd38d" stroke="black" strokeWidth="4" />
                      </svg>
                    </div>
                    <h4 className="text-2xl sm:text-3xl font-display font-bold text-neo-black mb-3">Time-Saving</h4>
                    <p className="text-base sm:text-lg text-gray-700">
                      Say goodbye to trial and error. Learn the fastest and easiest ways to grow karma and build a strong Reddit presence without wasting months.
                    </p>
                  </article>
                </div>
              </div>
            </section>


            <section className="py-16 sm:py-24 bg-neo-accent border-y-4 border-neo-black">
              <div className="container mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
                <div className="g-fade-in bg-white text-neo-black p-8 sm:p-10 border-4 border-neo-black shadow-neo text-center relative overflow-hidden group">
                  <div className="absolute -top-5 -right-5 w-24 h-24 opacity-40 animate-[spin_8s_linear_infinite] pointer-events-none">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <path d="M 50 0 L 60 40 L 100 50 L 60 60 L 50 100 L 40 60 L 0 50 L 40 40 Z" fill="#ff4500" stroke="black" strokeWidth="4" />
                    </svg>
                  </div>
                  <div className="relative z-10 transition-transform group-hover:scale-110 duration-300">
                    <div className="text-5xl sm:text-6xl md:text-8xl font-heavy">3,000+</div>
                    <div className="text-2xl sm:text-3xl md:text-4xl font-heavy mt-2">KARMA</div>
                    <div className="text-lg sm:text-xl font-bold mt-2">IN 3 DAYS</div>
                  </div>
                </div>
                <div className="g-fade-in text-center md:text-left">
                  <h3 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold text-neo-black mb-6 leading-tight">
                    Reddit <span className="text-outline">Domination</span>
                  </h3>
                  <p className="text-neo-black text-base sm:text-lg mb-8">
                    Discover how top Redditors grow effortlessly! Learn insider strategies, smart subreddit picks, and The Redhack Method to gain 3,000+ karma in just 3 days.
                  </p>
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="btn-neo-black w-full sm:w-auto"
                  >
                    CHECK OUT THE COURSE
                  </button>
                </div>
              </div>
            </section>

            <section id="course" className="bg-neo-bg py-16 sm:py-24">
              <div className="container mx-auto px-4 sm:px-6">
                <div className="grid md:grid-cols-5 gap-8 sm:gap-12">
                  <div className="md:col-span-3 g-fade-in text-center md:text-left">
                    <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display font-extrabold text-neo-black mb-6 leading-tight break-words">
                      Reddit <span className="text-outline text-neo-main block sm:inline">Domination</span>
                    </h2>
                    <p className="text-lg sm:text-xl font-bold text-neo-main mb-4">
                      The Reddit Cash Blueprint is your ultimate guide to turning Reddit into a money-making powerhouse.
                    </p>
                    <p className="text-gray-700 text-base sm:text-lg mb-6">
                      From driving massive traffic to building niche communities and creating multiple revenue streams, this course delivers everything you need to dominate Reddit and monetize it like a pro.
                    </p>
                    <h4 className="text-xl sm:text-2xl font-display font-bold text-neo-black mt-8 sm:mt-10 mb-4">Walk away with:</h4>
                    <p className="text-gray-700 text-base sm:text-lg mb-8 sm:mb-10">
                      The tools and strategies to build an interconnected content ecosystem, automate your efforts, and transform Reddit into your secret weapon for sustainable, long-term income.
                    </p>
                  </div>

                  <div className="md:col-span-2 bg-neo-black text-white p-6 sm:p-8 border-4 border-neo-black shadow-neo g-fade-in">
                    <h4 className="text-3xl sm:text-4xl font-display font-bold text-neo-accent mb-6 text-center md:text-left">Learn to:</h4>
                    <ul className="space-y-4">
                      {[
                        "Create and manage multiple accounts for maximum growth.",
                        "Drive traffic to your blogs, YouTube, TikTok, and more.",
                        "Sell PDFs, affiliate products, and build paid memberships.",
                        "Turn Reddit into a content machine for blogs and videos.",
                        "Master cold DM outreach and subreddit creation.",
                      ].map((item) => (
                        <li key={item} className="flex items-start">
                          <svg
                            className="w-6 h-6 text-neo-accent mr-3 flex-shrink-0 mt-1 stroke-[3]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 21l-3-3m0 0l3-3m-3 3h11a4 4 0 004-4V5" />
                          </svg>
                          <span className="text-gray-300 text-lg">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section className="py-20 sm:py-24 bg-white border-t-4 border-neo-black">
              <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
                <div className="max-w-xl g-fade-in">
                  <h3 className="text-5xl font-display font-extrabold text-neo-black mb-6">
                    Who <span className="text-outline">We Are</span>
                  </h3>
                  <p className="text-lg text-gray-700 mb-6">
                    We are Reddit growth experts dedicated to helping individuals and businesses unlock Reddit's full potential. With a deep understanding of Reddit's algorithm and culture, we provide practical, proven strategies to help you build karma, grow communities, and drive traffic.
                  </p>
                  <div className="g-fade-in">
                    <img
                      src="/images/about-us-image.webp"
                      alt="Reddit Growth Experts"
                      className="w-full h-auto object-cover border-4 border-neo-black shadow-neo"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
                <div className="g-fade-in">
                  <h3 className="text-3xl font-display font-bold text-neo-black mb-6 text-center md:text-left">
                    What we can <span className="text-outline">teach you:</span>
                  </h3>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    {[
                      "Karma Growth",
                      "Making Money",
                      "Traffic Growth",
                      "Upvote Growth",
                      "Engagement Growth",
                      "Building Trust",
                      "Viral Content Creating",
                      "Winning Ideas Generation",
                    ].map((skill) => (
                      <span key={skill} className="skill-tag bg-white text-neo-black font-bold py-2 px-4 border-2 border-neo-black transition-all hover:bg-neo-black hover:text-neo-accent cursor-none">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>

        <NeoFooter />
      </div>
    </NeoPage>
  );
};

export default HomePage;

