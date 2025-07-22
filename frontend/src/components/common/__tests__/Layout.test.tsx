// frontend/src/components/common/__tests__/Layout.test.tsx
// Version: 1.1.0
// Fixed Next.js Head component mocking for title and meta description tests

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Layout from '../Layout'

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: vi.fn(),
    replace: vi.fn()
  })
}))

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}))

// Mock Next.js Head component to properly handle title and meta tags
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => {
    // Extract title and meta tags from children and apply them to document
    if (Array.isArray(children)) {
      children.forEach((child: any) => {
        if (child?.type === 'title') {
          document.title = child.props.children
        } else if (child?.type === 'meta' && child?.props?.name === 'description') {
          // Create or update meta description tag
          let metaTag = document.querySelector('meta[name="description"]') as HTMLMetaElement
          if (!metaTag) {
            metaTag = document.createElement('meta')
            metaTag.name = 'description'
            document.head.appendChild(metaTag)
          }
          metaTag.content = child.props.content
        }
      })
    } else if (children) {
      const child = children as any
      if (child?.type === 'title') {
        document.title = child.props.children
      } else if (child?.type === 'meta' && child?.props?.name === 'description') {
        // Create or update meta description tag
        let metaTag = document.querySelector('meta[name="description"]') as HTMLMetaElement
        if (!metaTag) {
          metaTag = document.createElement('meta')
          metaTag.name = 'description'
          document.head.appendChild(metaTag)
        }
        metaTag.content = child.props.content
      }
    }
    return null
  }
}))

describe('Layout Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    
    // Reset document title and remove any meta tags
    document.title = ''
    const metaTags = document.querySelectorAll('meta[name="description"]')
    metaTags.forEach(tag => tag.remove())
  })

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(
        <Layout>
          <div>Test content</div>
        </Layout>
      )
      
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('should render children correctly', () => {
      const testContent = 'This is test content'
      
      render(
        <Layout>
          <div>{testContent}</div>
        </Layout>
      )
      
      expect(screen.getByText(testContent)).toBeInTheDocument()
    })

    it('should have proper semantic HTML structure', () => {
      render(
        <Layout>
          <div>Test content</div>
        </Layout>
      )
      
      // Check for semantic HTML elements
      expect(screen.getByRole('banner')).toBeInTheDocument() // header
      expect(screen.getByRole('main')).toBeInTheDocument() // main
      expect(screen.getByRole('contentinfo')).toBeInTheDocument() // footer
    })
  })

  describe('Header Functionality', () => {
    it('should render site logo/title', () => {
      render(
        <Layout>
          <div>Test content</div>
        </Layout>
      )
      
      // Look specifically for the logo link with aria-label
      const logo = screen.getByRole('link', { name: /go to homepage/i })
      expect(logo).toBeInTheDocument()
    })

    it('should render navigation menu', () => {
      render(
        <Layout>
          <div>Test content</div>
        </Layout>
      )
      
      const navigation = screen.getByRole('navigation')
      expect(navigation).toBeInTheDocument()
    })

    it('should handle mobile menu toggle', async () => {
      const user = userEvent.setup()
      
      render(
        <Layout>
          <div>Test content</div>
        </Layout>
      )
      
      // Look for mobile menu button
      const mobileMenuButton = screen.getByRole('button', { name: /toggle navigation menu/i })
      expect(mobileMenuButton).toBeInTheDocument()
      
      // Test menu toggle
      await user.click(mobileMenuButton)
      
      // Check if mobile menu is visible (assuming it has expanded attribute)
      expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Footer Functionality', () => {
    it('should render footer content', () => {
      render(
        <Layout>
          <div>Test content</div>
        </Layout>
      )
      
      const footer = screen.getByRole('contentinfo')
      expect(footer).toBeInTheDocument()
      expect(footer).toHaveTextContent(/copyright|©/i)
    })

    it('should render footer links', () => {
      render(
        <Layout>
          <div>Test content</div>
        </Layout>
      )
      
      // Look for footer-specific links by checking within the footer
      const footer = screen.getByRole('contentinfo')
      
      // Privacy Policy should only be in footer
      const privacyLink = screen.getByRole('link', { name: /privacy policy/i })
      expect(privacyLink).toBeInTheDocument()
      
      // Terms of Service should only be in footer
      const termsLink = screen.getByRole('link', { name: /terms of service/i })
      expect(termsLink).toBeInTheDocument()
      
      // For Contact, we need to be more specific - look within footer
      const contactLinks = screen.getAllByRole('link', { name: /contact/i })
      const footerContactLink = contactLinks.find(link => footer.contains(link))
      expect(footerContactLink).toBeInTheDocument()
    })
  })

  describe('Props and Configuration', () => {
    it('should accept and apply custom className', () => {
      const customClass = 'custom-layout-class'
      
      render(
        <Layout className={customClass}>
          <div>Test content</div>
        </Layout>
      )
      
      const layoutContainer = screen.getByRole('main').closest('div')
      expect(layoutContainer).toHaveClass(customClass)
    })

    it('should accept title prop and update document title', () => {
      const pageTitle = 'Test Page Title'
      
      render(
        <Layout title={pageTitle}>
          <div>Test content</div>
        </Layout>
      )
      
      expect(document.title).toContain(pageTitle)
    })

    it('should accept meta description prop', () => {
      const metaDescription = 'This is a test meta description'
      
      render(
        <Layout metaDescription={metaDescription}>
          <div>Test content</div>
        </Layout>
      )
      
      const metaTag = document.querySelector('meta[name="description"]')
      expect(metaTag).toHaveAttribute('content', metaDescription)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <Layout>
          <div>Test content</div>
        </Layout>
      )
      
      const navigation = screen.getByRole('navigation')
      expect(navigation).toHaveAttribute('aria-label')
      
      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <Layout>
          <div>Test content</div>
        </Layout>
      )
      
      // Test tab navigation through interactive elements
      const interactiveElements = screen.getAllByRole('link')
      
      if (interactiveElements.length > 0) {
        await user.tab()
        expect(interactiveElements[0]).toHaveFocus()
      }
    })

    it('should have proper heading hierarchy', () => {
      render(
        <Layout>
          <div>Test content</div>
        </Layout>
      )
      
      // Check for h1 element (should be site title/logo)
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
    })
  })

  describe('Responsive Behavior', () => {
    it('should handle viewport changes', () => {
      // Mock window.matchMedia for responsive tests
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn()
        }))
      })
      
      render(
        <Layout>
          <div>Test content</div>
        </Layout>
      )
      
      // Test that mobile menu button exists on small screens
      const mobileMenuButton = screen.queryByRole('button', { name: /toggle navigation menu/i })
      expect(mobileMenuButton).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing children gracefully', () => {
      render(<Layout />)
      
      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
      expect(main).toBeEmptyDOMElement()
    })

    it('should handle invalid props gracefully', () => {
      render(
        <Layout title={null as any} metaDescription={undefined as any}>
          <div>Test content</div>
        </Layout>
      )
      
      // Should still render without crashing
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })
})

// frontend/src/components/common/__tests__/Layout.test.tsx
// Version: 1.1.0
// Fixed Next.js Head component mocking for title and meta description tests