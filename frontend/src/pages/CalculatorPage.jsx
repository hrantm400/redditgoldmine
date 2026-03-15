import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";
import NeoPage from "../components/NeoPage";
import NeoFooter from "../components/NeoFooter";
import SiteHeader from "../components/SiteHeader";
import RedditCalculator from "../components/RedditCalculator";

const CalculatorPage = () => {
  const pageRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    let lenis;
    let ctx;

    ctx = gsap.context(() => {
      // Fade in calculator on load
      gsap.fromTo(
        ".calculator-container",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      );

      // Parallax effects
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

      // Fade in elements on scroll
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
          }
        );
      });
    }, pageRef);

    // Smooth scroll
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
      <div ref={pageRef}>
        <SiteHeader />

        <main id="smooth-wrapper">
          <div id="smooth-content">
            {/* Hero Section */}
            <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 text-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-neo-main/10 to-neo-bg"></div>
              
              <div data-speed="0.8" className="parallax-el absolute top-1/4 left-10 w-24 h-24 bg-neo-main border-4 border-neo-black shadow-neo opacity-80 hidden md:block" />
              <div data-speed="1.2" className="parallax-el absolute bottom-1/4 right-10 w-32 h-32 bg-neo-accent border-4 border-neo-black shadow-neo rotate-12 hidden md:block" />

              <div className="relative container mx-auto px-6">
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-extrabold text-neo-black mb-6 leading-none">
                  Reddit <span className="text-outline text-neo-main">Calculator</span>
                </h1>
                <p className="max-w-3xl mx-auto text-lg md:text-xl text-gray-700 mb-8 g-fade-in">
                  Discover how cool you are on Reddit! Get a detailed analysis of your account, 
                  personalized recommendations, and learn how to improve your karma.
                </p>
              </div>
            </section>

            {/* Calculator Section */}
            <section className="py-12 md:py-20 bg-neo-bg">
              <div className="container mx-auto px-6">
                <div className="calculator-container">
                  <RedditCalculator />
                </div>
              </div>
            </section>

            {/* Info Section */}
            <section className="py-20 bg-white border-t-4 border-neo-black">
              <div className="container mx-auto px-6">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-4xl md:text-5xl font-display font-extrabold text-neo-black mb-8 text-center">
                    How It <span className="text-outline">Works?</span>
                  </h2>
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="g-fade-in card-neo p-6 text-center">
                      <div className="text-4xl mb-4">🔍</div>
                      <h3 className="text-2xl font-display font-bold text-neo-black mb-3">
                        Data Analysis
                      </h3>
                      <p className="text-gray-700">
                        We analyze your karma, activity, account age, and posting times
                      </p>
                    </div>
                    <div className="g-fade-in card-neo p-6 text-center">
                      <div className="text-4xl mb-4">📊</div>
                      <h3 className="text-2xl font-display font-bold text-neo-black mb-3">
                        Coolness Score
                      </h3>
                      <p className="text-gray-700">
                        A special algorithm calculates your level from 0 to 100
                      </p>
                    </div>
                    <div className="g-fade-in card-neo p-6 text-center">
                      <div className="text-4xl mb-4">💡</div>
                      <h3 className="text-2xl font-display font-bold text-neo-black mb-3">
                        Recommendations
                      </h3>
                      <p className="text-gray-700">
                        Get personalized advice on how to improve your Reddit profile
                      </p>
                    </div>
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

export default CalculatorPage;
