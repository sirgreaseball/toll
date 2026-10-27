import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import Pointer from "@/components/pointer";
import Smooth from "@/components/smooth";
import Splash from "@/components/splash";
import TabBar from "@/components/tabbar";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Toll: postage for your attention",
  description: "Strangers place a small refundable PayPal hold to reach you. If the message is worth your time, they pay nothing.",
  appleWebApp: { capable: true, title: "Toll", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#f3f6fb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Splash />
        {children}
        <TabBar />
        <Pointer />
        <Smooth />
      </body>
    </html>
  );
}
