import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Terms of Service | Normie",
  description: "Terms of service for Normie."
};

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children;
}
