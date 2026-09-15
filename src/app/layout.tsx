import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://renowden.dev"),
  title: {
    default: "Cutter Renowden",
    template: "%s — Cutter Renowden",
  },
  description: "Photography by Cutter Renowden.",
  alternates: { canonical: "/photography" },
  openGraph: {
    title: "Cutter Renowden",
    description: "Photography by Cutter Renowden.",
    url: "https://renowden.dev/photography",
    siteName: "Cutter Renowden",
    type: "website",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cutter Renowden",
    description: "Photography by Cutter Renowden.",
    images: ["/og.jpg"],
  },
};

// Matches --paper, so mobile browser chrome sits on the same ground as the page.
export const viewport: Viewport = { themeColor: "#faf9f7" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
