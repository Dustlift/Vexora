import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <AppShell>
      <section className="grid gap-8 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">Arc Testnet technical toolkit</p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white md:text-6xl">Operate Arc Testnet balances, swaps, and NFT collections from one workspace.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Arc Testnet uzerinde test token bakiyelerinizi goruntuleyin, USDC ve EURC arasinda swap yapin, NFT koleksiyonlari deploy edin ve NFT mint islemlerini yonetin.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-300 px-5 py-2 font-semibold text-slate-950 hover:bg-emerald-200">
              Open dashboard <ArrowRight size={18} />
            </Link>
            <Link href="/deploy" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/15 px-5 py-2 font-semibold text-white hover:bg-white/10">
              Deploy NFT collection
            </Link>
          </div>
        </div>
        <Card className="grid gap-4">
          {["Arc Testnet chain verification before every transaction", "USDC gas token display with no ETH labels", "Local wallet-scoped activity and NFT collection history", "OpenZeppelin-based ERC-721 and ERC-1155 templates"].map((item) => (
            <div key={item} className="flex gap-3 rounded-md border border-white/10 bg-slate-950/50 p-4">
              <ShieldCheck className="mt-0.5 text-emerald-200" size={20} />
              <span className="text-sm leading-6 text-slate-200">{item}</span>
            </div>
          ))}
          <p className="text-sm leading-6 text-slate-400">Testnet assets are for technical testing only and have no real-world monetary value.</p>
        </Card>
      </section>
    </AppShell>
  );
}
