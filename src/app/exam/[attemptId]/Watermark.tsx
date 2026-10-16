"use client";

import { useEffect, useState } from "react";

// Tiled identity watermark over the exam screen; shifts slightly every 30 s.
export function Watermark({ text }: { text: string }) {
  const [shift, setShift] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const id = setInterval(() => {
      setShift({ x: Math.round(Math.random() * 40 - 20), y: Math.round(Math.random() * 40 - 20) });
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none">
      <div
        className="absolute -inset-y-full -inset-x-[150%] flex flex-wrap content-start justify-center gap-x-12 gap-y-[54px] text-xs whitespace-nowrap text-primary transition-transform duration-1000"
        style={{
          opacity: "var(--watermark-opacity)",
          transform: `translate(${shift.x}px, ${shift.y}px) rotate(-24deg)`,
        }}
      >
        {Array.from({ length: 160 }, (_, i) => (
          <span key={i}>{text}</span>
        ))}
      </div>
    </div>
  );
}
