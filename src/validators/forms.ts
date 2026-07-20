import { isAddress } from "viem";
import { z } from "zod";

const address = z.string().refine(isAddress, "Enter a valid EVM address.");
const positiveDecimal = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, "Enter a valid token amount.")
  .refine((value) => Number(value) >= 0, "Amount cannot be negative.");

export const erc721DeploySchema = z.object({
  name: z.string().min(2).max(80),
  symbol: z.string().min(1).max(12),
  baseUri: z.string().url().or(z.string().startsWith("ipfs://")),
  maxSupply: z.coerce.number().int().min(1).max(100_000),
  mintPrice: positiveDecimal.default("0"),
  maxPerWallet: z.coerce.number().int().min(1).max(10_000),
  ownerFreeMint: z.boolean(),
  publicMint: z.boolean(),
  freezeMetadata: z.boolean(),
  royaltyBps: z.coerce.number().int().min(0).max(1_000),
  royaltyReceiver: address,
  owner: address,
});

export const erc1155DeploySchema = z.object({
  name: z.string().min(2).max(80),
  baseUri: z.string().url().or(z.string().startsWith("ipfs://")),
  tokenId: z.coerce.number().int().min(0),
  maxSupply: z.coerce.number().int().min(1).max(100_000),
  mintPrice: positiveDecimal.default("0"),
  maxPerWallet: z.coerce.number().int().min(1).max(10_000),
  royaltyBps: z.coerce.number().int().min(0).max(1_000),
  royaltyReceiver: address,
  owner: address,
});

export const mintFormSchema = z.object({
  contractAddress: address,
  quantity: z.coerce.number().int().min(1).max(100),
  tokenId: z.coerce.number().int().min(0).optional(),
});

export type Erc721DeployInput = z.infer<typeof erc721DeploySchema>;
export type Erc1155DeployInput = z.infer<typeof erc1155DeploySchema>;
export type MintFormInput = z.infer<typeof mintFormSchema>;
