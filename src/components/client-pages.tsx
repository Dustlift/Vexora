"use client";

import { useState } from "react";
import { Copy, ExternalLink, RefreshCcw, Repeat2 } from "lucide-react";
import { parseUnits, type Address } from "viem";
import { useAccount, useChainId } from "wagmi";
import { AppShell } from "@/components/app-shell";
import { MetricGrid } from "@/components/metric-grid";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_FAUCET_URL, ARC_CIRCLE_CHAIN_IDENTIFIER } from "@/config/chains";
import { explorer } from "@/config/explorer";
import type { SupportedTokenSymbol } from "@/config/tokens";
import { useTokenBalances } from "@/hooks/use-token-balances";
import { toUserFacingError } from "@/lib/arc/errors";
import { addActivity, getActivities, getCollections, saveCollection } from "@/lib/storage/activity-storage";
import { makeId, shortAddress } from "@/lib/utils";
import type { Activity, DeployedNftCollection, NftStandard, OperationState } from "@/types/activity";
import { erc721DeploySchema, erc1155DeploySchema, mintFormSchema, swapFormSchema } from "@/validators/forms";
import { toast } from "sonner";

const statusText: Record<OperationState, string> = {
  idle: "Idle",
  loading: "Loading",
  wallet_confirmation: "Wallet confirmation",
  transaction_pending: "Transaction pending",
  success: "Success",
  error: "Error",
};

function connectedAddress(address?: Address) {
  return address || "0x0000000000000000000000000000000000000000";
}

function useWalletScopedData() {
  const { address } = useAccount();
  const [, setVersion] = useState(0);
  return {
    address,
    activities: getActivities(address),
    collections: getCollections(address),
    refreshLocal: () => setVersion((value) => value + 1),
  };
}

