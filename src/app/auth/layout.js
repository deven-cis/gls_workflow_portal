import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    template: "%s | GLS Workflow Portal",
    default: "GLS Workflow Portal",
  },
  description: "GLS Workflow Portal - Streamline your workflow management",
  keywords: ["GLS", "workflow", "portal", "management"],
};

export default function AuthLayout({ children }) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      {children}
    </div>
  );
}
