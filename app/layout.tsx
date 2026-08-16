import "./globals.css";
import "./ux-cleanup.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "HouseClear", description: "Family house clear-out inventory" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="nl"><body>{children}</body></html>;
}
