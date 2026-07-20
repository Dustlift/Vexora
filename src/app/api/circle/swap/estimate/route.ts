import { NextResponse } from "next/server";
import { AppKit } from "@circle-fin/app-kit";
import { ARC_CIRCLE_CHAIN_IDENTIFIER } from "@/config/chains";
import { ARC_TOKENS } from "@/config/tokens";
import { swapFormSchema } from "@/validators/forms";

export async function POST(request: Request) {
  const key = process.env.CIRCLE_KIT_KEY;
  if (!key) {
    return NextResponse.json({ error: "CIRCLE_KIT_KEY is not configured on the server." }, { status: 503 });
  }

  const body = await request.json();
  const parsed = swapFormSchema.safeParse(body);
  if (!parsed.success || body.chain !== ARC_CIRCLE_CHAIN_IDENTIFIER) {
    return NextResponse.json({ error: "Invalid Arc Testnet swap request." }, { status: 400 });
  }

  const kit = new AppKit();
  const rates = await kit.getTokenRates({
    chain: ARC_CIRCLE_CHAIN_IDENTIFIER,
    tokens: [parsed.data.tokenIn, parsed.data.tokenOut],
    kitKey: key,
  });
  const chainRates = rates.rates[ARC_CIRCLE_CHAIN_IDENTIFIER] || {};
  const tokenInRate = chainRates[ARC_TOKENS[parsed.data.tokenIn].address.toLowerCase()];
  const tokenOutRate = chainRates[ARC_TOKENS[parsed.data.tokenOut].address.toLowerCase()];
  if (!tokenInRate?.priceUSD || !tokenOutRate?.priceUSD) {
    return NextResponse.json({ error: "Circle rate is unavailable for this Arc Testnet pair." }, { status: 503 });
  }
  const amountOut = (Number(parsed.data.amountIn) * Number(tokenInRate.priceUSD)) / Number(tokenOutRate.priceUSD);
  const minimumOut = amountOut * (1 - parsed.data.slippageBps / 10_000);

  return NextResponse.json({
    chain: ARC_CIRCLE_CHAIN_IDENTIFIER,
    tokenIn: parsed.data.tokenIn,
    tokenOut: parsed.data.tokenOut,
    amountIn: parsed.data.amountIn,
    amountOut: amountOut.toFixed(6),
    minimumOut: minimumOut.toFixed(6),
    slippageBps: parsed.data.slippageBps,
    rateInUsd: tokenInRate.priceUSD,
    rateOutUsd: tokenOutRate.priceUSD,
    fetchedAt: tokenOutRate.fetchedAt || tokenInRate.fetchedAt,
  });
}
