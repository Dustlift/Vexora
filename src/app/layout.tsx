import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://openvexora.vercel.app"),
  title: "Vexora",
  description: "Technical Web3 tools for Arc Testnet balances, swaps, NFT deployment, and mint management.",
  applicationName: "Vexora",
  icons: {
    icon: "/vexora-logo.png",
    apple: "/vexora-logo.png",
  },
  openGraph: {
    title: "Vexora",
    description: "Arc Testnet technical toolkit for balances, swaps, NFT deployment, and mint management.",
    url: "https://openvexora.vercel.app",
    siteName: "Vexora",
    images: [{ url: "/vexora-logo.png", width: 1024, height: 1024, alt: "Vexora logo" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
