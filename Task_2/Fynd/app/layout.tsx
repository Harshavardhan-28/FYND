import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Feedback System",
  description: "Two-dashboard customer feedback system with AI-powered responses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
