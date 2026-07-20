export function toUserFacingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("denied")) return "Wallet confirmation was rejected.";
  if (lower.includes("insufficient funds")) return "Insufficient USDC gas balance on Arc Testnet.";
  if (lower.includes("allowance")) return "Allowance check failed. Review the amount and approve again.";
  if (lower.includes("revert")) return "The simulation reverted before the transaction was sent.";
  if (lower.includes("provider") || lower.includes("wallet client")) return "Connected wallet provider is not ready. Reconnect the wallet and try again.";
  if (lower.includes("kit_key") || lower.includes("kit key") || lower.includes("kitkey")) return "Circle swap key is not configured for transaction execution.";
  if (lower.includes("unsupported") || lower.includes("not supported") || lower.includes("route")) return "This swap route is not supported on Arc Testnet right now.";
  if (lower.includes("permit")) return "Permit approval failed. Try again or use a wallet that supports token permits.";
  if (lower.includes("quote")) return "A swap quote could not be produced for this amount.";
  if (lower.includes("slippage")) return "Slippage tolerance is too low for this quote.";
  if (lower.includes("liquidity")) return "Testnet liquidity is too low for this swap.";
  if (lower.includes("network") || lower.includes("rpc")) return "Arc Testnet RPC returned an error. Try again.";

  return "The operation failed. No secret values were logged or exposed.";
}
