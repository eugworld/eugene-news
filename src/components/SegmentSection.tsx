import type { Segment } from "@/lib/types";
import { SEGMENT_COLORS } from "@/lib/types";
import { StoryCard } from "./StoryCard";

interface Props {
  segment: Segment;
  date: string;
}

export function SegmentSection({ segment, date }: Props) {
  const color = SEGMENT_COLORS[segment.name] || "#6B7280";

  if (segment.stories.length === 0) return null;

  return (
    <section className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
      {/* Segment header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{segment.icon}</span>
            <h2 className="text-base font-bold text-[var(--text)]">{segment.name}</h2>
            <span className="text-xs text-[var(--text-muted)]">·</span>
            <span className="text-xs text-[var(--text-muted)]">{segment.stories.length} stories</span>
          </div>
          <span
            className="text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{ backgroundColor: `${color}12`, color }}
          >
            {segment.advisorLens}
          </span>
        </div>

        {/* Segment TLDR */}
        {segment.tldr && (
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">{segment.tldr}</p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border)]" />

      {/* Stories */}
      <div>
        {segment.stories.map((story) => (
          <StoryCard key={story.id} story={story} date={date} />
        ))}
      </div>
    </section>
  );
}
