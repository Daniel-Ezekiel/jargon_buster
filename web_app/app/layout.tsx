import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfitSans = Outfit({
  variable: "--font-outfit-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SRA",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfitSans.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
