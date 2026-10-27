import type { Metadata, Viewport } from "next";
import { Manrope, Martian_Mono } from "next/font/google";
import Pointer from "@/components/pointer";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const martian = Martian_Mono({ variable: "--font-martian", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Toll: postage for your attention",
  description: "Strangers place a small refundable PayPal hold to reach you. If the message is worth your time, they pay nothing.",
};

export const viewport: Viewport = { themeColor: "#08100d" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${martian.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Pointer />
      </body>
    </html>
  );
}
