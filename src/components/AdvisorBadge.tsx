import { ADVISOR_COLORS } from "@/lib/types";

export function AdvisorBadge({ advisor }: { advisor: string }) {
  const color = ADVISOR_COLORS[advisor] || "#6B7280";
  return (
    <span
      className="advisor-badge"
      style={{ backgroundColor: color }}
    >
      {advisor}
    </span>
  );
}
