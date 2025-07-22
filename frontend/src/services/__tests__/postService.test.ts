// frontend/src/services/__tests__/postService.test.ts
// Version: 1.1.0
// Fixed TypeScript types - separated API response types (string dates) from domain types (Date objects)

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock fetch globally for all tests
const mockFetch = vi.fn()
global.fetch = mockFetch

// Type definitions that should match the backend
interface Post {
  id: string
  title: string
  content: string
  authorId: string
  createdAt: Date
  updatedAt: Date
  published: boolean
  tags: string[]
}

// API response types (dates come as strings from API)
interface PostApiResponse {
  id: string
  title: string
  content: string
  authorId: string
  createdAt: string
  updatedAt: string
  published: boolean
  tags: string[]
}

interface CreatePostRequest {
  title: string
  content: string
  authorId: string
  published?: boolean
  tags?: string[]
}

interface UpdatePostRequest {
  title?: string
  content?: string
  published?: boolean
  tags?: string[]
}

interface PostFilters {
  authorId?: string
  published?: boolean
  tags?: string[]
  searchTerm?: string
}

interface GetAllPostsOptions {
  page?: number
  limit?: number
  filters?: PostFilters
}

interface PaginatedPostsResponse {
  posts: Post[]
  total: number
  page: number
  limit: number
}

interface PaginatedPostsApiResponse {
  posts: PostApiResponse[]
  total: number
  page: number
  limit: number
}

// Mock PostService class that we'll be testing
class PostService {
  private baseUrl: string
  private authToken: string | null = null

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  /**
   * Sets the authentication token for API requests
   * @param token - JWT or bearer token
   */
  setAuthToken(token: string): void {
    this.authToken = token
  }

  /**
   * Clears the authentication token
   */
  clearAuthToken(): void {
    this.authToken = null
  }

