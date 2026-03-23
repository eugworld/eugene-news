import type { SegmentStory } from "@/lib/types";

interface Props {
  story: SegmentStory;
  date: string;
}

export function StoryCard({ story, date }: Props) {
  return (
    <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-[var(--text-muted)]">{story.source}</span>
            <span className="text-xs font-semibold" style={{ color: story.relevanceScore >= 8 ? "#2ABFAB" : story.relevanceScore >= 6 ? "#F59E0B" : "#6B7280" }}>
              {story.relevanceScore}/10
            </span>
          </div>

          <h3 className="font-semibold text-sm mb-1">
            <a href={story.link} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--brand)] no-underline text-[var(--text)]">
              {story.title}
            </a>
          </h3>

          <p className="text-xs text-[var(--text-muted)] mb-1">{story.tldr}</p>
          <p className="text-xs text-[var(--text)]"><strong>So what:</strong> {story.soWhat}</p>

          {story.problem && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              <strong>Problem:</strong> {story.problem}
              {story.opportunity && <> &middot; <strong>Opportunity:</strong> {story.opportunity}</>}
            </p>
          )}
        </div>

        <a
          href={`/story/${story.id}?date=${date}`}
          className="text-xs bg-[var(--brand)] text-white px-3 py-1.5 rounded-full no-underline hover:bg-[var(--brand-dark)] whitespace-nowrap shrink-0 mt-1"
        >
          Go Deeper
        </a>
      </div>
    </div>
  );
}
