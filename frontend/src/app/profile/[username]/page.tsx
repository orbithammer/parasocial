// frontend/src/app/profile/[username]/page.tsx
// Version: 1.3.0
// Fixed ProfilePageParams interface to satisfy Params constraint

'use client'

import React from 'react'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { get, post, del } from '@/lib/api'

interface UserProfile {
  id: string
  username: string
  displayName: string
  bio: string
  followerCount: number
  followingCount: number
  postCount: number
  isFollowing: boolean
  avatarUrl: string
  joinedDate: string
}

interface ProfilePageParams {
  username: string
  [key: string]: string | string[] | undefined
}

type LoadingState = 'loading' | 'success' | 'error'

interface ErrorState {
  message: string
  type: 'not-found' | 'generic'
}

export default function ProfilePage(): React.JSX.Element {
  const params = useParams<ProfilePageParams>()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingState, setLoadingState] = useState<LoadingState>('loading')
  const [error, setError] = useState<ErrorState | null>(null)
  const [isFollowActionLoading, setIsFollowActionLoading] = useState(false)

  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchProfile = async (): Promise<void> => {
      try {
        setLoadingState('loading')
        setError(null)
        
        const response = await get<UserProfile>(`/api/users/${params.username}`)
        setProfile(response.data)
        setLoadingState('success')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        
        if (errorMessage.toLowerCase().includes('not found')) {
          setError({
            message: 'User not found',
            type: 'not-found'
          })
        } else {
          setError({
            message: 'Something went wrong. Please try again later.',
            type: 'generic'
          })
        }
        setLoadingState('error')
      }
    }

    if (params.username) {
      fetchProfile()
    }
  }, [params.username])

  // Handle follow/unfollow actions
  const handleFollowToggle = async (): Promise<void> => {
    if (!profile || isFollowActionLoading) return

    try {
      setIsFollowActionLoading(true)

      if (profile.isFollowing) {
        await del(`/api/users/${profile.id}/follow`)
        setProfile(prev => prev ? {
          ...prev,
          isFollowing: false,
          followerCount: prev.followerCount - 1
        } : null)
      } else {
        await post(`/api/users/${profile.id}/follow`, {})
        setProfile(prev => prev ? {
          ...prev,
          isFollowing: true,
          followerCount: prev.followerCount + 1
        } : null)
      }
    } catch (err) {
      // Handle follow/unfollow error silently or show toast
      console.error('Follow action failed:', err)
    } finally {
      setIsFollowActionLoading(false)
    }
  }

  // Render loading state
  if (loadingState === 'loading') {
    return (
      <main className="container mx-auto px-4 py-8">
        <div 
          role="status" 
          aria-label="Loading profile"
          className="flex items-center justify-center min-h-64"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="sr-only">Loading profile...</span>
        </div>
      </main>
    )
  }

  // Render error state
  if (loadingState === 'error' || !profile) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error?.message || 'Something went wrong'}
          </h1>
          {error?.type === 'not-found' && (
            <p className="text-gray-600">
              The user you're looking for doesn't exist or has been deleted.
            </p>
          )}
        </div>
      </main>
    )
  }

  // Render profile content
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <header className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <Image
              src={profile.avatarUrl}
              alt={`${profile.displayName}'s profile picture`}
              width={150}
              height={150}
              className="rounded-full border-4 border-gray-200"
              priority
            />
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                {profile.displayName}
              </h1>
              <p className="text-lg text-gray-600">
                @{profile.username}
              </p>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 mb-4">
              <div>
                <span className="font-semibold text-gray-900">
                  {profile.postCount}
                </span>
                <span className="text-gray-600 ml-1">posts</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900">
                  {profile.followerCount}
                </span>
                <span className="text-gray-600 ml-1">followers</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900">
                  {profile.followingCount}
                </span>
                <span className="text-gray-600 ml-1">following</span>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-gray-700 mb-4 leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Follow Button */}
            <button
              onClick={handleFollowToggle}
              disabled={isFollowActionLoading}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                profile.isFollowing
                  ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              aria-label={`${profile.isFollowing ? 'Unfollow' : 'Follow'} ${profile.displayName}`}
            >
              {isFollowActionLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  {profile.isFollowing ? 'Unfollowing...' : 'Following...'}
                </span>
              ) : (
                profile.isFollowing ? 'Unfollow' : 'Follow'
              )}
            </button>
          </div>
        </header>

        {/* Posts Section Placeholder */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Posts</h2>
          <div className="text-center py-12 text-gray-500">
            <p>Posts will be displayed here</p>
          </div>
        </section>
      </div>
    </main>
  )
}

// frontend/src/app/profile/[username]/page.tsx
// Version: 1.1.0
// Updated to use existing API methods instead of custom functions