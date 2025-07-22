// frontend/src/services/postService.ts
// Version: 1.0.0
// Frontend PostService implementation with comprehensive API integration, type safety, and error handling

// Domain types (what the frontend application uses)
export interface Post {
  id: string
  title: string
  content: string
  authorId: string
  createdAt: Date
  updatedAt: Date
  published: boolean
  tags: string[]
}

// API request types
export interface CreatePostRequest {
  title: string
  content: string
  authorId: string
  published?: boolean
  tags?: string[]
}

export interface UpdatePostRequest {
  title?: string
  content?: string
  published?: boolean
  tags?: string[]
}

export interface PostFilters {
  authorId?: string
  published?: boolean
  tags?: string[]
  searchTerm?: string
}

export interface GetAllPostsOptions {
  page?: number
  limit?: number
  filters?: PostFilters
}

// Frontend response types (what the frontend application returns)
export interface PaginatedPostsResponse {
  posts: Post[]
  total: number
  page: number
  limit: number
}

// API response types (what the backend API returns - dates as strings)
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

interface PaginatedPostsApiResponse {
  posts: PostApiResponse[]
  total: number
  page: number
  limit: number
}

/**
 * Frontend service for managing post-related API operations
 * Handles authentication, request formatting, response transformation, and error handling
 */
export class PostService {
  private baseUrl: string
  private authToken: string | null = null

  /**
   * Creates a new PostService instance
   * @param baseUrl - Base URL for the API (defaults to '/api')
   */
  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  /**
   * Sets the authentication token for subsequent API requests
   * @param token - JWT or bearer token for authentication
   */
  setAuthToken(token: string): void {
    this.authToken = token
  }

  /**
   * Clears the authentication token
   * Useful for logout scenarios
   */
  clearAuthToken(): void {
    this.authToken = null
  }

