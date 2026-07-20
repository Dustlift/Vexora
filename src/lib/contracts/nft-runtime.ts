import { isAddress, parseUnits, type Address, type Hex } from "viem";
import erc721Artifact from "@/generated/contracts/ArcErc721Collection.json";
import erc1155Artifact from "@/generated/contracts/ArcErc1155Collection.json";
import type { Erc1155DeployInput, Erc721DeployInput } from "@/validators/forms";

export const erc721Abi = erc721Artifact.abi;
export const erc1155Abi = erc1155Artifact.abi;
export const erc721Bytecode = erc721Artifact.bytecode as Hex;
export const erc1155Bytecode = erc1155Artifact.bytecode as Hex;

export function erc721ConstructorArgs(input: Erc721DeployInput) {
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

export function erc1155ConstructorArgs(input: Erc1155DeployInput) {
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

export function normalizeConfiguredAddress(value?: string) {
  return value && isAddress(value) ? (value as Address) : undefined;
}
