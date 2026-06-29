import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Closet Canvas | AI Digital Wardrobe & Outfit Planner",
  description: "Organize your clothes, build outfits with a realistic layering engine, track wear history, and get AI-powered styling recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col pb-20 md:pb-0">
        <BottomNav />
        <main className="flex-1 max-w-md md:max-w-7xl w-full mx-auto px-4 md:px-8 py-4 md:py-6">
          {children}
        </main>
      </body>
    </html>
  );
}


