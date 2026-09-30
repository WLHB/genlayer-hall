"use client";

import { useEffect, useState } from "react";

export function Countdown({ deadline }: { deadline: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(iv);
  }, []);

  const remain = Math.max(0, Math.ceil((deadline - now) / 1000));
  const pct = Math.max(0, Math.min(1, (deadline - now) / 60000));
  const danger = remain <= 10;

  return (
    <div
      className={`gr-count${danger ? " danger" : ""}`}
      style={{
        background: `conic-gradient(${
          danger ? "var(--gr-crimson)" : "var(--gr-gold)"
        } ${pct * 360}deg, rgba(255, 255, 255, 0.08) 0deg)`,
      }}
    >
      <div className="gr-count-inner">{remain}</div>
    </div>
  );
}
