import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Northstar | Workspace overview",
  description: "Keep your team, metrics, and momentum in one place.",
  applicationName: "Northstar"
};

export const viewport: Viewport = {
  themeColor: "#f7f8fb",
  colorScheme: "light"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${mono.variable} ${display.variable}`}>{children}</body>
    </html>
  );
}
