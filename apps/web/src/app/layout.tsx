import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SupportOps — Support, with evidence",
  description:
    "A human-supervised support operations workspace. Foundation milestone build.",
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