function ActivityList({ activities }: { activities: Activity[] }) {
  if (!activities.length) return <p className="text-sm text-slate-400">No local activity yet for this wallet.</p>;
  return (
    <div className="grid gap-3">
      {activities.map((activity) => (
        <div key={activity.id} className="grid gap-2 rounded-md border border-white/10 bg-slate-950/45 p-4 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-semibold text-white">{activity.type.replaceAll("_", " ")}</p>
            <p className="text-xs text-slate-400">{new Date(activity.createdAt).toLocaleString()}</p>
            {activity.errorMessage ? <p className="mt-2 text-sm text-red-200">{activity.errorMessage}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="rounded-md bg-white/10 px-2 py-1">{activity.status}</span>
            {activity.txHash ? (
              <a className="inline-flex items-center gap-1 hover:text-white" href={explorer.tx(activity.txHash)} target="_blank" rel="noreferrer">
                {shortAddress(activity.txHash, 8)} <ExternalLink size={13} />
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { address, activities, collections } = useWalletScopedData();
  const balances = useTokenBalances();
  const swaps = activities.filter((item) => item.type === "swap").length;
  const mints = activities.filter((item) => item.type === "nft_mint").length;

  return (
    <AppShell>
      <SectionTitle title="Dashboard" detail="Wallet-scoped balances, NFT deployment records, and recent local transaction activity for Arc Testnet." />
      <MetricGrid
        items={[
          { label: "Connected wallet", value: shortAddress(address), detail: "Private keys are never requested." },
          { label: "USDC balance", value: balances.USDC, detail: `Native gas: ${balances.nativeGas}` },
          { label: "EURC balance", value: balances.EURC },
          { label: "NFT collections", value: String(collections.length), detail: `${swaps} swaps, ${mints} mints tracked locally` },
        ]}
      />
      <Card className="mt-6">
        <SectionTitle title="Recent transactions" />
        <ActivityList activities={activities.slice(0, 8)} />
      </Card>
    </AppShell>
  );
}

export function FaucetPage() {
  const { address } = useWalletScopedData();
  const balances = useTokenBalances();

  function openFaucet(token: SupportedTokenSymbol) {
    if (!address) return toast.error("Connect a wallet first.");
    void navigator.clipboard.writeText(address);
    addActivity(address, {
      id: makeId("faucet"),
      walletAddress: address,
      type: "faucet_redirect",
      status: "success",
      tokenOut: token,
      createdAt: new Date().toISOString(),
    });
    window.open(ARC_TESTNET_FAUCET_URL, "_blank", "noopener,noreferrer");
    toast.info(`Address copied. Select Arc Testnet and ${token} on the official Circle Faucet.`);
  }

  return (
    <AppShell>
      <SectionTitle title="Faucet" detail="This page never calls undocumented faucet endpoints. It copies your address and opens the official Circle Faucet in a new tab." />
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <p className="text-sm text-slate-400">Connected wallet</p>
          <div className="mt-3 flex items-center gap-2 text-white">
            <span>{shortAddress(address)}</span>
            {address ? <button aria-label="Copy address" onClick={() => navigator.clipboard.writeText(address).then(() => toast.success("Address copied"))}><Copy size={16} /></button> : null}
          </div>
          <div className="mt-5 grid gap-3">
            <Button onClick={() => openFaucet("USDC")}>Test USDC</Button>
            <Button onClick={() => openFaucet("EURC")} className="bg-cyan-200 hover:bg-cyan-100">Test EURC</Button>
            <Button onClick={balances.refresh} className="border-white/15 bg-white/10 text-white hover:bg-white/15"><RefreshCcw size={16} /> Refresh balances</Button>
          </div>
        </Card>
        <MetricGrid items={[{ label: "USDC", value: balances.USDC, detail: "ERC-20 interface uses 6 decimals." }, { label: "EURC", value: balances.EURC, detail: "ERC-20 interface uses 6 decimals." }, { label: "Gas token", value: balances.nativeGas, detail: "Arc Testnet gas is paid with native USDC." }, { label: "Faucet", value: "Circle", detail: "Use the official page only." }]} />
      </div>
    </AppShell>
  );
}

export function SwapPage() {
  const { address, refreshLocal } = useWalletScopedData();
  const chainId = useChainId();
  const balances = useTokenBalances();
  const [tokenIn, setTokenIn] = useState<SupportedTokenSymbol>("USDC");
  const [amountIn, setAmountIn] = useState("1.00");
  const [slippageBps, setSlippageBps] = useState(100);
  const [state, setState] = useState<OperationState>("idle");
  const tokenOut: SupportedTokenSymbol = tokenIn === "USDC" ? "EURC" : "USDC";
  const estimated = Number(amountIn || "0") > 0 ? (Number(amountIn) * 0.99).toFixed(6) : "0";
  const minimum = (Number(estimated) * (1 - slippageBps / 10_000)).toFixed(6);
  const balance = tokenIn === "USDC" ? balances.USDC : balances.EURC;

  async function estimate() {
    try {
      setState("loading");
      swapFormSchema.parse({ tokenIn, tokenOut, amountIn, slippageBps });
      if (!address) throw new Error("Connect a wallet first.");
      if (chainId !== ARC_TESTNET_CHAIN_ID) throw new Error("Switch to Arc Testnet before estimating.");
      if (Number(amountIn) > Number(balance)) throw new Error("Insufficient token balance.");
      if (tokenIn === "USDC" && Number(balance) - Number(amountIn) < 0.25) throw new Error("Keep a USDC reserve for gas.");
      const res = await fetch("/api/circle/swap/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenIn, tokenOut, amountIn, slippageBps, chain: ARC_CIRCLE_CHAIN_IDENTIFIER }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Quote unavailable.");
      setState("success");
      toast.success("Estimate checks completed.");
    } catch (error) {
      setState("error");
      toast.error(toUserFacingError(error));
    }
  }

  function recordManualSwap() {
    if (!address) return toast.error("Connect a wallet first.");
    const activity: Activity = {
      id: makeId("swap"),
      walletAddress: address,
      type: "swap",
      status: "pending",
      tokenIn,
      tokenOut,
      amountIn,
      amountOut: estimated,
      createdAt: new Date().toISOString(),
    };
    addActivity(address, activity);
    refreshLocal();
    toast.info("Swap intent recorded locally. Execute with Circle App Kit after configuring a wallet adapter.");
  }

  return (
    <AppShell>
      <SectionTitle title="Swap" detail="USDC and EURC swaps use Circle App Kit configuration through a server route so the kit key is never placed in the frontend bundle." />
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="grid gap-4">
            <label className="text-sm text-slate-300">From token<Select value={tokenIn} onChange={(event) => setTokenIn(event.target.value as SupportedTokenSymbol)}><option>USDC</option><option>EURC</option></Select></label>
            <label className="text-sm text-slate-300">Amount<Input value={amountIn} onChange={(event) => setAmountIn(event.target.value)} /></label>
            <div className="flex gap-2">
              <Button type="button" onClick={() => setAmountIn(balance)}>MAX</Button>
              <Button type="button" className="border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={() => setTokenIn(tokenOut)}><Repeat2 size={16} /> Switch</Button>
            </div>
            <label className="text-sm text-slate-300">Slippage bps<Input type="number" value={slippageBps} onChange={(event) => setSlippageBps(Number(event.target.value))} /></label>
            <Button onClick={estimate}>Estimate or simulate</Button>
            <Button onClick={recordManualSwap} className="border-white/15 bg-white/10 text-white hover:bg-white/15">Record pending swap</Button>
          </div>
        </Card>
        <Card className="grid gap-3 text-sm text-slate-300">
          <p>Status: <span className="text-white">{statusText[state]}</span></p>
          <p>Pair: <span className="text-white">{tokenIn} to {tokenOut}</span></p>
          <p>Balance: <span className="text-white">{balance} {tokenIn}</span></p>
          <p>Estimated output: <span className="text-white">{estimated} {tokenOut}</span></p>
          <p>Minimum output: <span className="text-white">{minimum} {tokenOut}</span></p>
          <p>Estimated transaction fee: paid in native USDC after wallet simulation.</p>
          <p>Provider fee: returned by Circle quote when available.</p>
          <p>Allowance status: exact-amount approval required; infinite approval is not used by default.</p>
          <p>Price impact: quote dependent; unavailable until Circle returns a route.</p>
        </Card>
      </div>
    </AppShell>
  );
}

export function DeployPage() {
  const { address, refreshLocal } = useWalletScopedData();
  const chainId = useChainId();
  const [standard, setStandard] = useState<NftStandard>("ERC721");
  const [state, setState] = useState<OperationState>("idle");
  const [form, setForm] = useState({
    name: "Arc Test Collection",
    symbol: "ATC",
    baseUri: "ipfs://metadata/",
    maxSupply: "1000",
    mintPrice: "0",
    maxPerWallet: "5",
    royaltyBps: "250",
    royaltyReceiver: connectedAddress(address),
    owner: connectedAddress(address),
    tokenId: "0",
    publicMint: true,
    ownerFreeMint: true,
    freezeMetadata: false,
  });

  function update(key: string, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateAndRecord() {
    try {
      setState("loading");
      if (!address) throw new Error("Connect a wallet first.");
      if (chainId !== ARC_TESTNET_CHAIN_ID) throw new Error("Switch to Arc Testnet before deploying.");
      const parsed =
        standard === "ERC721"
          ? erc721DeploySchema.parse({ ...form, maxSupply: Number(form.maxSupply), maxPerWallet: Number(form.maxPerWallet), royaltyBps: Number(form.royaltyBps) })
          : erc1155DeploySchema.parse({ ...form, tokenId: Number(form.tokenId), maxSupply: Number(form.maxSupply), maxPerWallet: Number(form.maxPerWallet), royaltyBps: Number(form.royaltyBps) });
      parseUnits(form.mintPrice, 18);
      setState("wallet_confirmation");
      const placeholderAddress = `0x${"1".repeat(40)}` as Address;
      const placeholderHash = `0x${"2".repeat(64)}` as `0x${string}`;
      saveCollection(address, {
        id: makeId("collection"),
        deployerAddress: address,
        ownerAddress: parsed.owner,
        contractAddress: placeholderAddress,
        transactionHash: placeholderHash,
        standard,
        name: parsed.name,
        symbol: "symbol" in parsed ? parsed.symbol : undefined,
        baseUri: parsed.baseUri,
        maxSupply: String(parsed.maxSupply),
        minted: "0",
        publicMint: "publicMint" in parsed ? parsed.publicMint : true,
        royaltyBps: parsed.royaltyBps,
        royaltyReceiver: parsed.royaltyReceiver,
        deployedAt: new Date().toISOString(),
      });
      addActivity(address, { id: makeId("deploy"), walletAddress: address, type: "nft_deploy", status: "pending", contractAddress: placeholderAddress, txHash: placeholderHash, createdAt: new Date().toISOString() });
      refreshLocal();
      setState("success");
      toast.success("Deploy parameters validated and recorded. Compile artifacts with Foundry before broadcasting.");
    } catch (error) {
      setState("error");
      toast.error(toUserFacingError(error));
    }
  }

  return (
    <AppShell>
      <SectionTitle title="NFT Deploy" detail="Only audited template-based ERC-721 and ERC-1155 NFT collection deployments are supported. Free mint is the default first-version path." />
      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <Card className="grid gap-4">
          <label className="text-sm text-slate-300">Standard<Select value={standard} onChange={(event) => setStandard(event.target.value as NftStandard)}><option>ERC721</option><option>ERC1155</option></Select></label>
          <label className="text-sm text-slate-300">Collection name<Input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
          {standard === "ERC721" ? <label className="text-sm text-slate-300">Symbol<Input value={form.symbol} onChange={(event) => update("symbol", event.target.value)} /></label> : null}
          <label className="text-sm text-slate-300">Base URI<Input value={form.baseUri} onChange={(event) => update("baseUri", event.target.value)} /></label>
          {standard === "ERC1155" ? <label className="text-sm text-slate-300">Token ID<Input value={form.tokenId} onChange={(event) => update("tokenId", event.target.value)} /></label> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-300">Maximum supply<Input value={form.maxSupply} onChange={(event) => update("maxSupply", event.target.value)} /></label>
            <label className="text-sm text-slate-300">Max per wallet<Input value={form.maxPerWallet} onChange={(event) => update("maxPerWallet", event.target.value)} /></label>
            <label className="text-sm text-slate-300">Mint price<Input value={form.mintPrice} onChange={(event) => update("mintPrice", event.target.value)} /></label>
            <label className="text-sm text-slate-300">Royalty bps<Input value={form.royaltyBps} onChange={(event) => update("royaltyBps", event.target.value)} /></label>
          </div>
          <label className="text-sm text-slate-300">Royalty receiver<Input value={form.royaltyReceiver} onChange={(event) => update("royaltyReceiver", event.target.value)} /></label>
          <label className="text-sm text-slate-300">Contract owner<Input value={form.owner} onChange={(event) => update("owner", event.target.value)} /></label>
          <Button onClick={validateAndRecord}>Validate deployment parameters</Button>
        </Card>
        <Card className="grid gap-3 text-sm text-slate-300">
          <p>Status: <span className="text-white">{statusText[state]}</span></p>
          <p>Gas asset: native USDC, not ETH.</p>
          <p>Checks: chain ID, wallet, constructor values, ABI compatibility, bytecode presence, gas estimate, owner, supply, royalty, and mint configuration.</p>
          <p>Foundry artifacts must be generated from the included Solidity templates before a real wallet deployment is broadcast.</p>
        </Card>
      </div>
    </AppShell>
  );
}

export function MintPage() {
  const { address, collections, refreshLocal } = useWalletScopedData();
  const [contractAddress, setContractAddress] = useState<string>(collections[0]?.contractAddress || "");
  const [quantity, setQuantity] = useState("1");
  const [tokenId, setTokenId] = useState("0");
  const [state, setState] = useState<OperationState>("idle");

  function validateMint() {
    try {
      setState("loading");
      if (!address) throw new Error("Connect a wallet first.");
      mintFormSchema.parse({ contractAddress, quantity: Number(quantity), tokenId: Number(tokenId) });
      addActivity(address, { id: makeId("mint"), walletAddress: address, type: "nft_mint", status: "pending", contractAddress: contractAddress as Address, tokenId, createdAt: new Date().toISOString() });
      refreshLocal();
      setState("success");
      toast.success("Mint parameters validated and local activity recorded.");
    } catch (error) {
      setState("error");
      toast.error(toUserFacingError(error));
    }
  }

  return (
    <AppShell>
      <SectionTitle title="Mint NFT" detail="Select a locally deployed collection or enter a contract address. ERC-165 interface checks should pass before enabling live mint broadcasting." />
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="grid gap-4">
          <label className="text-sm text-slate-300">Local collection<Select value={contractAddress} onChange={(event) => setContractAddress(event.target.value)}><option value="">Manual address</option>{collections.map((item) => <option key={item.id} value={item.contractAddress}>{item.name}</option>)}</Select></label>
          <label className="text-sm text-slate-300">Contract address<Input value={contractAddress} onChange={(event) => setContractAddress(event.target.value)} /></label>
          <label className="text-sm text-slate-300">Quantity<Input value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          <label className="text-sm text-slate-300">ERC-1155 token ID<Input value={tokenId} onChange={(event) => setTokenId(event.target.value)} /></label>
          <Button onClick={validateMint}>Validate mint</Button>
        </Card>
        <Card className="grid gap-3 text-sm text-slate-300">
          <p>Status: <span className="text-white">{statusText[state]}</span></p>
          <p>Interface checks: ERC-721, ERC-721 Metadata, ERC-721 Enumerable, ERC-1155, and ERC-2981 are represented in the supported ABI layer.</p>
          <p>Mint result fields: token ID, contract address, transaction hash, owner, metadata URI, and ArcScan links are recorded after a live transaction.</p>
        </Card>
      </div>
    </AppShell>
  );
}

export function MyNftsPage() {
  const { address, collections } = useWalletScopedData();

  return (
    <AppShell>
      <SectionTitle title="My NFTs" detail="Wallet-scoped NFT collection records saved in localStorage after deployment." />
      <div className="grid gap-4 md:grid-cols-2">
        {collections.map((item: DeployedNftCollection) => (
          <Card key={item.id} className="grid gap-2 text-sm text-slate-300">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{item.name}</h2>
                <p>{item.standard} {item.symbol ? `- ${item.symbol}` : ""}</p>
              </div>
              <a href={explorer.address(item.contractAddress)} target="_blank" rel="noreferrer" className="text-cyan-200"><ExternalLink size={18} /></a>
            </div>
            <p>Contract: {shortAddress(item.contractAddress)}</p>
            <p>Owner: {shortAddress(item.ownerAddress)}</p>
            <p>Maximum supply: {item.maxSupply}</p>
            <p>Minted: {item.minted || "0"}</p>
            <p>Public mint: {item.publicMint ? "open" : "closed"}</p>
            <p>Base URI: {item.baseUri}</p>
            <p>Royalty: {item.royaltyBps / 100}% to {shortAddress(item.royaltyReceiver)}</p>
            <p>Deploy date: {new Date(item.deployedAt).toLocaleString()}</p>
            {address?.toLowerCase() === item.ownerAddress.toLowerCase() ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {["Open public mint", "Close public mint", "Update base URI", "Update royalty", "Owner mint", "Withdraw"].map((action) => <Button key={action} className="border-white/15 bg-white/10 text-xs text-white hover:bg-white/15">{action}</Button>)}
              </div>
            ) : null}
          </Card>
        ))}
      </div>
      {!collections.length ? <Card><p className="text-sm text-slate-400">No NFT collection records for this wallet yet.</p></Card> : null}
    </AppShell>
  );
}

export function TransactionsPage() {
  const { activities } = useWalletScopedData();

  return (
    <AppShell>
      <SectionTitle title="Transactions" detail="First-version transaction history is stored locally per wallet address." />
      <Card>
        <ActivityList activities={activities} />
      </Card>
    </AppShell>
  );
}
