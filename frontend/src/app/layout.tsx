// frontend/src/app/layout.tsx
// Version: 1.2.0
// Updated: Added AuthProvider wrapper to fix 500 error and enable authentication context

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import './globals.css'

// Load Inter font with Latin subset for optimal performance
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
})

// App metadata for SEO and social sharing
export const metadata: Metadata = {
  title: {
    default: 'ParaSocial - Creator Broadcasting Platform',
    template: '%s | ParaSocial'
  },
  description: 'A unidirectional social network for content creators',
  keywords: ['social media', 'content creators', 'fediverse', 'ActivityPub', 'broadcasting'],
  authors: [{ name: 'ParaSocial Team' }],
  creator: 'ParaSocial',
  publisher: 'ParaSocial',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // Open Graph metadata for social sharing
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://parasocial.network',
    siteName: 'ParaSocial',
    title: 'ParaSocial - Creator Broadcasting Platform',
    description: 'A unidirectional social network for content creators',
  },
  // Twitter Card metadata
  twitter: {
    card: 'summary_large_image',
    title: 'ParaSocial - Creator Broadcasting Platform',
    description: 'A unidirectional social network for content creators',
    creator: '@parasocial',
  },
  // Viewport configuration for responsive design
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  // Theme color for mobile browsers
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
  // Robots directive for search engines
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

/**
 * Root layout component that wraps all pages
 * Provides global styles, fonts, authentication context, and HTML document structure
 * 
 * @param children - The page content to render
 * @returns JSX element containing the complete HTML document structure
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        {/* Title is handled by metadata export above */}
        {/* Meta tags are handled by metadata export above */}
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        
        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased dark:bg-gray-900 dark:text-gray-100">
        {/* Skip link for accessibility */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
          Skip to main content
        </a>
        
        {/* Wrap entire app with AuthProvider for authentication context */}
        <AuthProvider>
          {/* Main application container */}
          <div id="app-root" className="relative min-h-screen">
            {/* Navigation will be added in future iterations */}
            
            {/* Main content area with semantic HTML */}
            <main id="main-content" className="relative">
              {children}
            </main>
            
            {/* Footer will be added in future iterations */}
          </div>
        </AuthProvider>
        
        {/* Portal root for modals and overlays */}
        <div id="modal-root" />
      </body>
    </html>
  )
}

// frontend/src/app/layout.tsx
// Version: 1.2.0
// Updated: Added AuthProvider wrapper to fix 500 error and enable authentication context