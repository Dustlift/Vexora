import { ARC_TESTNET_CHAIN_ID } from "@/config/chains";

export function isArcTestnet(chainId?: number) {
  return chainId === ARC_TESTNET_CHAIN_ID;
}

export function hasEnoughGasBalance(nativeGasBalance: number, requiredReserve = 0.25) {
  return nativeGasBalance >= requiredReserve;
}

export function willKeepUsdcGasReserve(usdcBalance: number, amountIn: number, reserve = 0.25) {
  return usdcBalance - amountIn >= reserve;
}
