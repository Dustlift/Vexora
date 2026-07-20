import Link from "next/link";
import { Activity, Droplets, GalleryHorizontalEnd, LayoutDashboard, Rocket, UserRound, Wand2, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const links: Array<{ href: string; title: string; icon: LucideIcon }> = [
  { href: "/dashboard", title: "Dashboard", icon: LayoutDashboard },
  { href: "/faucet", title: "Faucet", icon: Droplets },
  { href: "/deploy", title: "NFT Deploy", icon: Rocket },
  { href: "/mint", title: "Mint NFT", icon: Wand2 },
  { href: "/my-nfts", title: "My NFTs", icon: GalleryHorizontalEnd },
  { href: "/profile", title: "Profile", icon: UserRound },
  { href: "/transactions", title: "Transactions", icon: Activity },
];

export default function Home() {
  return (
    <AppShell>
      <section className="py-4">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Vexora Arc Testnet toolkit</p>
        <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white md:text-6xl">Choose a Vexora operation.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
          View test token balances, deploy NFT collections, manage minting, and transfer owned NFTs.
        </p>
      </section>
      <section className="grid gap-4 pb-10 pt-6 sm:grid-cols-2 lg:grid-cols-4">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group aspect-square rounded-lg border border-cyan-200/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 ring-1 ring-violet-300/5 transition hover:-translate-y-1 hover:border-cyan-200/25 hover:bg-white/[0.07]">
              <div className="flex h-full flex-col justify-between">
                <span className="grid size-14 place-items-center rounded-md bg-gradient-to-br from-violet-400 via-indigo-500 to-cyan-300 text-white shadow-lg shadow-cyan-500/20">
                  <Icon size={28} />
                </span>
                <span className="text-2xl font-semibold text-white">{item.title}</span>
              </div>
            </Link>
          );
        })}
      </section>
    </AppShell>
  );
}
