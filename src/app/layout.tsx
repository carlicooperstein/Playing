import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Wills Silent Disco - Dolores Park | Party in the Park',
  description: 'Join the silent disco party at Dolores Park SF - Connect your AirPods and dance!',
  openGraph: { 
    title: 'Wills Silent Disco - Dolores Park',
    description: 'Join the silent disco party at Dolores Park SF',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Script 
          src="https://sdk.scdn.co/spotify-player.js"
          strategy="beforeInteractive"
        />
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
          {children}
        </div>
      </body>
    </html>
  )
}
