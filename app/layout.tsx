import type { Metadata } from 'next'
import { Cormorant_Garamond, Barlow, Barlow_Condensed } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-sans',
  display: 'swap',
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-condensed',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'DOSSIER — The Curated Deals Brief',
  description: 'A weekly deals brief covering fashion, grocery, restaurants, home, tech, beauty and more. Curated by AI, edited for real life. Free. No paywall.',
  metadataBase: new URL('https://dealdossier.io'),
  openGraph: {
    title: 'DOSSIER — The Curated Deals Brief',
    description: 'The deals worth your attention. Curated weekly. Free. No paywall.',
    type: 'website',
    url: 'https://dealdossier.io',
    siteName: 'DOSSIER',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DOSSIER — The Curated Deals Brief',
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
      className={`${cormorant.variable} ${barlow.variable} ${barlowCondensed.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
