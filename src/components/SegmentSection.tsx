import type { Segment } from "@/lib/types";
import { SEGMENT_COLORS } from "@/lib/types";
import { StoryCard } from "./StoryCard";

interface Props {
  segment: Segment;
  date: string;
}

export function SegmentSection({ segment, date }: Props) {
  const borderColor = SEGMENT_COLORS[segment.name] || "#6B7280";

  if (segment.stories.length === 0) return null;

  return (
    <div
      className="bg-white rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
    >
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold flex items-center gap-2">
            <span>{segment.icon}</span> {segment.name}
          </h2>
          <span className="text-xs text-[var(--text-muted)] bg-gray-100 px-2 py-0.5 rounded-full">
            {segment.advisorLens}
          </span>
        </div>
        <p className="text-sm text-[var(--text-muted)]">{segment.tldr}</p>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {segment.stories.map((story) => (
          <StoryCard key={story.id} story={story} date={date} />
        ))}
      </div>
    </div>
  );
}
