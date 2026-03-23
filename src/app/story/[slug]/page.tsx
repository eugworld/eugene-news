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

  useEffect(() => {
    fetch(`/api/digest?date=${date}&slug=${slug}`)
      .then((r) => r.json())
      .then((data) => { setStory(data.story || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [date, slug]);

  if (loading) return <div className="text-center py-20 text-[var(--text-muted)]">Loading...</div>;
  if (!story) return (
    <div className="text-center py-20">
      <h1 className="text-xl font-bold mb-2">Story not found</h1>
      <a href="/" className="text-[var(--brand)] no-underline">Back to digest</a>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        {/* Story header */}
        <div className="bg-white rounded-xl border border-[var(--border)] p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-[var(--text-muted)] bg-gray-100 px-2 py-0.5 rounded">{story.source}</span>
            <span className="text-xs font-semibold" style={{ color: story.relevanceScore >= 8 ? "#2ABFAB" : "#F59E0B" }}>
              {story.relevanceScore}/10
            </span>
          </div>

          <h1 className="text-2xl font-bold mb-3">
            <a href={story.link} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--brand)] no-underline text-[var(--text)]">
              {story.title}
            </a>
          </h1>

          <p className="text-[var(--text-muted)] mb-3">{story.tldr}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">So What</h4>
              <p className="text-sm">{story.soWhat}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Problem</h4>
              <p className="text-sm">{story.problem}</p>
            </div>
            {story.opportunity && (
              <div className="bg-[#2ABFAB0D] border border-[#2ABFAB33] rounded-lg p-3">
                <h4 className="text-xs font-semibold text-[var(--brand)] uppercase mb-1">Opportunity</h4>
                <p className="text-sm">{story.opportunity}</p>
              </div>
            )}
          </div>
        </div>

        {/* 7 Advisor Perspectives */}
        {story.perspectives.length > 0 && (
          <div className="bg-white rounded-xl border border-[var(--border)] p-6">
            <h2 className="text-lg font-bold mb-4">All 7 Advisor Perspectives</h2>
            <AdvisorTabs perspectives={story.perspectives} />
          </div>
        )}
      </div>

      {/* Chat sidebar */}
      <div className="lg:w-96 w-full">
        <div className="lg:sticky lg:top-4">
          <ChatPanel story={story} date={date} />
        </div>
      </div>
    </div>
  );
}
