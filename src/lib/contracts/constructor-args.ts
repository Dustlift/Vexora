import { parseUnits, type Address } from "viem";
import type { Erc1155DeployInput, Erc721DeployInput } from "@/validators/forms";

export function encodeErc721ConstructorArgs(input: Erc721DeployInput) {
  return [
    input.name,
    input.symbol,
    input.baseUri,
    BigInt(input.maxSupply),
    parseUnits(input.mintPrice, 18),
    BigInt(input.maxPerWallet),
    input.publicMint,
    input.royaltyBps,
    input.royaltyReceiver as Address,
    input.owner as Address,
  ] as const;
}

export function encodeErc1155ConstructorArgs(input: Erc1155DeployInput) {
  return [
    input.name,
    input.baseUri,
    BigInt(input.tokenId),
    BigInt(input.maxSupply),
    parseUnits(input.mintPrice, 18),
    BigInt(input.maxPerWallet),
    true,
    input.royaltyBps,
    input.royaltyReceiver as Address,
    input.owner as Address,
  ] as const;
}
