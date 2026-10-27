"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useRef } from "react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

// Scroll-scrubbed arrival: headings ([data-lines]) rise line by line from behind a mask, everything else
// marked [data-reveal] lifts a few pixels. Scroll back and it rewinds.
export default function Reveal({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const q = gsap.utils.selector(root);
      const splits = q("[data-lines]").map((el) => {
        const split = SplitText.create(el, { type: "lines", mask: "lines" });
        gsap.from(split.lines, {
          yPercent: 105,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", end: "top 58%", scrub: 0.6 },
        });
        return split;
      });
      q("[data-reveal]").forEach((el) =>
        gsap.from(el, {
          y: 22,
          opacity: 0,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 92%", end: "top 70%", scrub: 0.6 },
        }),
      );
      return () => splits.forEach((s) => s.revert());
    },
    { scope: root },
  );
  return (
    <div ref={root} id={id} className={className}>
      {children}
    </div>
  );
}
