import type { Correlation } from "@/lib/types";
import { SEGMENT_COLORS } from "@/lib/types";

export function CorrelationCard({ correlation }: { correlation: Correlation }) {
  const colorA = SEGMENT_COLORS[correlation.segmentA] || "#6B7280";
  const colorB = SEGMENT_COLORS[correlation.segmentB] || "#6B7280";

  return (
    <div className="bg-white rounded-xl border border-[var(--border)] p-5">
      {/* Segment pills + confidence */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${colorA}12`, color: colorA }}
        >
          {correlation.segmentA}
        </span>
        <span className="text-[var(--text-muted)] text-xs">↔</span>
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${colorB}12`, color: colorB }}
        >
          {correlation.segmentB}
        </span>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ml-auto ${
            correlation.confidence === "high"
              ? "bg-emerald-50 text-emerald-700"
              : correlation.confidence === "medium"
                ? "bg-amber-50 text-amber-700"
                : "bg-purple-50 text-purple-700"
          }`}
        >
          {correlation.confidence}
        </span>
      </div>

      {/* Connection */}
      <p className="text-sm text-[var(--text)] leading-relaxed mb-2">{correlation.connection}</p>

      {/* Implication — the actionable part */}
      <div className="bg-gray-50 rounded-lg px-3 py-2.5">
        <p className="text-sm text-[var(--text)]">
          <span className="font-semibold">→ </span>
          {correlation.implication}
        </p>
      </div>
    </div>
  );
}
