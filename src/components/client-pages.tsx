"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Copy, ExternalLink, RefreshCcw, Repeat2, Send, Sparkles } from "lucide-react";
import { isAddress, type Address } from "viem";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { AppShell } from "@/components/app-shell";
import { MetricGrid } from "@/components/metric-grid";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { ARC_CIRCLE_CHAIN_IDENTIFIER, ARC_TESTNET_CHAIN_ID, ARC_TESTNET_FAUCET_URL } from "@/config/chains";
import { explorer } from "@/config/explorer";
import { DEFAULT_SLIPPAGE_BPS, VEXORA_CREATOR_COLLECTION } from "@/config/nft";
import { ARC_TOKENS, type SupportedTokenSymbol } from "@/config/tokens";
import { useTokenBalances } from "@/hooks/use-token-balances";
import { toUserFacingError } from "@/lib/arc/errors";
import {
  erc1155Abi,
  erc1155Bytecode,
  erc1155ConstructorArgs,
  erc721Abi,
  erc721Bytecode,
  erc721ConstructorArgs,
  normalizeConfiguredAddress,
} from "@/lib/contracts/nft-runtime";
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
            {activity.contractAddress ? <p className="mt-2 text-xs text-slate-300">Contract: {shortAddress(activity.contractAddress)}</p> : null}
            {activity.tokenId ? <p className="text-xs text-slate-300">Token ID: {activity.tokenId}</p> : null}
            {activity.recipientAddress ? <p className="text-xs text-slate-300">Recipient: {shortAddress(activity.recipientAddress)}</p> : null}
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

