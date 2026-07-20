import type { Address } from "viem";

export const DEFAULT_SLIPPAGE_BPS = 300;

export const VEXORA_CREATOR_COLLECTION = {
  name: "Vexora Early Creator",
  symbol: "VEC",
  maxSupply: 10_000,
  mintPrice: "0",
  image: "/vexora-logo.png",
  contractAddress: process.env.NEXT_PUBLIC_VEXORA_CREATOR_CONTRACT_ADDRESS as Address | undefined,
};
