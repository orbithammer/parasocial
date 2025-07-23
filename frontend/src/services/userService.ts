// frontend/src/services/userService.ts
// Version: 1.0.0
// Initial implementation of user service for API interactions

import { get, put, post, delete as deleteRequest } from '../lib/api'
import type { ApiResponse } from '../lib/api'

// User data interfaces
export interface User {
  id: string
  username: string
  email: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  isPrivate: boolean
  createdAt: string
  updatedAt: string
}

// User statistics interface
export interface UserStats {
  followersCount: number
  followingCount: number
  postsCount: number
}

// Follow user data interface
export interface FollowUser {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  followedAt: string
}

// Paginated follow results interface
export interface PaginatedFollowResult {
  users: FollowUser[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// User profile update data interface
export interface UpdateUserProfileData {
  displayName?: string
  bio?: string
  isPrivate?: boolean
}

/**
 * Fetches the current authenticated user's profile
 * @param token - JWT authentication token
 * @returns Promise resolving to user profile data
 */
export async function getUserProfile(token: string): Promise<User> {
  const response: ApiResponse<User> = await get('/api/users/profile', {
    token
  })
  return response.data
}

/**
 * Updates the current authenticated user's profile
 * @param data - Profile data to update
 * @param token - JWT authentication token
 * @returns Promise resolving to updated user profile
 */
export async function updateUserProfile(
  data: UpdateUserProfileData, 
  token: string
): Promise<User> {
  const response: ApiResponse<User> = await put('/api/users/profile', data, {
    token
  })
  return response.data
}

/**
 * Fetches a user by their username
 * @param username - Username to search for
 * @returns Promise resolving to user data
 */
export async function getUserByUsername(username: string): Promise<User> {
  const response: ApiResponse<User> = await get(`/api/users/${username}`)
  return response.data
}

/**
 * Fetches a user by their unique ID
 * @param userId - User ID to search for
 * @returns Promise resolving to user data
 */
export async function getUserById(userId: string): Promise<User> {
  const response: ApiResponse<User> = await get(`/api/users/id/${userId}`)
  return response.data
}

/**
 * Uploads a new avatar for the authenticated user
 * @param file - Image file to upload as avatar
 * @param token - JWT authentication token
 * @returns Promise resolving to updated user with new avatar URL
 */
export async function uploadUserAvatar(file: File, token: string): Promise<User> {
  // Create FormData for file upload
  const formData = new FormData()
  formData.append('avatar', file)

  const response: ApiResponse<User> = await post('/api/users/avatar', formData, {
    token,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

/**
 * Fetches a user's followers with pagination
 * @param username - Username to get followers for
 * @param page - Page number for pagination (default: 1)
 * @param limit - Number of followers per page (default: 20)
 * @returns Promise resolving to paginated followers list
 */
export async function getUserFollowers(
  username: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedFollowResult> {
  const response: ApiResponse<PaginatedFollowResult> = await get(
    `/api/users/${username}/followers?page=${page}&limit=${limit}`
  )
  return response.data
}

/**
 * Fetches users that the specified user is following with pagination
 * @param username - Username to get following list for
 * @param page - Page number for pagination (default: 1)
 * @param limit - Number of users per page (default: 20)
 * @returns Promise resolving to paginated following list
 */
export async function getUserFollowing(
  username: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedFollowResult> {
  const response: ApiResponse<PaginatedFollowResult> = await get(
    `/api/users/${username}/following?page=${page}&limit=${limit}`
  )
  return response.data
}

/**
 * Fetches statistics for a user (followers, following, posts counts)
 * @param username - Username to get statistics for
 * @returns Promise resolving to user statistics
 */
export async function getUserStats(username: string): Promise<UserStats> {
  const response: ApiResponse<UserStats> = await get(`/api/users/${username}/stats`)
  return response.data
}

/**
 * Blocks a user for the authenticated user
 * @param username - Username of user to block
 * @param token - JWT authentication token
 * @returns Promise that resolves when block is successful
 */
export async function blockUser(username: string, token: string): Promise<void> {
  await post(`/api/users/${username}/block`, {}, {
    token
  })
}

/**
 * Unblocks a previously blocked user for the authenticated user
 * @param username - Username of user to unblock
 * @param token - JWT authentication token
 * @returns Promise that resolves when unblock is successful
 */
export async function unblockUser(username: string, token: string): Promise<void> {
  await deleteRequest(`/api/users/${username}/block`, {
    token
  })
}

// frontend/src/services/userService.ts
// Version: 1.0.0
// Initial implementation of user service for API interactions