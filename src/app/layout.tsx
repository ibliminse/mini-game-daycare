import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Q-Learn™ - Quality Learning Centers",
  description: "A cheerful enrollment management simulation",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Q-Learn™",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
