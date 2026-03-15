import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const useGsapPageAnimations = (depKey = "") => {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray(".g-fade-in").forEach((element) => {
        gsap.fromTo(
          element,
          { opacity: 0, y: 50, rotate: 3 },
          {
            opacity: 1,
            y: 0,
            rotate: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 85%",
            },
          },
        );
      });

      const heroLines = gsap.utils.toArray(".hero-text-line span");
      if (heroLines.length) {
        gsap.fromTo(
          heroLines,
          { yPercent: 110 },
          {
            yPercent: 0,
            duration: 0.9,
            stagger: 0.08,
            ease: "power3.out",
          },
        );
      }
    });

    return () => ctx.revert();
  }, [depKey]);
};










