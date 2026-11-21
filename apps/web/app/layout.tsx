import type { Metadata } from "next"
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { SimulationBanner } from "@/components/simulation-banner"
import { APP_NAME } from "@/messages/pl"
import { cn } from "@workspace/ui/lib/utils"

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
})

const newsreader = Newsreader({
  subsets: ["latin", "latin-ext"],
  variable: "--font-newsreader",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — uprawnienia i zasiłki dla rodziców`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Sprawdź uprawnienia do zasiłku macierzyńskiego, rodzicielskiego i ojcowskiego. Kalkulator, oś czasu, analiza dokumentów i asystent z cytatami. Projekt demonstracyjny.",
  applicationName: APP_NAME,
  robots: { index: false, follow: false },
  openGraph: {
    title: APP_NAME,
    description:
      "Deterministyczny kalkulator zasiłków, planer urlopów i asystent wiedzy dla rodziców.",
    locale: "pl_PL",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pl"
      suppressHydrationWarning
      className={cn(
        inter.variable,
        newsreader.variable,
        jetbrainsMono.variable
      )}
    >
      <body>
        <ThemeProvider>
          <a
            href="#tresc"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
          >
            Przejdź do treści
          </a>
          <SimulationBanner />
          <SiteHeader />
          <main id="tresc" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  )
}
