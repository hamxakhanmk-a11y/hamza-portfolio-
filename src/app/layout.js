import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import SiteMotion from "@/components/SiteMotion";
import Navbar from "@/components/Navbar";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "Hamza Khan | Artist",
  description: "Original artworks by Hamza Khan. Browse and purchase paintings, illustrations, and more.",
};

export default function RootLayout({ children }) {
  const storageOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      {storageOrigin && (
        <head>
          <link rel="preconnect" href={storageOrigin} crossOrigin="anonymous" />
          <link rel="dns-prefetch" href={storageOrigin} />
        </head>
      )}
      <body className="bg-white text-neutral-900 antialiased">
        <Navbar />
        <SiteMotion />
        {children}
      </body>
    </html>
  );
}
