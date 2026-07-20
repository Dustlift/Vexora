import { ARC_CONTRACTS } from "./contracts";

export type SupportedTokenSymbol = "USDC" | "EURC";

export const ARC_TOKENS = {
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    address: ARC_CONTRACTS.usdc,
    isNativeGasToken: true,
    nativeDecimals: 18,
  },
  EURC: {
    symbol: "EURC",
    name: "Euro Coin",
    decimals: 6,
    address: ARC_CONTRACTS.eurc,
    isNativeGasToken: false,
  },
} as const;
