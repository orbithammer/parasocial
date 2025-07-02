// frontend/src/app/register/page.tsx
// Registration page using existing RegisterComponent
// Version: 1.1.0 - Fixed server/client component issue

'use client'

import { useRouter } from 'next/navigation'
import RegisterComponent from '@/components/auth/RegisterComponent'

/**
 * Registration page component that renders the RegisterComponent
 * Handles successful registration by redirecting to dashboard
 * Handles registration errors by displaying them to the user
 * @returns JSX element for the registration page
 */
export default function RegisterPage() {
  const router = useRouter()
  
  /**
   * Handles successful user registration
   * Stores user data and redirects to dashboard
   * @param userData - User data returned from successful registration
   */
  const handleRegisterSuccess = (userData: any) => {
    // Store user session data in localStorage
    localStorage.setItem('user', JSON.stringify(userData.user))
    
    // Use Next.js router for navigation
    router.push('/dashboard')
  }

  /**
   * Handles registration errors
   * Logs error for debugging purposes
   * @param error - Error message from registration attempt
   */
  const handleRegisterError = (error: string) => {
    console.error('Registration failed:', error)
    // Error display is handled by RegisterComponent
  }

  return (
    <main className="auth-page-container">
      <RegisterComponent 
        onRegisterSuccess={handleRegisterSuccess}
        onRegisterError={handleRegisterError}
        apiBaseUrl={process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1'}
      />
    </main>
  )
}