import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata = {
  title: "NovaFeeds | Feed-RSS Discord Bot",
  description: "The ultimate Discord bot for automated feeds. Real-time updates from YouTube, Twitch, RSS, Crypto, and Free Games delivered straight to your server.",
  openGraph: {
    title: "NovaFeeds | Feed-RSS Discord Bot",
    description: "The ultimate Discord bot for automated feeds.",
    images: [{ url: "/nova_v2.jpg" }],
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={geist.variable}>
      <body>{children}</body>
    </html>
  );
}
