import type { Correlation } from "@/lib/types";
import { SEGMENT_COLORS } from "@/lib/types";

export function CorrelationCard({ correlation }: { correlation: Correlation }) {
  const colorA = SEGMENT_COLORS[correlation.segmentA] || "#6B7280";
  const colorB = SEGMENT_COLORS[correlation.segmentB] || "#6B7280";

  const confidenceBg = {
    high: "bg-green-50 border-green-200",
    medium: "bg-yellow-50 border-yellow-200",
    speculative: "bg-purple-50 border-purple-200",
  }[correlation.confidence] || "bg-gray-50";

  return (
    <div className={`rounded-xl border p-4 ${confidenceBg}`}>
      <div className="flex items-center gap-2 mb-2 text-sm">
        <span className="font-semibold" style={{ color: colorA }}>{correlation.segmentA}</span>
        <span className="text-[var(--text-muted)]">↔</span>
        <span className="font-semibold" style={{ color: colorB }}>{correlation.segmentB}</span>
        <span className="text-xs text-[var(--text-muted)] bg-white/60 px-2 py-0.5 rounded-full ml-auto">
          {correlation.confidence}
        </span>
      </div>
      <p className="text-sm mb-1">{correlation.connection}</p>
      <p className="text-xs text-[var(--text-muted)]"><strong>For you:</strong> {correlation.implication}</p>
    </div>
  );
}
