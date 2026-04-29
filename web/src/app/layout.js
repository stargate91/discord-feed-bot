import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL('https://novafeeds.xyz'),
  title: {
    default: "NovaFeeds Dashboard",
    template: "%s | NovaFeeds",
  },
  description: "Automated Discord feed bot for YouTube, Twitch, RSS, and more.",
  icons: {
    icon: [
      { url: "/nova_v2.jpg" },
      { url: "/icon.png" },
    ],
    shortcut: "/icon.png",
    apple: "/nova_v2.jpg",
  },
};

export const viewport = {
  themeColor: "#0a0a0f",
};

import { ToastProvider } from "@/context/ToastContext";
import ToastContainer from "@/components/ToastContainer";

import StyledJsxRegistry from "@/lib/registry";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable}`}>
      <body>
        <StyledJsxRegistry>
          <AuthProvider>
            <ToastProvider>
              {children}
              <ToastContainer />
            </ToastProvider>
          </AuthProvider>
        </StyledJsxRegistry>
      </body>
    </html>
  );
}
