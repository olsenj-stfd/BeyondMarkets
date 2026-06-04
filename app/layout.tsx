import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RegScout — Regulatory & Grant Intelligence",
  description:
    "Describe your venture and discover the regulations and grant opportunities that matter — starting with California air quality and climate tech.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
