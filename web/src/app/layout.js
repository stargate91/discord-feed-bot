import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata = {
  title: "NOVABOT Dashboard",
  description: "Feed Bot Control Panel",
  icons: {
    icon: "/nova_v2.jpg",
  },
};

import { ToastProvider } from "@/context/ToastContext";
import ToastContainer from "@/components/ToastContainer";

import StyledJsxRegistry from "@/lib/registry";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
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
