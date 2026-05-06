import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter, Barlow_Condensed, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import './globals.css'

const GA_MEASUREMENT_ID = 'G-8N54H781N4'
const ADSENSE_CLIENT_ID = 'ca-pub-7740708597836782'

// AdSense is shown to anonymous visitors and free-tier subscribers; paid
// subscribers are ad-free as part of the value proposition.
async function viewerIsPaid(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return false
    const service = createServiceClient()
    const { data: subscriber } = await service
      .from('subscribers')
      .select('tier')
      .eq('email', user.email)
      .single()
    return subscriber?.tier === 'paid'
  } catch {
    return false
  }
}

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
  // AdSense verification — emits <meta name="google-adsense-account"> in
  // <head>, which AdSense's crawler looks for as the official verification
  // signal. Always present (independent of viewer tier) so verification
  // succeeds even though we conditionally load the actual ads script.
  other: {
    'google-adsense-account': ADSENSE_CLIENT_ID,
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isPaid = await viewerIsPaid()

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

        {/* Google AdSense — shown only to anonymous visitors and free-tier
            subscribers. Paid subscribers are ad-free. */}
        {!isPaid && (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
  )
}
