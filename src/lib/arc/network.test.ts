import { describe, expect, it } from "vitest";
import { ARC_TESTNET_CHAIN_ID } from "@/config/chains";
import { hasEnoughGasBalance, isArcTestnet, willKeepUsdcGasReserve } from "./network";

describe("Arc network helpers", () => {
  it("validates Arc Testnet chain id", () => {
    expect(isArcTestnet(ARC_TESTNET_CHAIN_ID)).toBe(true);
    expect(isArcTestnet(1)).toBe(false);
  });

  it("checks USDC gas reserve", () => {
    expect(hasEnoughGasBalance(0.3)).toBe(true);
    expect(hasEnoughGasBalance(0.1)).toBe(false);
    expect(willKeepUsdcGasReserve(10, 9.5)).toBe(true);
    expect(willKeepUsdcGasReserve(10, 9.9)).toBe(false);
  });
});
