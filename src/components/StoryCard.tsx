"use client";

import { useState } from "react";
import type { SegmentStory } from "@/lib/types";

interface Props {
  story: SegmentStory;
  date: string;
}

export function StoryCard({ story, date }: Props) {
  const [expanded, setExpanded] = useState(false);

  const scoreColor =
    story.relevanceScore >= 9
      ? "#059669"
      : story.relevanceScore >= 7
        ? "#2ABFAB"
        : story.relevanceScore >= 5
          ? "#F59E0B"
          : "#6B7280";

  return (
    <div className="group">
      {/* Main card — always visible */}
      <div className="px-5 py-4">
        {/* Row 1: Score + Source + Go Deeper */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{ backgroundColor: `${scoreColor}15`, color: scoreColor }}
            >
              {story.relevanceScore}/10
            </span>
            <span className="text-xs text-[var(--text-muted)]">{story.source}</span>
          </div>
          <a
            href={`/story/${story.id}?date=${date}`}
            className="text-xs font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)] no-underline opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Go Deeper →
          </a>
        </div>

        {/* Row 2: Title */}
        <h3 className="font-semibold text-[15px] leading-snug mb-1.5">
          <a
            href={story.link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--brand)] no-underline text-[var(--text)]"
          >
            {story.title}
          </a>
        </h3>

        {/* Row 3: TLDR — the factual one-liner */}
        <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-3">
          {story.tldr}
        </p>

        {/* Row 4: So What — the INSIGHT (always visible, this is the star) */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 mb-2">
          <p className="text-sm leading-relaxed">
            <span className="font-semibold text-[var(--text)]">So what: </span>
            <span className="text-[var(--text)]">{story.soWhat}</span>
          </p>
        </div>

        {/* Row 5: Expandable Problem + Opportunity */}
        {(story.problem || story.opportunity) && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--brand)] cursor-pointer bg-transparent border-0 px-0 py-1 flex items-center gap-1"
            >
              <span
                className="inline-block transition-transform text-[10px]"
                style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
              >
                ▶
              </span>
              {expanded ? "Less" : "Problem & Opportunity"}
            </button>

            {expanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 animate-fadeIn">
                {story.problem && (
                  <div className="rounded-lg px-4 py-3 border border-[var(--border)] bg-white">
                    <h4 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                      Problem
                    </h4>
                    <p className="text-sm text-[var(--text)] leading-relaxed">{story.problem}</p>
                  </div>
                )}
                {story.opportunity && story.opportunity !== "null" && (
                  <div className="rounded-lg px-4 py-3 border border-[#2ABFAB33] bg-[#2ABFAB08]">
                    <h4 className="text-[11px] font-semibold text-[var(--brand)] uppercase tracking-wide mb-1">
                      This Week
                    </h4>
                    <p className="text-sm text-[var(--text)] leading-relaxed">{story.opportunity}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Divider */}
      <div className="mx-5 border-b border-[var(--border)]" />
    </div>
  );
}
