
interface StatTileProps {
  value: string;
  label: string;
}

export function StatTile({ value, label }: StatTileProps) {
  return (
    <div className="rounded-2xl bg-sand px-4 py-3.5">
      <p className="text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-muted">{label}</p>
    </div>);

}