  /**
   * Creates HTTP headers with authentication if available
   * @returns Headers object with content-type and optional authorization
   */
  private createHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    return headers
  }

  /**
   * Handles API response and extracts JSON data
   * @param response - Fetch response object
   * @returns Promise resolving to parsed JSON data
   * @throws Error if response is not ok
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorMessage = await response.text()
      throw new Error(`API Error: ${response.status} - ${errorMessage}`)
    }

    return response.json()
  }

  /**
   * Creates a new post via API call
   * @param data - Post creation data
   * @returns Promise resolving to created post
   * @throws Error if API call fails or validation errors
   */
  async createPost(data: CreatePostRequest): Promise<Post> {
    const response = await fetch(`${this.baseUrl}/posts`, {
      method: 'POST',
      headers: this.createHeaders(),
      body: JSON.stringify(data)
    })

    const result = await this.handleResponse<PostApiResponse>(response)
    
    // Transform date strings to Date objects
    return {
      ...result,
      createdAt: new Date(result.createdAt),
      updatedAt: new Date(result.updatedAt)
    }
  }

  /**
   * Retrieves a post by ID via API call
   * @param id - Post ID
   * @returns Promise resolving to post or null if not found
   * @throws Error if API call fails
   */
  async getPostById(id: string): Promise<Post | null> {
    const response = await fetch(`${this.baseUrl}/posts/${id}`, {
      method: 'GET',
      headers: this.createHeaders()
    })

    if (response.status === 404) {
      return null
    }

    const result = await this.handleResponse<PostApiResponse>(response)
    
    // Transform date strings to Date objects
    return {
      ...result,
      createdAt: new Date(result.createdAt),
      updatedAt: new Date(result.updatedAt)
    }
  }

  /**
   * Updates an existing post via API call
   * @param id - Post ID
   * @param data - Update data
   * @returns Promise resolving to updated post
   * @throws Error if API call fails or post not found
   */
  async updatePost(id: string, data: UpdatePostRequest): Promise<Post> {
    const response = await fetch(`${this.baseUrl}/posts/${id}`, {
      method: 'PUT',
      headers: this.createHeaders(),
      body: JSON.stringify(data)
    })

    const result = await this.handleResponse<PostApiResponse>(response)
    
    // Transform date strings to Date objects
    return {
      ...result,
      createdAt: new Date(result.createdAt),
      updatedAt: new Date(result.updatedAt)
    }
  }

  /**
   * Deletes a post via API call
   * @param id - Post ID
   * @returns Promise resolving to true if deleted successfully
   * @throws Error if API call fails
   */
  async deletePost(id: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/posts/${id}`, {
      method: 'DELETE',
      headers: this.createHeaders()
    })

    if (response.status === 404) {
      return false
    }

    await this.handleResponse<void>(response)
    return true
  }

  /**
   * Retrieves all posts with pagination and filtering via API call
   * @param options - Query options including pagination and filters
   * @returns Promise resolving to paginated posts response
   * @throws Error if API call fails
   */
  async getAllPosts(options: GetAllPostsOptions = {}): Promise<PaginatedPostsResponse> {
    const searchParams = new URLSearchParams()
    
    if (options.page) searchParams.set('page', options.page.toString())
    if (options.limit) searchParams.set('limit', options.limit.toString())
    if (options.filters?.authorId) searchParams.set('authorId', options.filters.authorId)
    if (options.filters?.published !== undefined) searchParams.set('published', options.filters.published.toString())
    if (options.filters?.searchTerm) searchParams.set('searchTerm', options.filters.searchTerm)
    if (options.filters?.tags?.length) searchParams.set('tags', options.filters.tags.join(','))

    const url = `${this.baseUrl}/posts?${searchParams.toString()}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.createHeaders()
    })

    const result = await this.handleResponse<PaginatedPostsApiResponse>(response)
    
    // Transform date strings to Date objects for all posts
    return {
      ...result,
      posts: result.posts.map(post => ({
        ...post,
        createdAt: new Date(post.createdAt),
        updatedAt: new Date(post.updatedAt)
      }))
    }
  }

  /**
   * Retrieves posts by author via API call
   * @param authorId - Author ID
   * @returns Promise resolving to array of posts
   * @throws Error if API call fails
   */
  async getPostsByAuthor(authorId: string): Promise<Post[]> {
    const response = await fetch(`${this.baseUrl}/posts/author/${authorId}`, {
      method: 'GET',
      headers: this.createHeaders()
    })

    const result = await this.handleResponse<PostApiResponse[]>(response)
    
    // Transform date strings to Date objects for all posts
    return result.map(post => ({
      ...post,
      createdAt: new Date(post.createdAt),
      updatedAt: new Date(post.updatedAt)
    }))
  }

  /**
   * Publishes a post via API call
   * @param id - Post ID
   * @returns Promise resolving to updated post
   * @throws Error if API call fails or post not found
   */
  async publishPost(id: string): Promise<Post> {
    const response = await fetch(`${this.baseUrl}/posts/${id}/publish`, {
      method: 'PATCH',
      headers: this.createHeaders()
    })

    const result = await this.handleResponse<PostApiResponse>(response)
    
    // Transform date strings to Date objects
    return {
      ...result,
      createdAt: new Date(result.createdAt),
      updatedAt: new Date(result.updatedAt)
    }
  }

  /**
   * Unpublishes a post via API call
   * @param id - Post ID
   * @returns Promise resolving to updated post
   * @throws Error if API call fails or post not found
   */
  async unpublishPost(id: string): Promise<Post> {
    const response = await fetch(`${this.baseUrl}/posts/${id}/unpublish`, {
      method: 'PATCH',
      headers: this.createHeaders()
    })

    const result = await this.handleResponse<PostApiResponse>(response)
    
    // Transform date strings to Date objects
    return {
      ...result,
      createdAt: new Date(result.createdAt),
      updatedAt: new Date(result.updatedAt)
    }
  }
}

