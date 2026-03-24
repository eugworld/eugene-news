import { getLatestDigest, listDigestDates, getDigest } from "@/lib/storage";
import { SegmentSection } from "@/components/SegmentSection";
import { CorrelationCard } from "@/components/CorrelationCard";
import { ActionItems } from "@/components/ActionItems";
import { DigestHeader } from "@/components/DigestHeader";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const dates = await listDigestDates();
  const digest = params.date
    ? await getDigest(params.date)
    : await getLatestDigest();

  if (!digest) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">No digest yet</h1>
        <p className="text-[var(--text-muted)] mb-6">
          Trigger your first digest or wait for the daily 7am cron.
        </p>
        <a
          href="/api/digest"
          className="inline-block bg-[var(--brand)] text-white px-6 py-3 rounded-lg font-medium hover:bg-[var(--brand-dark)] no-underline"
        >
          Generate First Digest
        </a>
      </div>
    );
  }

  return (
    <div>
      <DigestHeader
        date={digest.date}
        dates={dates}
        headline={digest.headline}
        metadata={digest.metadata}
      />

      {/* Segments — generous spacing between cards */}
      <div className="space-y-5 mb-10">
        {digest.segments.map((segment) => (
          <SegmentSection key={segment.name} segment={segment} date={digest.date} />
        ))}
      </div>

      {/* Connections — cross-segment intelligence */}
      {digest.correlations.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <span>🔗</span> Cross-Segment Connections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {digest.correlations.map((c, i) => (
              <CorrelationCard key={i} correlation={c} />
            ))}
          </div>
        </section>
      )}

      {/* Action Items */}
      {digest.actionItems.length > 0 && (
        <section className="mb-10">
          <ActionItems items={digest.actionItems} />
        </section>
      )}
    </div>
  );
}
