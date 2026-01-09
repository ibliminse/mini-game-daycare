import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Q-Learn™ - Quality Learning Centers",
  description: "A cheerful enrollment management simulation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
