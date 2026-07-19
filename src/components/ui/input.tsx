import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("h-10 w-full rounded-md border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none ring-emerald-300/30 transition focus:ring-4", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("h-10 w-full rounded-md border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none ring-emerald-300/30 transition focus:ring-4", props.className)} />;
}
