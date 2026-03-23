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
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">{headline}</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {formatted} &middot; {metadata.analyzed} stories across 4 segments
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {dates.slice(0, 7).map((d) => (
            <a
              key={d}
              href={`/?date=${d}`}
              className={`text-xs px-2.5 py-1 rounded-full no-underline transition-colors ${
                d === date
                  ? "bg-[var(--brand)] text-white"
                  : "bg-gray-100 text-[var(--text-muted)] hover:bg-gray-200"
              }`}
            >
              {d.slice(5)}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
