import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/10", className)} {...props} />;
}

export function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold text-white">{title}</h1>
      {detail ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{detail}</p> : null}
    </div>
  );
}