function selectedCollection(collections: DeployedNftCollection[], address: string) {
  return collections.find((item) => item.contractAddress.toLowerCase() === address.toLowerCase());
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
      <SectionTitle title="Faucet" detail="This page copies your address and opens the official Circle Faucet in a new tab." />
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <p className="text-sm text-slate-400">Connected wallet</p>
          <div className="mt-3 flex items-center gap-2 text-white">
            <span>{shortAddress(address)}</span>
            {address ? (
              <button aria-label="Copy address" onClick={() => navigator.clipboard.writeText(address).then(() => toast.success("Address copied"))}>
                <Copy size={16} />
              </button>
            ) : null}
          </div>
          <div className="mt-5 grid gap-3">
            <Button onClick={() => openFaucet("USDC")}>Test USDC</Button>
            <Button onClick={() => openFaucet("EURC")} className="bg-cyan-200 hover:bg-cyan-100">
              Test EURC
            </Button>
            <Button onClick={balances.refresh} className="border-white/15 bg-white/10 text-white hover:bg-white/15">
              <RefreshCcw size={16} /> Refresh balances
            </Button>
          </div>
        </Card>
        <MetricGrid
          items={[
            { label: "USDC", value: balances.USDC, detail: "ERC-20 interface uses 6 decimals." },
            { label: "EURC", value: balances.EURC, detail: "ERC-20 interface uses 6 decimals." },
            { label: "Gas token", value: balances.nativeGas, detail: "Arc Testnet gas is paid with native USDC." },
            { label: "Faucet", value: "Circle", detail: "Use the official page only." },
          ]}
        />
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
  const [state, setState] = useState<OperationState>("idle");
  const tokenOut: SupportedTokenSymbol = tokenIn === "USDC" ? "EURC" : "USDC";
  const estimated = Number(amountIn || "0") > 0 ? (Number(amountIn) * 0.99).toFixed(6) : "0";
  const slippagePercent = DEFAULT_SLIPPAGE_BPS / 100;
  const balance = tokenIn === "USDC" ? balances.USDC : balances.EURC;

  async function submitSwap() {
    try {
      setState("loading");
      swapFormSchema.parse({ tokenIn, tokenOut, amountIn, slippageBps: DEFAULT_SLIPPAGE_BPS });
      if (!address) throw new Error("Connect a wallet first.");
      if (chainId !== ARC_TESTNET_CHAIN_ID) throw new Error("Switch to Arc Testnet before swapping.");
      if (Number(amountIn) > Number(balance)) throw new Error("Insufficient token balance.");
      if (tokenIn === "USDC" && Number(balance) - Number(amountIn) < 0.25) throw new Error("Keep a USDC reserve for gas.");
      const res = await fetch("/api/circle/swap/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenIn, tokenOut, amountIn, slippageBps: DEFAULT_SLIPPAGE_BPS, chain: ARC_CIRCLE_CHAIN_IDENTIFIER }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Circle quote unavailable.");
      addActivity(address, {
        id: makeId("swap"),
        walletAddress: address,
        type: "swap",
        status: "pending",
        tokenIn,
        tokenOut,
        amountIn,
        amountOut: estimated,
        createdAt: new Date().toISOString(),
      });
      refreshLocal();
      setState("success");
      toast.success("Swap quote check completed. Circle signing is ready once the production adapter is enabled.");
    } catch (error) {
      setState("error");
      toast.error(toUserFacingError(error));
    }
  }

  return (
    <AppShell>
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="grid gap-5">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle title="Swap" />
            <span className="rounded-md border border-cyan-200/15 bg-white/10 px-3 py-1 text-sm font-semibold text-cyan-100">%{slippagePercent}</span>
          </div>
          <label className="text-sm text-slate-300">
            From
            <Select value={tokenIn} onChange={(event) => setTokenIn(event.target.value as SupportedTokenSymbol)}>
              <option>USDC</option>
              <option>EURC</option>
            </Select>
          </label>
          <label className="text-sm text-slate-300">
            Amount
            <Input value={amountIn} onChange={(event) => setAmountIn(event.target.value)} />
          </label>
          <div className="flex items-center justify-between rounded-md border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">
            <span>{tokenOut}</span>
            <span className="text-white">{estimated}</span>
          </div>
          <button type="button" className="inline-flex items-center gap-2 text-sm text-cyan-200" onClick={() => setTokenIn(tokenOut)}>
            <Repeat2 size={16} /> Switch pair
          </button>
          <Button onClick={submitSwap} disabled={state === "loading" || state === "wallet_confirmation" || state === "transaction_pending"} className="bg-gradient-to-r from-violet-400 via-indigo-500 to-cyan-300">
            Swap
          </Button>
        </Card>
        <Card className="grid gap-3 text-sm text-slate-300">
          <p>Status: <span className="text-white">{statusText[state]}</span></p>
          <p>Pair: <span className="text-white">{tokenIn} to {tokenOut}</span></p>
          <p>Balance: <span className="text-white">{balance} {tokenIn}</span></p>
          <p>Auto slippage: <span className="text-white">%{slippagePercent}</span></p>
          <p>Token in: <span className="text-white">{shortAddress(ARC_TOKENS[tokenIn].address)}</span></p>
          <p>Token out: <span className="text-white">{shortAddress(ARC_TOKENS[tokenOut].address)}</span></p>
        </Card>
      </div>
    </AppShell>
  );
}

