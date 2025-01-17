import './globals.css'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import NavBar from '@/components/NavBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Chess Ratings Dashboard',
  description: 'View enhanced chess analytics from the ECF Ratings API',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="4d71ba17-f234-45d6-b415-a1ace9193a87"
        />
      </head>
      <body className={inter.className}>
        <NavBar />
        <main className="min-h-screen bg-gray-100 pt-6">
          {children}
        </main>
      </body>
    </html>
  )
}