  /**
   * Creates HTTP headers with proper content type and optional authentication
   * @returns Headers object ready for fetch requests
   */
  private createHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    // Add authorization header if token is available
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    return headers
  }

  /**
   * Handles API response processing and error extraction
   * @param response - Raw fetch response object
   * @returns Promise resolving to parsed JSON data
   * @throws Error with descriptive message if response indicates failure
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorMessage = await response.text()
      throw new Error(`API Error: ${response.status} - ${errorMessage}`)
    }

    return response.json()
  }

  /**
   * Transforms API response object to domain object by converting string dates to Date objects
   * @param apiPost - Post object from API with string dates
   * @returns Post object with proper Date objects
   */
  private transformPostResponse(apiPost: PostApiResponse): Post {
    return {
      ...apiPost,
      createdAt: new Date(apiPost.createdAt),
      updatedAt: new Date(apiPost.updatedAt)
    }
  }

  /**
   * Creates a new post via API call
   * @param data - Post creation data including title, content, and author
   * @returns Promise resolving to the newly created post with proper Date objects
   * @throws Error if API call fails or validation errors occur
   */
  async createPost(data: CreatePostRequest): Promise<Post> {
    const response = await fetch(`${this.baseUrl}/posts`, {
      method: 'POST',
      headers: this.createHeaders(),
      body: JSON.stringify(data)
    })

    const result = await this.handleResponse<PostApiResponse>(response)
    return this.transformPostResponse(result)
  }

  /**
   * Retrieves a specific post by its unique identifier
   * @param id - Unique post identifier
   * @returns Promise resolving to post object or null if not found
   * @throws Error if API call fails (excluding 404 which returns null)
   */
  async getPostById(id: string): Promise<Post | null> {
    const response = await fetch(`${this.baseUrl}/posts/${id}`, {
      method: 'GET',
      headers: this.createHeaders()
    })

    // Handle 404 as expected behavior (post not found)
    if (response.status === 404) {
      return null
    }

    const result = await this.handleResponse<PostApiResponse>(response)
    return this.transformPostResponse(result)
  }

  /**
   * Updates an existing post with provided data
   * @param id - Unique post identifier
   * @param data - Partial post data to update (only provided fields will be updated)
   * @returns Promise resolving to the updated post with proper Date objects
   * @throws Error if API call fails, post not found, or validation errors occur
   */
  async updatePost(id: string, data: UpdatePostRequest): Promise<Post> {
    const response = await fetch(`${this.baseUrl}/posts/${id}`, {
      method: 'PUT',
      headers: this.createHeaders(),
      body: JSON.stringify(data)
    })

    const result = await this.handleResponse<PostApiResponse>(response)
    return this.transformPostResponse(result)
  }

  /**
   * Deletes a post by its unique identifier
   * @param id - Unique post identifier
   * @returns Promise resolving to true if deletion successful, false if post not found
   * @throws Error if API call fails (excluding 404 which returns false)
   */
  async deletePost(id: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/posts/${id}`, {
      method: 'DELETE',
      headers: this.createHeaders()
    })

    // Handle 404 as expected behavior (post already deleted or never existed)
    if (response.status === 404) {
      return false
    }

    await this.handleResponse<void>(response)
    return true
  }

  /**
   * Retrieves all posts with optional pagination and filtering
   * @param options - Query options including page, limit, and various filters
   * @returns Promise resolving to paginated posts response with proper Date objects
   * @throws Error if API call fails
   */
  async getAllPosts(options: GetAllPostsOptions = {}): Promise<PaginatedPostsResponse> {
    // Build query parameters from options
    const searchParams = new URLSearchParams()
    
    if (options.page) searchParams.set('page', options.page.toString())
    if (options.limit) searchParams.set('limit', options.limit.toString())
    if (options.filters?.authorId) searchParams.set('authorId', options.filters.authorId)
    if (options.filters?.published !== undefined) {
      searchParams.set('published', options.filters.published.toString())
    }
    if (options.filters?.searchTerm) searchParams.set('searchTerm', options.filters.searchTerm)
    if (options.filters?.tags?.length) {
      searchParams.set('tags', options.filters.tags.join(','))
    }

    const url = `${this.baseUrl}/posts?${searchParams.toString()}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.createHeaders()
    })

    const result = await this.handleResponse<PaginatedPostsApiResponse>(response)
    
    // Transform all posts in the response
    return {
      ...result,
      posts: result.posts.map(post => this.transformPostResponse(post))
    }
  }

  /**
   * Retrieves all posts created by a specific author
   * @param authorId - Unique author identifier
   * @returns Promise resolving to array of posts with proper Date objects
   * @throws Error if API call fails
   */
  async getPostsByAuthor(authorId: string): Promise<Post[]> {
    const response = await fetch(`${this.baseUrl}/posts/author/${authorId}`, {
      method: 'GET',
      headers: this.createHeaders()
    })

    const result = await this.handleResponse<PostApiResponse[]>(response)
    
    // Transform all posts in the response
    return result.map(post => this.transformPostResponse(post))
  }

  /**
   * Publishes a post (sets published status to true)
   * @param id - Unique post identifier
   * @returns Promise resolving to the updated post with proper Date objects
   * @throws Error if API call fails or post not found
   */
  async publishPost(id: string): Promise<Post> {
    const response = await fetch(`${this.baseUrl}/posts/${id}/publish`, {
      method: 'PATCH',
      headers: this.createHeaders()
    })

    const result = await this.handleResponse<PostApiResponse>(response)
    return this.transformPostResponse(result)
  }

  /**
   * Unpublishes a post (sets published status to false)
   * @param id - Unique post identifier
   * @returns Promise resolving to the updated post with proper Date objects
   * @throws Error if API call fails or post not found
   */
  async unpublishPost(id: string): Promise<Post> {
    const response = await fetch(`${this.baseUrl}/posts/${id}/unpublish`, {
      method: 'PATCH',
      headers: this.createHeaders()
    })

    const result = await this.handleResponse<PostApiResponse>(response)
    return this.transformPostResponse(result)
  }
}

// Create and export a default instance for convenience
export const postService = new PostService()

// frontend/src/services/postService.ts
// Version: 1.0.0
// Frontend PostService implementation with comprehensive API integration, type safety, and error handling