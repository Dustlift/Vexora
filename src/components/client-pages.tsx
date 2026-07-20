"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Copy, ExternalLink, RefreshCcw, Repeat2, Send } from "lucide-react";
import { createPublicClient, http, isAddress, isHex, type Address, type EIP1193Provider } from "viem";
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

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const statusText: Record<OperationState, string> = {
  idle: "Idle",
  loading: "Loading",
  wallet_confirmation: "Wallet confirmation",
  transaction_pending: "Transaction pending",
  success: "Success",
  error: "Error",
};

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

function validCollection(item: DeployedNftCollection) {
  return isAddress(item.contractAddress) && item.ownerAddress.toLowerCase() !== ZERO_ADDRESS && item.royaltyReceiver.toLowerCase() !== ZERO_ADDRESS;
}

function walletProvider() {
  return (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
}

function publicClientFromRpc(chain: Parameters<typeof createPublicClient>[0]["chain"]) {
  return createPublicClient({ chain, transport: http() });
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
  const [estimatedOut, setEstimatedOut] = useState("");
  const [minimumOut, setMinimumOut] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("Enter an amount to get a live quote.");
  const tokenOut: SupportedTokenSymbol = tokenIn === "USDC" ? "EURC" : "USDC";
  const slippagePercent = DEFAULT_SLIPPAGE_BPS / 100;
  const balance = tokenIn === "USDC" ? balances.USDC : balances.EURC;

  function setMaxAmount() {
    const value = tokenIn === "USDC" ? Math.max(Number(balance) - 0.25, 0) : Number(balance);
    setAmountIn(value > 0 ? value.toFixed(6).replace(/\.?0+$/, "") : "0");
  }

  async function buildSwapAdapter() {
    const provider = walletProvider();
    if (!provider) throw new Error("No browser wallet provider found.");
    const [{ createViemAdapterFromProvider }, { arcTestnet }] = await Promise.all([import("@circle-fin/adapter-viem-v2"), import("@/config/chains")]);
    return createViemAdapterFromProvider({
      provider,
      getPublicClient: () => publicClientFromRpc(arcTestnet),
    });
  }

  async function requestQuote() {
    try {
      setState("loading");
      swapFormSchema.parse({ tokenIn, tokenOut, amountIn, slippageBps: DEFAULT_SLIPPAGE_BPS });
      if (!address) throw new Error("Connect a wallet first.");
      if (chainId !== ARC_TESTNET_CHAIN_ID) throw new Error("Switch to Arc Testnet before getting a quote.");
      if (Number(amountIn) > Number(balance)) throw new Error("Insufficient token balance.");
      if (tokenIn === "USDC" && Number(balance) - Number(amountIn) < 0.25) throw new Error("Keep a USDC reserve for gas.");
      const [{ AppKit }] = await Promise.all([import("@circle-fin/app-kit")]);
      const adapter = await buildSwapAdapter();
      const kit = new AppKit();
      const estimate = await kit.estimateSwap({
        from: { adapter, chain: ARC_CIRCLE_CHAIN_IDENTIFIER },
        tokenIn,
        tokenOut,
        amountIn,
        config: { slippageBps: DEFAULT_SLIPPAGE_BPS },
      });
      setEstimatedOut(estimate.estimatedOutput.amount);
      setMinimumOut(estimate.stopLimit.amount);
      setQuoteMessage("Live quote ready.");
      setState("success");
    } catch (error) {
      setEstimatedOut("");
      setMinimumOut("");
      setQuoteMessage(toUserFacingError(error));
      setState("error");
      toast.error(toUserFacingError(error));
    }
  }

  async function submitSwap() {
    try {
      setState("loading");
      swapFormSchema.parse({ tokenIn, tokenOut, amountIn, slippageBps: DEFAULT_SLIPPAGE_BPS });
      if (!address) throw new Error("Connect a wallet first.");
      if (chainId !== ARC_TESTNET_CHAIN_ID) throw new Error("Switch to Arc Testnet before swapping.");
      if (Number(amountIn) > Number(balance)) throw new Error("Insufficient token balance.");
      const [{ AppKit }] = await Promise.all([import("@circle-fin/app-kit")]);
      const adapter = await buildSwapAdapter();
      const kit = new AppKit();
      setState("wallet_confirmation");
      const result = await kit.swap({
        from: { adapter, chain: ARC_CIRCLE_CHAIN_IDENTIFIER },
        tokenIn,
        tokenOut,
        amountIn,
        config: { slippageBps: DEFAULT_SLIPPAGE_BPS },
      });
      const txHash = result.txHash && isHex(result.txHash) ? result.txHash : undefined;
      addActivity(address, {
        id: makeId("swap"),
        walletAddress: address,
        type: "swap",
        status: "success",
        txHash,
        tokenIn,
        tokenOut,
        amountIn,
        amountOut: result.amountOut || estimatedOut,
        createdAt: new Date().toISOString(),
      });
      refreshLocal();
      setState("success");
      balances.refresh();
      toast.success("Swap submitted on Arc Testnet.");
    } catch (error) {
      setState("error");
      setQuoteMessage(toUserFacingError(error));
      toast.error(toUserFacingError(error));
    }
  }

  return (
    <AppShell>
      <div className="mx-auto grid max-w-xl gap-5">
        <Card className="grid gap-4 border-cyan-200/15 bg-slate-950/70">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle title="Swap" />
            <span className="rounded-md border border-cyan-200/15 bg-white/10 px-3 py-1 text-sm font-semibold text-cyan-100">%{slippagePercent}</span>
          </div>
          <div className="rounded-md border border-white/10 bg-[#070b18] p-4">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
              <span>Pay</span>
              <button type="button" onClick={setMaxAmount} className="rounded-md bg-cyan-300/10 px-2 py-1 font-semibold text-cyan-100 hover:bg-cyan-300/20">
                MAX
              </button>
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <Input value={amountIn} onChange={(event) => setAmountIn(event.target.value)} className="h-14 border-0 bg-transparent px-0 text-3xl" />
              <Select value={tokenIn} onChange={(event) => setTokenIn(event.target.value as SupportedTokenSymbol)} className="h-12">
                <option>USDC</option>
                <option>EURC</option>
              </Select>
            </div>
            <p className="mt-2 text-xs text-slate-400">Balance {Number(balance).toFixed(6)} {tokenIn}</p>
          </div>
          <button type="button" aria-label="Switch swap direction" className="mx-auto grid size-10 place-items-center rounded-md border border-cyan-200/15 bg-white/10 text-cyan-100 hover:bg-white/15" onClick={() => setTokenIn(tokenOut)}>
            <Repeat2 size={18} />
          </button>
          <div className="rounded-md border border-white/10 bg-[#070b18] p-4">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
              <span>Receive</span>
              <span>{tokenOut}</span>
            </div>
            <p className="min-h-10 text-3xl font-semibold text-white">{estimatedOut || "-"}</p>
            <p className="mt-2 text-xs text-slate-400">Minimum {minimumOut || "-"} {tokenOut}</p>
          </div>
          <p className="text-sm text-slate-300">{quoteMessage}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={requestQuote} disabled={state === "loading" || state === "wallet_confirmation" || state === "transaction_pending"} className="border-white/15 bg-white/10 text-white hover:bg-white/15">
              Get quote
            </Button>
            <Button onClick={submitSwap} disabled={!estimatedOut || state === "loading" || state === "wallet_confirmation" || state === "transaction_pending"} className="bg-gradient-to-r from-violet-400 via-indigo-500 to-cyan-300">
            Swap
            </Button>
          </div>
          <div className="grid gap-2 border-t border-white/10 pt-3 text-xs text-slate-400">
            <p>Status: <span className="text-white">{statusText[state]}</span></p>
            <p>Route: <span className="text-white">{tokenIn} to {tokenOut}</span></p>
            <p>Contracts: <span className="text-white">{shortAddress(ARC_TOKENS[tokenIn].address)} to {shortAddress(ARC_TOKENS[tokenOut].address)}</span></p>
          </div>
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
    name: "",
    symbol: "",
    baseUri: "",
    imageUri: "",
    maxSupply: "",
    mintPrice: "0",
    maxPerWallet: "",
    royaltyBps: "0",
    royaltyReceiver: "",
    owner: "",
    tokenId: "0",
    publicMint: true,
    ownerFreeMint: true,
    freezeMetadata: false,
  });

  function update(key: string, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function deployCollection() {
    try {
      setState("loading");
      if (!address || !walletClient || !publicClient) throw new Error("Connect a wallet first.");
      if (chainId !== ARC_TESTNET_CHAIN_ID) throw new Error("Switch to Arc Testnet before deploying.");
      const deployValues = {
        ...form,
        owner: form.owner || address,
        royaltyReceiver: form.royaltyReceiver || address,
      };
      setState("wallet_confirmation");
      const parsed =
        standard === "ERC721"
          ? erc721DeploySchema.parse({ ...deployValues, maxSupply: Number(form.maxSupply), maxPerWallet: Number(form.maxPerWallet), royaltyBps: Number(form.royaltyBps) })
          : erc1155DeploySchema.parse({ ...deployValues, tokenId: Number(form.tokenId), maxSupply: Number(form.maxSupply), maxPerWallet: Number(form.maxPerWallet), royaltyBps: Number(form.royaltyBps) });
      const hash =
        standard === "ERC721"
          ? await walletClient.deployContract({
              account: address,
              abi: erc721Abi,
              bytecode: erc721Bytecode,
              args: erc721ConstructorArgs(
                erc721DeploySchema.parse({ ...deployValues, maxSupply: Number(form.maxSupply), maxPerWallet: Number(form.maxPerWallet), royaltyBps: Number(form.royaltyBps) }),
              ),
            })
          : await walletClient.deployContract({
              account: address,
              abi: erc1155Abi,
              bytecode: erc1155Bytecode,
              args: erc1155ConstructorArgs(
                erc1155DeploySchema.parse({ ...deployValues, tokenId: Number(form.tokenId), maxSupply: Number(form.maxSupply), maxPerWallet: Number(form.maxPerWallet), royaltyBps: Number(form.royaltyBps) }),
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
        imageUri: form.imageUri || undefined,
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
      <SectionTitle title="NFT Deploy" detail="Create an ERC-721 or ERC-1155 collection directly from your connected wallet on Arc Testnet." />
      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <Card className="grid gap-4">
          <label className="text-sm text-slate-300">
            Standard
            <Select value={standard} onChange={(event) => setStandard(event.target.value as NftStandard)}>
              <option>ERC721</option>
              <option>ERC1155</option>
            </Select>
          </label>
          <label className="text-sm text-slate-300">Collection name<Input value={form.name} placeholder="Collection name" onChange={(event) => update("name", event.target.value)} /></label>
          {standard === "ERC721" ? <label className="text-sm text-slate-300">Symbol<Input value={form.symbol} placeholder="SYMBOL" onChange={(event) => update("symbol", event.target.value)} /></label> : null}
          <label className="text-sm text-slate-300">Base URI<Input value={form.baseUri} placeholder="ipfs://metadata/" onChange={(event) => update("baseUri", event.target.value)} /></label>
          <label className="text-sm text-slate-300">Collection image<Input value={form.imageUri} placeholder="ipfs://image.png or https://..." onChange={(event) => update("imageUri", event.target.value)} /></label>
          {standard === "ERC1155" ? <label className="text-sm text-slate-300">Token ID<Input value={form.tokenId} onChange={(event) => update("tokenId", event.target.value)} /></label> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-300">Maximum supply<Input value={form.maxSupply} placeholder="10000" onChange={(event) => update("maxSupply", event.target.value)} /></label>
            <label className="text-sm text-slate-300">Max per wallet<Input value={form.maxPerWallet} placeholder="5" onChange={(event) => update("maxPerWallet", event.target.value)} /></label>
            <label className="text-sm text-slate-300">Mint price<Input value={form.mintPrice} onChange={(event) => update("mintPrice", event.target.value)} /></label>
            <label className="text-sm text-slate-300">Royalty bps<Input value={form.royaltyBps} onChange={(event) => update("royaltyBps", event.target.value)} /></label>
          </div>
          <label className="text-sm text-slate-300">Royalty receiver<Input value={form.royaltyReceiver} placeholder="Connected wallet by default" onChange={(event) => update("royaltyReceiver", event.target.value)} /></label>
          <label className="text-sm text-slate-300">Contract owner<Input value={form.owner} placeholder="Connected wallet by default" onChange={(event) => update("owner", event.target.value)} /></label>
          <Button onClick={deployCollection} disabled={state === "wallet_confirmation" || state === "transaction_pending" || state === "loading"}>
            Deploy collection
          </Button>
        </Card>
        <Card className="grid gap-3 text-sm text-slate-300">
          <p>Status: <span className="text-white">{statusText[state]}</span></p>
          <p>Gas asset: native USDC, not ETH.</p>
          <p>Deploy result is saved to this browser after the wallet transaction is confirmed.</p>
          <p>Owner and royalty receiver use the connected wallet when left blank.</p>
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
      if (!target || !isAddress(target)) throw new Error(useSiteCollection ? "The Vexora collection is not ready for public mint yet." : "Enter a valid contract address.");
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
        metadataUri: localCollection?.imageUri || localCollection?.baseUri || (useSiteCollection ? VEXORA_CREATOR_COLLECTION.image : undefined),
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
      <SectionTitle title="Mint NFT" detail="Mint from an available Vexora collection or any collection contract on Arc Testnet." />
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="grid gap-4">
          <div className="overflow-hidden rounded-md border border-cyan-200/10 bg-slate-950/60">
            <Image src={VEXORA_CREATOR_COLLECTION.image} alt="Vexora Test Mint" width={720} height={420} className="h-56 w-full object-cover" />
            <div className="grid gap-2 p-4">
              <h2 className="text-xl font-semibold text-white">{VEXORA_CREATOR_COLLECTION.name}</h2>
              <p className="text-sm text-slate-300">Supply {VEXORA_CREATOR_COLLECTION.maxSupply.toLocaleString()} - mint price 0, network fee only.</p>
              <Button onClick={() => mintNft(true)} disabled={!siteCollectionAddress || state === "loading" || state === "wallet_confirmation" || state === "transaction_pending"}>
                Mint Test NFT
              </Button>
              {!siteCollectionAddress ? <p className="text-xs text-amber-200">This collection is being prepared for public mint.</p> : null}
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
          <p>Vexora collection: <span className="text-white">{siteCollectionAddress ? shortAddress(siteCollectionAddress) : "preparing"}</span></p>
          <p>Selected contract: <span className="text-white">{isAddress(contractAddress) ? shortAddress(contractAddress as Address) : "none"}</span></p>
          <p>Every successful mint records the transaction hash and contract address in the connected wallet profile.</p>
        </Card>
      </div>
    </AppShell>
  );
}

export function MyNftsPage() {
  const { collections, activities } = useWalletScopedData();
  const minted = activities.filter((item) => item.type === "nft_mint" && item.status === "success" && item.txHash && item.contractAddress);
  const visibleCollections = collections.filter(validCollection);
  const items = [
    ...minted.map((item) => ({
      id: item.id,
      image: item.metadataUri || VEXORA_CREATOR_COLLECTION.image,
      alt: "Minted NFT",
      href: explorer.tx(item.txHash!),
    })),
    ...visibleCollections.map((item) => ({
      id: item.id,
      image: item.imageUri || VEXORA_CREATOR_COLLECTION.image,
      alt: item.name,
      href: explorer.address(item.contractAddress),
    })),
  ];

  return (
    <AppShell>
      <SectionTitle title="My NFTs" detail="Minted NFTs and deployed collections from this wallet." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <a key={item.id} href={item.href} target="_blank" rel="noreferrer" aria-label={`Open ${item.alt} on ArcScan`} className="group block overflow-hidden rounded-lg border border-cyan-200/10 bg-slate-950/60 transition hover:-translate-y-1 hover:border-cyan-200/35">
            <Image src={item.image} alt={item.alt} width={640} height={640} className="aspect-square w-full object-cover" unoptimized />
          </a>
        ))}
      </div>
      {!items.length ? <Card><p className="text-sm text-slate-400">No minted NFTs or deployed collections for this wallet yet.</p></Card> : null}
    </AppShell>
  );
}

export function ProfilePage() {
  const { address, activities, collections, refreshLocal } = useWalletScopedData();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const minted = activities.filter((item) => item.type === "nft_mint" && item.status === "success" && item.contractAddress);
  const visibleCollections = collections.filter(validCollection);
  const [transfer, setTransfer] = useState({
    standard: "ERC721" as NftStandard,
    contractAddress: minted[0]?.contractAddress || visibleCollections[0]?.contractAddress || "",
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
          <p>Collections deployed: <span className="text-white">{visibleCollections.length}</span></p>
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
