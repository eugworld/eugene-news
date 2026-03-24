"use client";

import { useEffect, useState } from "react";
import { AdvisorTabs } from "@/components/AdvisorTabs";
import { ChatPanel } from "@/components/ChatPanel";
import type { SegmentStory } from "@/lib/types";
import { useParams, useSearchParams } from "next/navigation";

export default function StoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const [story, setStory] = useState<SegmentStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPerspectives, setLoadingPerspectives] = useState(false);

  useEffect(() => {
    fetch(`/api/digest?date=${date}&slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setStory(data.story || null);
        setLoading(false);

        if (data.story && (!data.story.perspectives || data.story.perspectives.length === 0)) {
          setLoadingPerspectives(true);
          fetch("/api/perspectives", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storyId: slug, date }),
          })
            .then((r) => r.json())
            .then((pData) => {
              if (pData.perspectives) {
                setStory((prev) =>
                  prev ? { ...prev, perspectives: pData.perspectives } : prev
                );
              }
              setLoadingPerspectives(false);
            })
            .catch(() => setLoadingPerspectives(false));
        }
      })
      .catch(() => setLoading(false));
  }, [date, slug]);

  if (loading) return <div className="text-center py-20 text-[var(--text-muted)]">Loading...</div>;
  if (!story) return (
    <div className="text-center py-20">
      <h1 className="text-xl font-bold mb-2">Story not found</h1>
      <p className="text-sm text-[var(--text-muted)] mb-4">This story may not be in today&apos;s digest yet.</p>
      <a href={`/?date=${date}`} className="text-[var(--brand)] no-underline">← Back to digest</a>
    </div>
  );

  const scoreColor =
    story.relevanceScore >= 9 ? "#059669" :
    story.relevanceScore >= 7 ? "#2ABFAB" :
    story.relevanceScore >= 5 ? "#F59E0B" : "#6B7280";

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0 space-y-4">

        {/* Back link */}
        <a href={`/?date=${date}`} className="text-xs text-[var(--text-muted)] hover:text-[var(--brand)] no-underline">
          ← Back to digest
        </a>

        {/* === CARD 1: The Story — What Happened === */}
        <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
          {/* Header bar */}
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ backgroundColor: `${scoreColor}15`, color: scoreColor }}
              >
                {story.relevanceScore}/10
              </span>
              <span className="text-xs text-[var(--text-muted)]">{story.source}</span>
              <a
                href={story.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--brand)] no-underline ml-auto hover:underline"
              >
                Read original ↗
              </a>
            </div>

            <h1 className="text-xl font-bold leading-snug mb-3">{story.title}</h1>

            {/* TLDR — the executive summary */}
            <p className="text-[15px] text-[var(--text-muted)] leading-relaxed">{story.tldr}</p>
          </div>

          {/* Key Points — structured breakdown */}
          <div className="border-t border-[var(--border)] px-6 py-5 space-y-4">
            {/* So What — the star insight */}
            <div className="bg-gray-50 rounded-lg px-4 py-3.5">
              <h4 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
                So What — Why You Should Care
              </h4>
              <p className="text-sm leading-relaxed">{story.soWhat}</p>
            </div>

            {/* Problem + This Week side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {story.problem && (
                <div className="rounded-lg px-4 py-3.5 border border-[var(--border)]">
                  <h4 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
                    The Real Problem
                  </h4>
                  <p className="text-sm leading-relaxed">{story.problem}</p>
                </div>
              )}
              {story.opportunity && story.opportunity !== "null" && (
                <div className="rounded-lg px-4 py-3.5 border border-[#2ABFAB33] bg-[#2ABFAB08]">
                  <h4 className="text-[11px] font-semibold text-[var(--brand)] uppercase tracking-wide mb-1.5">
                    Action This Week
                  </h4>
                  <p className="text-sm leading-relaxed">{story.opportunity}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === CARD 2: 7 Advisor Perspectives === */}
        <div className="bg-white rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-base font-bold mb-4">7 Advisor Perspectives</h2>
          {loadingPerspectives ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-[var(--text-muted)]">
                <p className="text-sm">🧠 Your Board of Advisors is analyzing this story...</p>
                <p className="text-xs mt-2">Generating 7 perspectives with Challenge Protocol</p>
              </div>
            </div>
          ) : story.perspectives && story.perspectives.length > 0 ? (
            <AdvisorTabs perspectives={story.perspectives} />
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No perspectives available yet.</p>
          )}
        </div>
      </div>

      {/* Chat sidebar */}
      <div className="lg:w-[380px] w-full shrink-0">
        <div className="lg:sticky lg:top-4">
          <ChatPanel story={story} date={date} />
        </div>
      </div>
    </div>
  );
}
