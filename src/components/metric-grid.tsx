import { Card } from "@/components/ui/card";

export function MetricGrid({ items }: { items: Array<{ label: string; value: string; detail?: string }> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <p className="text-sm text-slate-400">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
          {item.detail ? <p className="mt-2 text-xs text-slate-500">{item.detail}</p> : null}
        </Card>
      ))}
    </div>
  );
}
