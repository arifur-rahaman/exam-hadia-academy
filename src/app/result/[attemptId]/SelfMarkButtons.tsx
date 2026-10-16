"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SelfMark } from "@/lib/types";
import { markShort } from "./actions";

const CHOICES: { mark: SelfMark; label: string }[] = [
  { mark: "full", label: "পুরো মিলেছে" },
  { mark: "partial", label: "আংশিক" },
  { mark: "none", label: "মেলেনি" },
];

export function SelfMarkButtons({ id, current }: { id: string; current: SelfMark | null }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">আপনার Answer কতটা মিলেছে?</p>
      <div role="radiogroup" aria-label="Self mark" className="grid grid-cols-3 gap-2">
        {CHOICES.map((c) => (
          <button
            key={c.mark}
            type="button"
            role="radio"
            aria-checked={value === c.mark}
            disabled={pending}
            onClick={() => {
              const prev = value;
              setValue(c.mark);
              setError(null);
              start(async () => {
                const r = await markShort(id, c.mark);
                if (r.error) {
                  setValue(prev);
                  setError(r.error);
                } else router.refresh();
              });
            }}
            className={`min-h-touch rounded-control px-2 text-sm ${
              value === c.mark ? "border-2 border-accent bg-accent-soft font-semibold" : "border border-input bg-surface"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-danger-text">{error}</p>}
    </div>
  );
}
