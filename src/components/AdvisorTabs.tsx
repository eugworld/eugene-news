"use client";

import { useState } from "react";
import type { AdvisorPerspective } from "@/lib/types";
import { ADVISOR_COLORS } from "@/lib/types";
interface Props {
  perspectives: AdvisorPerspective[];
}

export function AdvisorTabs({ perspectives }: Props) {
  const [active, setActive] = useState(0);

  if (!perspectives || perspectives.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">No perspectives available.</p>;
  }

  const current = perspectives[active];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {perspectives.map((p, i) => {
          const color = ADVISOR_COLORS[p.advisor] || "#6B7280";
          const isActive = i === active;
          return (
            <button
              key={p.advisor}
              onClick={() => setActive(i)}
              className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all border-0 cursor-pointer"
              style={{
                backgroundColor: isActive ? color : `${color}15`,
                color: isActive ? "white" : color,
              }}
            >
              {p.advisor}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {current && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span
              className="text-sm font-bold"
              style={{ color: ADVISOR_COLORS[current.advisor] || "#6B7280" }}
            >
              {current.advisor}
            </span>
            <span className="text-xs font-semibold" style={{ color: current.relevanceScore >= 8 ? "#2ABFAB" : "#F59E0B" }}>
              {current.relevanceScore}/10
            </span>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">So What?</h4>
            <p className="text-sm">{current.soWhat}</p>
          </div>

          {current.actionItem && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Action Item</h4>
              <p className="text-sm bg-[#2ABFAB0D] border border-[#2ABFAB33] rounded-lg p-3">
                {current.actionItem}
              </p>
            </div>
          )}

          {current.challenge && (
            <div>
              <h4 className="text-xs font-semibold text-[#EF4444] uppercase mb-1">Challenge</h4>
              <p className="text-sm bg-red-50 border border-red-100 rounded-lg p-3 italic">
                &ldquo;{current.challenge}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
