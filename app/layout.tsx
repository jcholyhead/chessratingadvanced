import "./globals.css"
import Script from "next/script"
import NavBar from "@/components/NavBar"
import type { ReactNode } from "react"

export const metadata = {
  title: "Chess Rating Analytics",
  description: "View enhanced chess analytics from the ECF Ratings API",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <Script defer src="https://cloud.umami.is/script.js" data-website-id="4d71ba17-f234-45d6-b415-a1ace9193a87" />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML"
          strategy="lazyOnload"
        />
      </head>
      <body className="min-h-screen">
        <NavBar />
        <main className="min-h-[calc(100vh-4rem)] bg-gradient-subtle pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
        <footer className="border-t bg-card py-6 px-4">
          <div className="container mx-auto text-center text-sm text-muted-foreground">
            <p>Chess Rating Analytics — Powered by ECF Rating Data</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
