import { ARC_TESTNET_EXPLORER_URL } from "./chains";

export const explorer = {
  address: (address: string) => `${ARC_TESTNET_EXPLORER_URL}/address/${address}`,
  tx: (hash: string) => `${ARC_TESTNET_EXPLORER_URL}/tx/${hash}`,
  token: (address: string) => `${ARC_TESTNET_EXPLORER_URL}/token/${address}`,
};
