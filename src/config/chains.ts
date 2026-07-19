import type { Chain } from "viem";

export const ARC_TESTNET_CHAIN_ID = 5_042_002;
export const ARC_TESTNET_RPC_URL = "https://rpc.testnet.arc.network";
export const ARC_TESTNET_WS_URL = "wss://rpc.testnet.arc.network";
export const ARC_TESTNET_EXPLORER_URL = "https://testnet.arcscan.app";
export const ARC_TESTNET_FAUCET_URL = "https://faucet.circle.com/?allow=true";
export const ARC_CIRCLE_CHAIN_IDENTIFIER = "Arc_Testnet";

export const arcTestnet = {
  id: ARC_TESTNET_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "USDC",
    symbol: "USDC",
  },
  rpcUrls: {
    default: { http: [ARC_TESTNET_RPC_URL], webSocket: [ARC_TESTNET_WS_URL] },
    public: { http: [ARC_TESTNET_RPC_URL], webSocket: [ARC_TESTNET_WS_URL] },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: ARC_TESTNET_EXPLORER_URL,
      apiUrl: `${ARC_TESTNET_EXPLORER_URL}/api`,
    },
  },
  testnet: true,
} as const satisfies Chain;

export const walletAddEthereumChainParams = {
  chainId: `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`,
  chainName: "Arc Testnet",
  nativeCurrency: arcTestnet.nativeCurrency,
  rpcUrls: [ARC_TESTNET_RPC_URL],
  blockExplorerUrls: [ARC_TESTNET_EXPLORER_URL],
};
