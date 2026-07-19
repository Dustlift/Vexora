import { describe, expect, it } from "vitest";
import { erc721DeploySchema, mintFormSchema, swapFormSchema } from "./forms";

const address = "0x1111111111111111111111111111111111111111";

describe("form validators", () => {
  it("validates swap input and amount parsing", () => {
    expect(swapFormSchema.parse({ tokenIn: "USDC", tokenOut: "EURC", amountIn: "1.25", slippageBps: 100 }).amountIn).toBe("1.25");
    expect(() => swapFormSchema.parse({ tokenIn: "USDC", tokenOut: "EURC", amountIn: "0", slippageBps: 100 })).toThrow();
  });

  it("validates deploy owner and supply", () => {
    const parsed = erc721DeploySchema.parse({
      name: "Arc Collection",
      symbol: "ARC",
      baseUri: "ipfs://base/",
      maxSupply: 100,
      mintPrice: "0",
      maxPerWallet: 5,
      ownerFreeMint: true,
      publicMint: true,
      freezeMetadata: false,
      royaltyBps: 250,
      royaltyReceiver: address,
      owner: address,
    });
    expect(parsed.maxSupply).toBe(100);
  });

  it("rejects invalid NFT mint address", () => {
    expect(() => mintFormSchema.parse({ contractAddress: "0x0", quantity: 1 })).toThrow();
  });
});
