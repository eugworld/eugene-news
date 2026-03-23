export function ActionItems({ items }: { items: string[] }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-3 text-[var(--text)]">Action Items</h2>
      <div className="bg-white rounded-xl border border-[var(--border)] p-4">
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-[var(--brand)] mt-0.5 shrink-0">&#9744;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
