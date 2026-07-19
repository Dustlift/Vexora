"use client";

import { erc20Abi, formatUnits } from "viem";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { ARC_TOKENS } from "@/config/tokens";

export function useTokenBalances() {
  const { address } = useAccount();
  const native = useBalance({ address });
  const reads = useReadContracts({
    allowFailure: true,
    contracts: address
      ? [
          { abi: erc20Abi, address: ARC_TOKENS.USDC.address, functionName: "balanceOf", args: [address] },
          { abi: erc20Abi, address: ARC_TOKENS.EURC.address, functionName: "balanceOf", args: [address] },
        ]
      : [],
  });

  const usdc = reads.data?.[0]?.result;
  const eurc = reads.data?.[1]?.result;

  return {
    nativeGas: native.data ? `${Number(native.data.formatted).toFixed(4)} USDC` : "0 USDC",
    USDC: typeof usdc === "bigint" ? formatUnits(usdc, 6) : "0",
    EURC: typeof eurc === "bigint" ? formatUnits(eurc, 6) : "0",
    refresh: () => {
      void native.refetch();
      void reads.refetch();
    },
    isLoading: native.isLoading || reads.isLoading,
  };
}
