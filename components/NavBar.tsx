import Link from "next/link"

export default function NavBar() {
  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          <div className="text-2xl font-semibold text-gray-800">
            <Link href="/">Chess Rating Analytics</Link>
          </div>
          <div className="flex space-x-4">
            <Link href="/" className="text-gray-800 hover:text-blue-600">
              Home
            </Link>
            <Link href="/about" className="text-gray-800 hover:text-blue-600">
              About
            </Link>
            <Link href="/faq" className="text-gray-800 hover:text-blue-600">
              FAQ
            </Link>
            <Link
              href="https://ko-fi.com/chessratinganalytics"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-bold"
            >
              Donate
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

