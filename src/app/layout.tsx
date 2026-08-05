import type { Metadata } from "next";
import { Unbounded, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css"
import { QueryProvider } from '@/providers/query-client-provider'

const unbounded = Unbounded({
  variable: "--font-display",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Job Application Tracker",
  description: "Track your job applications",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${unbounded.variable} ${jakarta.variable} ${plexMono.variable} bg-paper text-ink h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
