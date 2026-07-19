import { NextResponse } from "next/server";
import { ARC_CIRCLE_CHAIN_IDENTIFIER } from "@/config/chains";
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

  return NextResponse.json({
    chain: ARC_CIRCLE_CHAIN_IDENTIFIER,
    tokenIn: parsed.data.tokenIn,
    tokenOut: parsed.data.tokenOut,
    amountIn: parsed.data.amountIn,
    slippageBps: parsed.data.slippageBps,
    kitKeyConfigured: true,
    note: "Use Circle App Kit with a viem wallet adapter on the signing side; the kit key remains server-side.",
  });
}