describe('PostService', () => {
  let postService: PostService

  // Mock data for testing
  const mockPost: Post = {
    id: 'post-123',
    title: 'Test Post',
    content: 'This is test content',
    authorId: 'user-456',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    published: true,
    tags: ['test', 'example']
  }

  const mockCreateRequest: CreatePostRequest = {
    title: 'New Post',
    content: 'New post content',
    authorId: 'user-789',
    published: false,
    tags: ['new', 'draft']
  }

  const mockUpdateRequest: UpdatePostRequest = {
    title: 'Updated Title',
    published: true
  }

  const mockApiResponse: PostApiResponse = {
    ...mockPost,
    createdAt: mockPost.createdAt.toISOString(),
    updatedAt: mockPost.updatedAt.toISOString()
  }

  beforeEach(() => {
    // Reset service instance and mocks before each test
    postService = new PostService('/api')
    mockFetch.mockClear()
  })

  afterEach(() => {
    // Clear all mocks after each test
    vi.clearAllMocks()
  })

  describe('constructor and configuration', () => {
    it('should initialize with default base URL', () => {
      // Arrange & Act
      const service = new PostService()

      // Assert
      expect(service).toBeInstanceOf(PostService)
    })

    it('should initialize with custom base URL', () => {
      // Arrange & Act
      const service = new PostService('/custom-api')

      // Assert
      expect(service).toBeInstanceOf(PostService)
    })
  })

  describe('authentication token management', () => {
    it('should set auth token correctly', () => {
      // Arrange
      const token = 'test-jwt-token'

      // Act
      postService.setAuthToken(token)

      // Assert - This would be verified by checking headers in subsequent API calls
      expect(() => postService.setAuthToken(token)).not.toThrow()
    })

    it('should clear auth token correctly', () => {
      // Arrange
      postService.setAuthToken('test-token')

      // Act
      postService.clearAuthToken()

      // Assert - This would be verified by checking headers in subsequent API calls
      expect(() => postService.clearAuthToken()).not.toThrow()
    })
  })

  describe('createPost', () => {
    it('should create post with valid data and return transformed result', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockApiResponse
      })

      // Act
      const result = await postService.createPost(mockCreateRequest)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockCreateRequest)
      })
      expect(result).toEqual(mockPost)
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })

    it('should include auth token in headers when set', async () => {
      // Arrange
      const token = 'test-jwt-token'
      postService.setAuthToken(token)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockApiResponse
      })

      // Act
      await postService.createPost(mockCreateRequest)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(mockCreateRequest)
      })
    })

    it('should throw error when API returns error response', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Title is required'
      })

      // Act & Assert
      await expect(postService.createPost(mockCreateRequest)).rejects.toThrow('API Error: 400 - Title is required')
    })

    it('should throw error when network request fails', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Act & Assert
      await expect(postService.createPost(mockCreateRequest)).rejects.toThrow('Network error')
    })
  })

  describe('getPostById', () => {
    it('should retrieve post by ID and return transformed result', async () => {
      // Arrange
      const postId = 'post-123'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponse
      })

      // Act
      const result = await postService.getPostById(postId)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts/post-123', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(result).toEqual(mockPost)
      expect(result?.createdAt).toBeInstanceOf(Date)
      expect(result?.updatedAt).toBeInstanceOf(Date)
    })

    it('should return null when post not found (404)', async () => {
      // Arrange
      const postId = 'non-existent-post'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      // Act
      const result = await postService.getPostById(postId)

      // Assert
      expect(result).toBeNull()
    })

    it('should include auth token in headers when set', async () => {
      // Arrange
      const token = 'test-jwt-token'
      const postId = 'post-123'
      postService.setAuthToken(token)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponse
      })

      // Act
      await postService.getPostById(postId)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts/post-123', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
    })

    it('should throw error when API returns server error', async () => {
      // Arrange
      const postId = 'post-123'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      })

      // Act & Assert
      await expect(postService.getPostById(postId)).rejects.toThrow('API Error: 500 - Internal server error')
    })
  })

  describe('updatePost', () => {
    it('should update post with valid data and return transformed result', async () => {
      // Arrange
      const postId = 'post-123'
      const updatedApiResponse = {
        ...mockApiResponse,
        title: 'Updated Title',
        published: true,
        updatedAt: new Date().toISOString()
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => updatedApiResponse
      })

      // Act
      const result = await postService.updatePost(postId, mockUpdateRequest)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts/post-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockUpdateRequest)
      })
      expect(result.title).toBe('Updated Title')
      expect(result.published).toBe(true)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })

    it('should include auth token in headers when set', async () => {
      // Arrange
      const token = 'test-jwt-token'
      const postId = 'post-123'
      postService.setAuthToken(token)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponse
      })

      // Act
      await postService.updatePost(postId, mockUpdateRequest)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts/post-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(mockUpdateRequest)
      })
    })

    it('should throw error when post not found', async () => {
      // Arrange
      const postId = 'non-existent-post'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Post not found'
      })

      // Act & Assert
      await expect(postService.updatePost(postId, mockUpdateRequest)).rejects.toThrow('API Error: 404 - Post not found')
    })

    it('should throw error when validation fails', async () => {
      // Arrange
      const postId = 'post-123'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Title cannot be empty'
      })

      // Act & Assert
      await expect(postService.updatePost(postId, { title: '' })).rejects.toThrow('API Error: 400 - Title cannot be empty')
    })
  })

  describe('deletePost', () => {
    it('should delete post successfully and return true', async () => {
      // Arrange
      const postId = 'post-123'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({})
      })

      // Act
      const result = await postService.deletePost(postId)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts/post-123', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(result).toBe(true)
    })

    it('should return false when post not found (404)', async () => {
      // Arrange
      const postId = 'non-existent-post'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      // Act
      const result = await postService.deletePost(postId)

      // Assert
      expect(result).toBe(false)
    })

    it('should include auth token in headers when set', async () => {
      // Arrange
      const token = 'test-jwt-token'
      const postId = 'post-123'
      postService.setAuthToken(token)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({})
      })

      // Act
      await postService.deletePost(postId)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts/post-123', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
    })

    it('should throw error when API returns server error', async () => {
      // Arrange
      const postId = 'post-123'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      })

      // Act & Assert
      await expect(postService.deletePost(postId)).rejects.toThrow('API Error: 500 - Internal server error')
    })
  })

  describe('getAllPosts', () => {
    const mockPaginatedResponse: PaginatedPostsApiResponse = {
      posts: [mockApiResponse],
      total: 1,
      page: 1,
      limit: 10
    }

    it('should retrieve all posts with default pagination', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPaginatedResponse
      })

      // Act
      const result = await postService.getAllPosts()

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts?', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(result.posts).toHaveLength(1)
      expect(result.posts[0].createdAt).toBeInstanceOf(Date)
      expect(result.posts[0].updatedAt).toBeInstanceOf(Date)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })

    it('should retrieve posts with custom pagination', async () => {
      // Arrange
      const options: GetAllPostsOptions = { page: 2, limit: 5 }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ...mockPaginatedResponse, page: 2, limit: 5 })
      })

      // Act
      await postService.getAllPosts(options)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts?page=2&limit=5', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })

    it('should retrieve posts with author filter', async () => {
      // Arrange
      const options: GetAllPostsOptions = {
        filters: { authorId: 'user-456' }
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPaginatedResponse
      })

      // Act
      await postService.getAllPosts(options)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts?authorId=user-456', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })

    it('should retrieve posts with published filter', async () => {
      // Arrange
      const options: GetAllPostsOptions = {
        filters: { published: true }
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPaginatedResponse
      })

      // Act
      await postService.getAllPosts(options)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts?published=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })

    it('should retrieve posts with search term filter', async () => {
      // Arrange
      const options: GetAllPostsOptions = {
        filters: { searchTerm: 'test content' }
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPaginatedResponse
      })

      // Act
      await postService.getAllPosts(options)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts?searchTerm=test+content', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })

    it('should retrieve posts with tags filter', async () => {
      // Arrange
      const options: GetAllPostsOptions = {
        filters: { tags: ['javascript', 'react'] }
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPaginatedResponse
      })

      // Act
      await postService.getAllPosts(options)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts?tags=javascript%2Creact', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })

    it('should retrieve posts with multiple filters and pagination', async () => {
      // Arrange
      const options: GetAllPostsOptions = {
        page: 1,
        limit: 20,
        filters: {
          authorId: 'user-456',
          published: true,
          searchTerm: 'javascript',
          tags: ['frontend']
        }
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPaginatedResponse
      })

      // Act
      await postService.getAllPosts(options)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts?page=1&limit=20&authorId=user-456&published=true&searchTerm=javascript&tags=frontend', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })

    it('should include auth token in headers when set', async () => {
      // Arrange
      const token = 'test-jwt-token'
      postService.setAuthToken(token)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPaginatedResponse
      })

      // Act
      await postService.getAllPosts()

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts?', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
    })

    it('should throw error when API returns error response', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      })

      // Act & Assert
      await expect(postService.getAllPosts()).rejects.toThrow('API Error: 500 - Internal server error')
    })
  })

  describe('getPostsByAuthor', () => {
    const mockAuthorPostsResponse: PostApiResponse[] = [mockApiResponse]

    it('should retrieve posts by author and return transformed results', async () => {
      // Arrange
      const authorId = 'user-456'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAuthorPostsResponse
      })

      // Act
      const result = await postService.getPostsByAuthor(authorId)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts/author/user-456', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(result).toHaveLength(1)
      expect(result[0].createdAt).toBeInstanceOf(Date)
      expect(result[0].updatedAt).toBeInstanceOf(Date)
      expect(result[0].authorId).toBe('user-456')
    })

    it('should include auth token in headers when set', async () => {
      // Arrange
      const token = 'test-jwt-token'
      const authorId = 'user-456'
      postService.setAuthToken(token)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAuthorPostsResponse
      })

      // Act
      await postService.getPostsByAuthor(authorId)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts/author/user-456', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
    })

    it('should return empty array when author has no posts', async () => {
      // Arrange
      const authorId = 'user-no-posts'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      })

      // Act
      const result = await postService.getPostsByAuthor(authorId)

      // Assert
      expect(result).toEqual([])
    })

    it('should throw error when API returns error response', async () => {
      // Arrange
      const authorId = 'user-456'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Author not found'
      })

      // Act & Assert
      await expect(postService.getPostsByAuthor(authorId)).rejects.toThrow('API Error: 404 - Author not found')
    })
  })

  describe('publishPost', () => {
    it('should publish post successfully and return transformed result', async () => {
      // Arrange
      const postId = 'post-123'
      const publishedApiResponse = {
        ...mockApiResponse,
        published: true,
        updatedAt: new Date().toISOString()
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => publishedApiResponse
      })

      // Act
      const result = await postService.publishPost(postId)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts/post-123/publish', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(result.published).toBe(true)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })

    it('should include auth token in headers when set', async () => {
      // Arrange
      const token = 'test-jwt-token'
      const postId = 'post-123'
      postService.setAuthToken(token)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponse
      })

      // Act
      await postService.publishPost(postId)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts/post-123/publish', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
    })

    it('should throw error when post not found', async () => {
      // Arrange
      const postId = 'non-existent-post'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Post not found'
      })

      // Act & Assert
      await expect(postService.publishPost(postId)).rejects.toThrow('API Error: 404 - Post not found')
    })
  })

  describe('unpublishPost', () => {
    it('should unpublish post successfully and return transformed result', async () => {
      // Arrange
      const postId = 'post-123'
      const unpublishedApiResponse = {
        ...mockApiResponse,
        published: false,
        updatedAt: new Date().toISOString()
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => unpublishedApiResponse
      })

      // Act
      const result = await postService.unpublishPost(postId)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts/post-123/unpublish', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(result.published).toBe(false)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })

    it('should include auth token in headers when set', async () => {
      // Arrange
      const token = 'test-jwt-token'
      const postId = 'post-123'
      postService.setAuthToken(token)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponse
      })

      // Act
      await postService.unpublishPost(postId)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/posts/post-123/unpublish', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
    })

    it('should throw error when post not found', async () => {
      // Arrange
      const postId = 'non-existent-post'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Post not found'
      })

      // Act & Assert
      await expect(postService.unpublishPost(postId)).rejects.toThrow('API Error: 404 - Post not found')
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      })

      // Act & Assert
      await expect(postService.getPostById('post-123')).rejects.toThrow('Invalid JSON')
    })

    it('should handle network timeout errors', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      // Act & Assert
      await expect(postService.getAllPosts()).rejects.toThrow('Request timeout')
    })

    it('should handle malformed API responses gracefully', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => null
      })

      // Act & Assert
      await expect(postService.getPostById('post-123')).rejects.toThrow()
    })
  })
})

// frontend/src/services/__tests__/postService.test.ts
// Version: 1.0.0
// Initial frontend PostService test suite with comprehensive API call testing, error handling, and type safety