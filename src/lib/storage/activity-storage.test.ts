import { beforeEach, describe, expect, it } from "vitest";
import type { Address } from "viem";
import { addActivity, getActivities, getCollections, saveCollection } from "./activity-storage";

const wallet = "0x1111111111111111111111111111111111111111" as Address;

describe("wallet-scoped local storage", () => {
  beforeEach(() => localStorage.clear());

  it("stores activity by wallet", () => {
    addActivity(wallet, { id: "a1", walletAddress: wallet, type: "swap", status: "success", createdAt: new Date().toISOString() });
    expect(getActivities(wallet)).toHaveLength(1);
  });

  it("stores deployed NFT collections by wallet", () => {
    saveCollection(wallet, {
      id: "c1",
      deployerAddress: wallet,
      ownerAddress: wallet,
      contractAddress: wallet,
      transactionHash: `0x${"2".repeat(64)}`,
      standard: "ERC721",
      name: "Arc",
      symbol: "ARC",
      baseUri: "ipfs://base/",
      maxSupply: "100",
      royaltyBps: 250,
      royaltyReceiver: wallet,
      deployedAt: new Date().toISOString(),
    });
    expect(getCollections(wallet)[0]?.name).toBe("Arc");
  });
});
