import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css"
import { QueryProvider } from '@/providers/query-client-provider'
import { LanguageProvider } from '@/components/language-provider'
import { getDict, parseLang } from '@/lib/i18n'

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const lang = parseLang((await cookies()).get('lang')?.value)
  const d = getDict(lang)
  return { title: d['meta.title'], description: d['meta.desc'] }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const lang = parseLang((await cookies()).get('lang')?.value)
  return (
    <html
      lang={lang}
      data-lang={lang}
      suppressHydrationWarning
      className={`${jakarta.variable} ${plexMono.variable} bg-paper text-ink h-full antialiased`}
    >
      <head>
        <script
          id="theme-init"
          type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
{/* impeccable:direction LAMARANKU-ADMIN
        THESIS: A single-user job tracker restated as a quiet, professional admin console; refuses the gamified orange/paper "Momentum" world and its display-font heroics.
        OWN-WORLD: Cool-gray paper canvas; white cards with hairline borders and low offset shadows; indigo `trailblaze` primary for actions/selection only; slate sidebar shell on desktop; Jakarta Sans across the UI with Plex Mono reserved for data.
        STORY: The visitor opens a calm control center where their pipeline, pipeline health, and next actions are scannable at a glance and every state reads unambiguously.
        FIRST VIEWPORT: Dark slate sidebar (brand, search, Menu links, user) on desktop; mobile bottom bar; content led by a compact PageHeader with title and primary actions.
        FORM: CoreUI-style admin console, Restrained palette, Operate mode; seed direction pinned by owner brief.
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md */}
        <LanguageProvider><QueryProvider>{children}</QueryProvider></LanguageProvider>
      </body>
    </html>
  );
}
