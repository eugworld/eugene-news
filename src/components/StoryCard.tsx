"use client";

import { useState } from "react";
import type { SegmentStory } from "@/lib/types";

interface Props {
  story: SegmentStory;
  date: string;
}

export function StoryCard({ story, date }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [taskDone, setTaskDone] = useState(false);

  const scoreColor =
    story.relevanceScore >= 9
      ? "#059669"
      : story.relevanceScore >= 7
        ? "#2ABFAB"
        : story.relevanceScore >= 5
          ? "#F59E0B"
          : "#6B7280";

  const hasTask = story.opportunity && story.opportunity !== "null" && story.opportunity.length > 5;

  return (
    <div className={`group transition-opacity ${taskDone ? "opacity-60" : ""}`}>
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
            {taskDone && (
              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                ✓ Done
              </span>
            )}
          </div>
          <a
            href={`/story/${story.id}?date=${date}`}
            className="text-xs font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)] no-underline opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Go Deeper →
          </a>
        </div>

        {/* Row 2: Title */}
        <h3 className={`font-semibold text-[15px] leading-snug mb-1.5 ${taskDone ? "line-through decoration-1" : ""}`}>
          <a
            href={story.link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--brand)] no-underline text-[var(--text)]"
          >
            {story.title}
          </a>
        </h3>

        {/* Row 3: Key Points — executive summary bullets */}
        {story.keyPoints && story.keyPoints.length > 0 ? (
          <ul className="text-[13px] text-[var(--text)] leading-relaxed mb-3 space-y-0.5 pl-0 list-none">
            {story.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[var(--text-muted)] mt-0.5 shrink-0 text-[11px]">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-3">
            {story.tldr}
          </p>
        )}

        {/* Row 4: So What — the INSIGHT */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 mb-2">
          <p className="text-sm leading-relaxed">
            <span className="font-semibold text-[var(--text)]">So what: </span>
            <span className="text-[var(--text)]">{story.soWhat}</span>
          </p>
        </div>

        {/* Row 5: Task Checkpoint (if opportunity exists) */}
        {hasTask && (
          <button
            onClick={() => setTaskDone(!taskDone)}
            className={`w-full text-left flex items-start gap-2.5 rounded-lg px-4 py-3 mb-2 border cursor-pointer transition-all ${
              taskDone
                ? "bg-emerald-50 border-emerald-200"
                : "bg-[#2ABFAB08] border-[#2ABFAB33] hover:border-[#2ABFAB66]"
            }`}
          >
            <span className={`mt-0.5 shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] transition-all ${
              taskDone
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-[var(--brand)] bg-white"
            }`}>
              {taskDone ? "✓" : ""}
            </span>
            <div className="flex-1 min-w-0">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: taskDone ? "#059669" : "var(--brand)" }}>
                {taskDone ? "Completed" : "Action This Week"}
              </h4>
              <p className={`text-sm leading-relaxed ${taskDone ? "line-through text-[var(--text-muted)]" : "text-[var(--text)]"}`}>
                {story.opportunity}
              </p>
            </div>
          </button>
        )}

        {/* Row 6: Expandable Problem */}
        {story.problem && (
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
              {expanded ? "Less" : "Underlying problem"}
            </button>

            {expanded && (
              <div className="mt-2 animate-fadeIn rounded-lg px-4 py-3 border border-[var(--border)] bg-white">
                <h4 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                  The Real Problem
                </h4>
                <p className="text-sm text-[var(--text)] leading-relaxed">{story.problem}</p>
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
