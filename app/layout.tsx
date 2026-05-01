import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter, Barlow_Condensed, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
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
      <body>
        {children}
        <div className="grain-layer" aria-hidden="true" />
      </body>
    </html>
  )
}
