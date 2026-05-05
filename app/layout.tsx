import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Emotion Universe",
  description: "Experimental generative art universe"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
