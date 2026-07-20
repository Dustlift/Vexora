export function toUserFacingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("denied")) return "Wallet confirmation was rejected.";
  if (lower.includes("insufficient funds")) return "Insufficient USDC gas balance on Arc Testnet.";
  if (lower.includes("revert")) return "The simulation reverted before the transaction was sent.";
  if (lower.includes("provider") || lower.includes("wallet client")) return "Connected wallet provider is not ready. Reconnect the wallet and try again.";
  if (lower.includes("unsupported") || lower.includes("not supported")) return "This operation is not supported on Arc Testnet right now.";
  if (lower.includes("network") || lower.includes("rpc")) return "Arc Testnet RPC returned an error. Try again.";

  return "The operation failed. No secret values were logged or exposed.";
}