export function DeployPage() {
  const { address, refreshLocal } = useWalletScopedData();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [standard, setStandard] = useState<NftStandard>("ERC721");
  const [state, setState] = useState<OperationState>("idle");
  const [form, setForm] = useState({
    name: "Vexora Early Creator",
    symbol: "VEC",
    baseUri: "ipfs://metadata/",
    maxSupply: "10000",
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

  function useSiteCollectionPreset() {
    setStandard("ERC721");
    setForm((current) => ({
      ...current,
      name: VEXORA_CREATOR_COLLECTION.name,
      symbol: VEXORA_CREATOR_COLLECTION.symbol,
      baseUri: "ipfs://vexora-early-creator/",
      maxSupply: String(VEXORA_CREATOR_COLLECTION.maxSupply),
      mintPrice: VEXORA_CREATOR_COLLECTION.mintPrice,
      maxPerWallet: "1",
      royaltyReceiver: connectedAddress(address),
      owner: connectedAddress(address),
      publicMint: true,
    }));
  }

  async function deployCollection() {
    try {
      setState("loading");
      if (!address || !walletClient || !publicClient) throw new Error("Connect a wallet first.");
      if (chainId !== ARC_TESTNET_CHAIN_ID) throw new Error("Switch to Arc Testnet before deploying.");
      setState("wallet_confirmation");
      const parsed =
        standard === "ERC721"
          ? erc721DeploySchema.parse({ ...form, maxSupply: Number(form.maxSupply), maxPerWallet: Number(form.maxPerWallet), royaltyBps: Number(form.royaltyBps) })
          : erc1155DeploySchema.parse({ ...form, tokenId: Number(form.tokenId), maxSupply: Number(form.maxSupply), maxPerWallet: Number(form.maxPerWallet), royaltyBps: Number(form.royaltyBps) });
      const hash =
        standard === "ERC721"
          ? await walletClient.deployContract({
              account: address,
              abi: erc721Abi,
              bytecode: erc721Bytecode,
              args: erc721ConstructorArgs(
                erc721DeploySchema.parse({ ...form, maxSupply: Number(form.maxSupply), maxPerWallet: Number(form.maxPerWallet), royaltyBps: Number(form.royaltyBps) }),
              ),
            })
          : await walletClient.deployContract({
              account: address,
              abi: erc1155Abi,
              bytecode: erc1155Bytecode,
              args: erc1155ConstructorArgs(
                erc1155DeploySchema.parse({ ...form, tokenId: Number(form.tokenId), maxSupply: Number(form.maxSupply), maxPerWallet: Number(form.maxPerWallet), royaltyBps: Number(form.royaltyBps) }),
              ),
            });
      setState("transaction_pending");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const contractAddress = receipt.contractAddress;
      if (!contractAddress) throw new Error("Deployment receipt did not include a contract address.");
      saveCollection(address, {
        id: makeId("collection"),
        deployerAddress: address,
        ownerAddress: parsed.owner,
        contractAddress,
        transactionHash: hash,
        blockNumber: receipt.blockNumber.toString(),
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
      addActivity(address, { id: makeId("deploy"), walletAddress: address, type: "nft_deploy", status: "success", contractAddress, txHash: hash, createdAt: new Date().toISOString() });
      refreshLocal();
      setState("success");
      toast.success(`Collection deployed: ${shortAddress(contractAddress)}`);
    } catch (error) {
      setState("error");
      toast.error(toUserFacingError(error));
    }
  }

  return (
    <AppShell>
      <SectionTitle title="NFT Deploy" detail="Deploy template-based ERC-721 or ERC-1155 collections directly from your connected wallet on Arc Testnet." />
      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <Card className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="min-w-56 flex-1 text-sm text-slate-300">
              Standard
              <Select value={standard} onChange={(event) => setStandard(event.target.value as NftStandard)}>
                <option>ERC721</option>
                <option>ERC1155</option>
              </Select>
            </label>
            <Button type="button" onClick={useSiteCollectionPreset} className="border-white/15 bg-white/10 text-white hover:bg-white/15">
              <Sparkles size={16} /> Early Creator preset
            </Button>
          </div>
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
          <Button onClick={deployCollection} disabled={state === "wallet_confirmation" || state === "transaction_pending" || state === "loading"}>
            Deploy collection
          </Button>
        </Card>
        <Card className="grid gap-3 text-sm text-slate-300">
          <p>Status: <span className="text-white">{statusText[state]}</span></p>
          <p>Gas asset: native USDC, not ETH.</p>
          <p>Deploy result is saved locally with contract address, transaction hash, owner, supply, royalty, and mint settings.</p>
          <p>For the public Vexora collection, deploy the Early Creator preset once, then set its address as <span className="text-white">NEXT_PUBLIC_VEXORA_CREATOR_CONTRACT_ADDRESS</span> on Vercel.</p>
        </Card>
      </div>
    </AppShell>
  );
}

export function MintPage() {
  const { address, collections, refreshLocal } = useWalletScopedData();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const siteCollectionAddress = normalizeConfiguredAddress(VEXORA_CREATOR_COLLECTION.contractAddress);
  const [contractAddress, setContractAddress] = useState<string>(siteCollectionAddress || collections[0]?.contractAddress || "");
  const [standard, setStandard] = useState<NftStandard>("ERC721");
  const [quantity, setQuantity] = useState("1");
  const [tokenId, setTokenId] = useState("0");
  const [state, setState] = useState<OperationState>("idle");
  const localCollection = selectedCollection(collections, contractAddress);

  async function mintNft(useSiteCollection = false) {
    try {
      setState("loading");
      if (!address || !walletClient || !publicClient) throw new Error("Connect a wallet first.");
      if (chainId !== ARC_TESTNET_CHAIN_ID) throw new Error("Switch to Arc Testnet before minting.");
      const target = useSiteCollection ? siteCollectionAddress : (contractAddress as Address);
      if (!target || !isAddress(target)) throw new Error(useSiteCollection ? "Vexora collection address is not configured yet." : "Enter a valid contract address.");
      const parsed = mintFormSchema.parse({ contractAddress: target, quantity: Number(quantity), tokenId: Number(tokenId) });
      const abi = standard === "ERC1155" ? erc1155Abi : erc721Abi;
      const price = await publicClient.readContract({ address: parsed.contractAddress, abi, functionName: "mintPrice" }).catch(() => BigInt(0));
      const value = (price as bigint) * BigInt(parsed.quantity);
      setState("wallet_confirmation");
      const hash = await walletClient.writeContract({
        account: address,
        address: parsed.contractAddress,
        abi,
        functionName: "mint",
        args: [BigInt(parsed.quantity)],
        value,
      });
      setState("transaction_pending");
      await publicClient.waitForTransactionReceipt({ hash });
      const activity: Activity = {
        id: makeId("mint"),
        walletAddress: address,
        type: "nft_mint",
        status: "success",
        contractAddress: parsed.contractAddress,
        tokenId: standard === "ERC1155" ? String(parsed.tokenId || 0) : undefined,
        txHash: hash,
        metadataUri: localCollection?.baseUri || (useSiteCollection ? VEXORA_CREATOR_COLLECTION.image : undefined),
        createdAt: new Date().toISOString(),
      };
      addActivity(address, activity);
      refreshLocal();
      setState("success");
      toast.success("NFT minted on Arc Testnet.");
    } catch (error) {
      setState("error");
      toast.error(toUserFacingError(error));
    }
  }

  return (
    <AppShell>
      <SectionTitle title="Mint NFT" detail="Mint from the Vexora Early Creator collection or any locally deployed collection contract on Arc Testnet." />
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="grid gap-4">
          <div className="overflow-hidden rounded-md border border-cyan-200/10 bg-slate-950/60">
            <Image src={VEXORA_CREATOR_COLLECTION.image} alt="Vexora Early Creator" width={720} height={420} className="h-56 w-full object-cover" />
            <div className="grid gap-2 p-4">
              <h2 className="text-xl font-semibold text-white">{VEXORA_CREATOR_COLLECTION.name}</h2>
              <p className="text-sm text-slate-300">Supply {VEXORA_CREATOR_COLLECTION.maxSupply.toLocaleString()} - mint price 0, network fee only.</p>
              <Button onClick={() => mintNft(true)} disabled={!siteCollectionAddress || state === "loading" || state === "wallet_confirmation" || state === "transaction_pending"}>
                Mint Early Creator
              </Button>
              {!siteCollectionAddress ? <p className="text-xs text-amber-200">Set NEXT_PUBLIC_VEXORA_CREATOR_CONTRACT_ADDRESS on Vercel after deploying the preset.</p> : null}
            </div>
          </div>
          <label className="text-sm text-slate-300">
            Local collection
            <Select value={contractAddress} onChange={(event) => setContractAddress(event.target.value)}>
              <option value="">Manual address</option>
              {collections.map((item) => <option key={item.id} value={item.contractAddress}>{item.name}</option>)}
            </Select>
          </label>
          <label className="text-sm text-slate-300">Standard<Select value={standard} onChange={(event) => setStandard(event.target.value as NftStandard)}><option>ERC721</option><option>ERC1155</option></Select></label>
          <label className="text-sm text-slate-300">Contract address<Input value={contractAddress} onChange={(event) => setContractAddress(event.target.value)} /></label>
          <label className="text-sm text-slate-300">Quantity<Input value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          {standard === "ERC1155" ? <label className="text-sm text-slate-300">ERC-1155 token ID<Input value={tokenId} onChange={(event) => setTokenId(event.target.value)} /></label> : null}
          <Button onClick={() => mintNft(false)}>Mint selected collection</Button>
        </Card>
        <Card className="grid gap-3 text-sm text-slate-300">
          <p>Status: <span className="text-white">{statusText[state]}</span></p>
          <p>Vexora collection: <span className="text-white">{siteCollectionAddress ? shortAddress(siteCollectionAddress) : "not configured"}</span></p>
          <p>Selected contract: <span className="text-white">{isAddress(contractAddress) ? shortAddress(contractAddress as Address) : "none"}</span></p>
          <p>Every successful mint records the transaction hash and contract address in the connected wallet profile.</p>
        </Card>
      </div>
    </AppShell>
  );
}

export function MyNftsPage() {
  const { address, collections, activities } = useWalletScopedData();
  const minted = activities.filter((item) => item.type === "nft_mint");

  return (
    <AppShell>
      <SectionTitle title="My NFTs" detail="Wallet-scoped NFT records saved after successful mints and collection deployments." />
      <div className="grid gap-4 md:grid-cols-2">
        {minted.map((item) => (
          <Card key={item.id} className="grid gap-2 text-sm text-slate-300">
            <h2 className="text-lg font-semibold text-white">Minted NFT</h2>
            <p>Contract: {item.contractAddress ? shortAddress(item.contractAddress) : "-"}</p>
            <p>Token ID: {item.tokenId || "see transaction logs"}</p>
            <p>Date: {new Date(item.createdAt).toLocaleString()}</p>
            {item.txHash ? <a href={explorer.tx(item.txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-200">Transaction <ExternalLink size={14} /></a> : null}
          </Card>
        ))}
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
            <p>Public mint: {item.publicMint ? "open" : "closed"}</p>
            <p>Royalty: {item.royaltyBps / 100}% to {shortAddress(item.royaltyReceiver)}</p>
            {address?.toLowerCase() === item.ownerAddress.toLowerCase() ? <p className="text-cyan-100">Owner controls are available through the deployed contract wallet interface.</p> : null}
          </Card>
        ))}
      </div>
      {!collections.length && !minted.length ? <Card><p className="text-sm text-slate-400">No NFT records for this wallet yet.</p></Card> : null}
    </AppShell>
  );
}

export function ProfilePage() {
  const { address, activities, collections, refreshLocal } = useWalletScopedData();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const minted = activities.filter((item) => item.type === "nft_mint");
  const [transfer, setTransfer] = useState({
    standard: "ERC721" as NftStandard,
    contractAddress: minted[0]?.contractAddress || collections[0]?.contractAddress || "",
    tokenId: minted[0]?.tokenId || "1",
    quantity: "1",
    recipient: "",
  });
  const nativeGas = useMemo(() => activities.find((item) => item.type === "swap")?.amountIn, [activities]);
  const [state, setState] = useState<OperationState>("idle");

  function updateTransfer(key: string, value: string) {
    setTransfer((current) => ({ ...current, [key]: value }));
  }

  async function transferNft() {
    try {
      setState("loading");
      if (!address || !walletClient || !publicClient) throw new Error("Connect a wallet first.");
      if (chainId !== ARC_TESTNET_CHAIN_ID) throw new Error("Switch to Arc Testnet before transferring.");
      if (!isAddress(transfer.contractAddress)) throw new Error("Enter a valid NFT contract address.");
      if (!isAddress(transfer.recipient)) throw new Error("Enter a valid recipient address.");
      setState("wallet_confirmation");
      const hash =
        transfer.standard === "ERC721"
          ? await walletClient.writeContract({
              account: address,
              address: transfer.contractAddress as Address,
              abi: erc721Abi,
              functionName: "safeTransferFrom",
              args: [address, transfer.recipient as Address, BigInt(transfer.tokenId)],
            })
          : await walletClient.writeContract({
              account: address,
              address: transfer.contractAddress as Address,
              abi: erc1155Abi,
              functionName: "safeTransferFrom",
              args: [address, transfer.recipient as Address, BigInt(transfer.tokenId), BigInt(transfer.quantity), "0x"],
            });
      setState("transaction_pending");
      await publicClient.waitForTransactionReceipt({ hash });
      addActivity(address, {
        id: makeId("transfer"),
        walletAddress: address,
        type: "nft_admin_action",
        status: "success",
        txHash: hash,
        contractAddress: transfer.contractAddress as Address,
        tokenId: transfer.tokenId,
        recipientAddress: transfer.recipient as Address,
        createdAt: new Date().toISOString(),
      });
      refreshLocal();
      setState("success");
      toast.success("NFT transferred on Arc Testnet.");
    } catch (error) {
      setState("error");
      toast.error(toUserFacingError(error));
    }
  }

  return (
    <AppShell>
      <SectionTitle title="Profile" detail="Review your local NFT activity and transfer owned NFTs from the connected wallet." />
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="grid gap-3 text-sm text-slate-300">
          <p>Wallet: <span className="text-white">{shortAddress(address)}</span></p>
          <p>NFT mints: <span className="text-white">{minted.length}</span></p>
          <p>Collections deployed: <span className="text-white">{collections.length}</span></p>
          <p>Last swap input: <span className="text-white">{nativeGas || "-"}</span></p>
        </Card>
        <Card className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle title="Transfer NFT" />
            <Send className="text-cyan-200" size={22} />
          </div>
          <label className="text-sm text-slate-300">Standard<Select value={transfer.standard} onChange={(event) => updateTransfer("standard", event.target.value)}><option>ERC721</option><option>ERC1155</option></Select></label>
          <label className="text-sm text-slate-300">Contract address<Input value={transfer.contractAddress} onChange={(event) => updateTransfer("contractAddress", event.target.value)} /></label>
          <label className="text-sm text-slate-300">Token ID<Input value={transfer.tokenId} onChange={(event) => updateTransfer("tokenId", event.target.value)} /></label>
          {transfer.standard === "ERC1155" ? <label className="text-sm text-slate-300">Quantity<Input value={transfer.quantity} onChange={(event) => updateTransfer("quantity", event.target.value)} /></label> : null}
          <label className="text-sm text-slate-300">Recipient<Input value={transfer.recipient} onChange={(event) => updateTransfer("recipient", event.target.value)} /></label>
          <Button onClick={transferNft} disabled={state === "loading" || state === "wallet_confirmation" || state === "transaction_pending"}>
            Transfer
          </Button>
          <p className="text-sm text-slate-300">Status: <span className="text-white">{statusText[state]}</span></p>
        </Card>
      </div>
      <Card className="mt-5">
        <SectionTitle title="NFT Activity" />
        <ActivityList activities={minted} />
      </Card>
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
