"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { ARC_TESTNET_CHAIN_ID, walletAddEthereumChainParams } from "@/config/chains";
import { explorer } from "@/config/explorer";
import { Button } from "@/components/ui/button";
import { shortAddress } from "@/lib/utils";
import { toast } from "sonner";

export function WalletStatus() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== ARC_TESTNET_CHAIN_ID;

  async function switchToArc() {
    try {
      await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID });
    } catch {
      const provider = (window as Window & { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
      await provider?.request({ method: "wallet_addEthereumChain", params: [walletAddEthereumChainParams] });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {wrongNetwork ? (
        <Button onClick={switchToArc} disabled={isPending} className="bg-amber-300 hover:bg-amber-200">
          <AlertTriangle size={16} /> Switch to Arc Testnet
        </Button>
      ) : null}
      {address ? (
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
          <span>{shortAddress(address)}</span>
          <button aria-label="Copy wallet address" onClick={() => navigator.clipboard.writeText(address).then(() => toast.success("Address copied"))}>
            <Copy size={14} />
          </button>
          <a aria-label="Open address in ArcScan" href={explorer.address(address)} target="_blank" rel="noreferrer">
            <ExternalLink size={14} />
          </a>
        </div>
      ) : null}
      <ConnectButton />
    </div>
  );
}
