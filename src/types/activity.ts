import type { Address, Hex } from "viem";
import type { SupportedTokenSymbol } from "@/config/tokens";

export type ActivityType =
  | "swap"
  | "nft_deploy"
  | "nft_mint"
  | "nft_admin_action"
  | "faucet_redirect";

export type ActivityStatus = "pending" | "success" | "failed";

export type Activity = {
  id: string;
  walletAddress: Address;
  type: ActivityType;
  status: ActivityStatus;
  txHash?: Hex;
  contractAddress?: Address;
  tokenId?: string;
  tokenIn?: SupportedTokenSymbol;
  tokenOut?: SupportedTokenSymbol;
  amountIn?: string;
  amountOut?: string;
  errorMessage?: string;
  metadataUri?: string;
  recipientAddress?: Address;
  createdAt: string;
};

export type NftStandard = "ERC721" | "ERC1155";

export type DeployedNftCollection = {
  id: string;
  deployerAddress: Address;
  ownerAddress: Address;
  contractAddress: Address;
  transactionHash: Hex;
  blockNumber?: string;
  standard: NftStandard;
  name: string;
  symbol?: string;
  baseUri: string;
  maxSupply: string;
  minted?: string;
  publicMint?: boolean;
  royaltyBps: number;
  royaltyReceiver: Address;
  deployedAt: string;
};

export type OperationState =
  | "idle"
  | "loading"
  | "wallet_confirmation"
  | "transaction_pending"
  | "success"
  | "error";
