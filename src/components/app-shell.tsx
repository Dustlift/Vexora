"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Activity, Droplets, ExternalLink, GalleryHorizontalEnd, LayoutDashboard, Repeat2, Rocket, Wand2 } from "lucide-react";
import { WalletStatus } from "@/components/wallet/wallet-status";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/faucet", label: "Faucet", icon: Droplets },
  { href: "/swap", label: "Swap", icon: Repeat2 },
  { href: "/deploy", label: "NFT Deploy", icon: Rocket },
  { href: "/mint", label: "Mint NFT", icon: Wand2 },
  { href: "/my-nfts", label: "My NFTs", icon: GalleryHorizontalEnd },
  { href: "/transactions", label: "Transactions", icon: Activity },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-12 place-items-center overflow-hidden rounded-md border border-cyan-200/15 bg-[#02030b] shadow-lg shadow-violet-600/20">
              <Image src="/vexora-logo.png" alt="Vexora logo" width={48} height={48} className="size-12 object-cover" priority />
            </span>
            <span>
              <span className="block text-base font-semibold text-white">Vexora</span>
              <span className="block text-xs text-cyan-100/70">Technical operations on Arc Testnet</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <a href="https://openvexora.vercel.app" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-cyan-200/10 px-3 py-2 text-sm text-cyan-100 hover:bg-white/10">
              openvexora.vercel.app <ExternalLink size={15} />
            </a>
            <WalletStatus />
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={cn("inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-white/10", active && "bg-white/10 text-white")}>
                <Icon size={16} /> {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
