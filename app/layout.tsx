import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Normie Polls",
  description: "Personality polls for normal people."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
