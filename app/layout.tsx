import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter, Barlow_Condensed, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const GA_MEASUREMENT_ID = 'G-8N54H781N4'

// Load Fraunces as a true variable font — the SOFT axis (and auto-loaded
// optical-size axis) lets .t-display use 'SOFT' 30 (roman) / 'SOFT' 50
// (italic) for the prototype's softer editorial character.
const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-condensed',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'Deal Dossier — The Curated Deals Brief',
  description: 'A weekly deals brief covering fashion, grocery, restaurants, home, tech, beauty and more. Curated by AI, edited for real life. Free. No paywall.',
  metadataBase: new URL('https://dealdossier.io'),
  openGraph: {
    title: 'Deal Dossier — The Curated Deals Brief',
    description: 'The deals worth your attention. Curated weekly. Free. No paywall.',
    type: 'website',
    url: 'https://dealdossier.io',
    siteName: 'Deal Dossier',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deal Dossier — The Curated Deals Brief',
    description: 'The deals worth your attention. Curated weekly. Free. No paywall.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://dealdossier.io',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable}`}
    >
      <body className="grain">
        {children}
        <div className="grain-layer" aria-hidden="true" />

        {/* Google Analytics (gtag.js) — loaded after interactive so it
            doesn't block first paint or font swap. */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  )
}
