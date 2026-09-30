import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import "./game.css";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const sans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "链上桌游厅",
  description:
    "链上桌游厅：crypto 版「谁是卧底」，链上 AI 当裁判、钱包即身份、免 gas 开局。由 GenLayer 链上 AI 主持。",
  openGraph: {
    title: "链上桌游厅",
    description: "crypto 版「谁是卧底」，链上 AI 当裁判、钱包即身份。",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "链上桌游厅",
    description: "crypto 版「谁是卧底」，链上 AI 当裁判、钱包即身份。",
  },
};

export const viewport: Viewport = {
  themeColor: "#05090b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${mono.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
