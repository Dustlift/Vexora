# Vexora

Production-oriented technical Web3 workspace for Arc Testnet. The app lets a connected wallet view test USDC/EURC balances, open the official Circle Faucet, prepare USDC/EURC swap checks, validate NFT collection deployments, track mint/admin activity locally, and manage wallet-scoped NFT records.

Live site: `https://openvexora.vercel.app/`

Testnet assets are for testing only and have no real-world monetary value. The application does not include an airdrop, points, TGE, token distribution, or user compensation system.

## Verified Official Sources

- Arc Docs: RPC endpoints and wallet network parameters: `https://docs.arc.io/arc/references/rpc-endpoints`, `https://docs.arc.io/arc/references/connect-to-arc`
- Arc Docs: contract addresses: `https://docs.arc.io/arc/references/contract-addresses`
- Arc App Kit Docs: swap and supported chains/tokens: `https://docs.arc.io/app-kit/swap`, `https://docs.arc.io/app-kit/references/supported-blockchains`
- Circle Docs: EURC testnet address: `https://developers.circle.com/stablecoins/eurc-contract-addresses`
- OpenZeppelin Contracts 5.x Docs: ERC-721, ERC-1155, ERC-2981, Ownable, ReentrancyGuard.

## Arc Testnet Configuration

- Chain ID: `5042002`
- RPC URL: `https://rpc.testnet.arc.network`
- WebSocket URL: `wss://rpc.testnet.arc.network`
- Explorer: `https://testnet.arcscan.app`
- Native gas token: `USDC` with 18 native decimals
- USDC ERC-20 interface: `0x3600000000000000000000000000000000000000`, 6 decimals
- EURC token: `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`, 6 decimals
- Circle App Kit chain identifier: `Arc_Testnet`
- Faucet: `https://faucet.circle.com/?allow=true`

## Setup

Requirements:

- Node.js 20 or newer
- npm
- Foundry for contract compilation/tests: `https://book.getfoundry.sh/getting-started/installation`

Install packages:

```bash
npm install
```

Environment:

```bash
cp .env.example .env.local
```

Set:

- `CIRCLE_KIT_KEY`: Circle Console kit key for App Kit swap operations
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: WalletConnect project id for RainbowKit
- `NEXT_PUBLIC_APP_URL`: live site URL, currently `https://openvexora.vercel.app`
- `ARC_TESTNET_RPC_URL`: defaults to the official Arc Testnet RPC

Run locally:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Usage Notes

Faucet:

- Connect a wallet.
- Copy the wallet address from the Faucet page.
- Open the official Circle Faucet.
- Select Arc Testnet and the desired test token.
- Return to the app and refresh balances.

Swap:

- Supported pairs are USDC to EURC and EURC to USDC.
- The app validates token amounts, Arc Testnet chain ID, and USDC gas reserve.
- `CIRCLE_KIT_KEY` stays server-side.
- Live broadcast requires a Circle App Kit viem wallet adapter that can sign with the connected wallet. The current route validates server configuration and request shape.

NFT Deploy:

- User-supplied Solidity code is never accepted.
- Only included OpenZeppelin-based ERC-721 and ERC-1155 templates are used.
- Mint price defaults to zero. Because Arc uses native USDC for gas and payments, free mint is the recommended first-version path unless the deployment operator intentionally enables payable minting and tests accounting.

NFT Mint and My NFTs:

- Deployed collections and activities are stored in localStorage by wallet address.
- Owner controls are displayed only when the connected wallet matches the recorded owner.
- Live admin actions should run owner checks, simulation, gas estimate, and explicit wallet confirmation before broadcasting.

## Contract Commands

Install Foundry, then run:

```bash
forge build
forge test
```

Deploy example:

```bash
forge script contracts/script/DeployErc721.s.sol --rpc-url $ARC_TESTNET_RPC_URL --broadcast
```

Never paste a private key into the UI. Use environment variables or a secure signer when using CLI deployment tools.

## Frontend Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Vercel Deployment

1. Push this project to a Git repository.
2. Import the repository into Vercel.
3. Configure `CIRCLE_KIT_KEY`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, and `NEXT_PUBLIC_APP_URL`.
4. Deploy with the default Next.js build command: `npm run build`.

## Security

- Private keys, seed phrases, and mnemonics are never requested or stored.
- Secrets are not placed in the frontend bundle.
- Form inputs are validated with Zod.
- Faucet calls use only the official Circle Faucet page.
- Chain ID is checked before transaction preparation.
- Infinite approvals are not the default.
- NFT supply and mint limits are enforced in contracts.
- Owner functions are protected at contract level.
- Error messages avoid exposing secrets or sensitive request details.

## Known Testnet Constraints

- Arc Testnet may have temporary instability or low liquidity.
- Faucet limits can change; the app does not present fixed cooldown values unless they are officially documented.
- Circle App Kit swap execution needs a configured signing adapter. This implementation keeps the kit key server-side and provides the structure for quote validation without embedding secrets.
