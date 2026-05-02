import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Normie Polls",
  description: "Sequential polling experience with live results from the previous question."
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
