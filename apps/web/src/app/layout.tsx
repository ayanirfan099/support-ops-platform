import type { Metadata } from "next";
import "./globals.css";

const metadataBase = new URL(
  process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
);

export const metadata: Metadata = {
  metadataBase,
  title: "SupportOps — Support, with evidence",
  description:
    "A support operations workspace for ticket workflows, source-cited knowledge, and human-reviewed routing.",
  openGraph: {
    type: "website",
    title: "SupportOps — Support, with evidence",
    description:
      "Ticket workflows, source-cited knowledge, and human-reviewed routing in one workspace.",
    images: [
      {
        url: "/social-preview.png",
        width: 1200,
        height: 630,
        alt: "Illustrative SupportOps workspace dashboard preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/social-preview.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
