'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Crown } from "lucide-react"

export default function NavBar() {
  const pathname = usePathname()
  
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  const linkClass = (path: string) => {
    const base = "relative px-3 py-2 text-sm font-medium transition-colors duration-200"
    if (isActive(path)) {
      return `${base} text-primary`
    }
    return `${base} text-muted-foreground hover:text-foreground`
  }

  return (
    <nav className="sticky top-0 z-50 glass border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-2 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-200 group-hover:scale-105">
              <Crown className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground hidden sm:block">
              Chess Rating Analytics
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            <Link href="/" className={linkClass('/')}>
              Home
              {isActive('/') && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
            <Link href="/about" className={linkClass('/about')}>
              About
              {isActive('/about') && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
            <Link href="/faq" className={linkClass('/faq')}>
              FAQ
              {isActive('/faq') && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
            <Link
              href="https://ko-fi.com/chessratinganalytics"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg transition-all duration-200 hover:bg-primary/90 hover:shadow-md interactive"
            >
              <svg 
                className="h-4 w-4" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.053 2.678 2.053 2.678s5.996.29 8.166.29c.69 0 1.027-.152 1.027-.152s.148.543.543.543c.395 0 .867-.211 1.154-.467.288-.256.906-1.15.906-1.15l1.5-.79 1.748 1.64s1.355 1.233 2.315 1.233c.96 0 2.053-.553 2.388-1.87.336-1.317.14-6.463.14-6.463s.254-3.435-.52-3.518z"/>
              </svg>
              Donate
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
