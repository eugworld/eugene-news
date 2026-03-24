import type { DailyDigest } from "@/lib/types";

interface Props {
  date: string;
  dates: string[];
  headline: string;
  metadata: DailyDigest["metadata"];
}

export function DigestHeader({ date, dates, headline, metadata }: Props) {
  const formatted = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="mb-8">
      {/* Date pills */}
      {dates.length > 1 && (
        <div className="flex items-center gap-1.5 mb-4">
          {dates.slice(0, 7).map((d) => (
            <a
              key={d}
              href={`/?date=${d}`}
              className={`text-xs px-3 py-1.5 rounded-full no-underline transition-colors font-medium ${
                d === date
                  ? "bg-[var(--brand)] text-white"
                  : "bg-white border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
              }`}
            >
              {d.slice(5)}
            </a>
          ))}
        </div>
      )}

      {/* Headline */}
      <h1 className="text-xl font-bold mb-1.5 leading-snug">{headline}</h1>
      <p className="text-sm text-[var(--text-muted)]">
        {formatted} · {metadata.analyzed} stories · 4 segments
      </p>
    </div>
  );
}
