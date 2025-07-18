// backend/src/services/PostService.ts
// Version: 1.0.0
// PostService implementation with CRUD operations, validation, and filtering

import { randomUUID } from 'crypto'

// Type definitions for Post entity and related data structures
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

export interface CreatePostData {
  title: string
  content: string
  authorId: string
  published?: boolean
  tags?: string[]
}

export interface UpdatePostData {
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

export interface PaginatedPostsResult {
  posts: Post[]
  total: number
  page: number
  limit: number
}

export class PostService {
  // In-memory storage for posts (in production, this would be a database)
  private posts: Map<string, Post> = new Map()

  /**
   * Creates a new post with validation
   * @param data - Post creation data
   * @returns Promise resolving to the created post
   * @throws Error if validation fails
   */
  async createPost(data: CreatePostData): Promise<Post> {
    // Validate required fields
    if (!data.title || data.title.trim() === '') {
      throw new Error('Title is required')
    }

    if (!data.content || data.content.trim() === '') {
      throw new Error('Content is required')
    }

    if (!data.authorId || data.authorId.trim() === '') {
      throw new Error('Author ID is required')
    }

    // Create new post with generated ID and timestamps
    const now = new Date()
    const post: Post = {
      id: randomUUID(),
      title: data.title.trim(),
      content: data.content.trim(),
      authorId: data.authorId.trim(),
      createdAt: now,
      updatedAt: now,
      published: data.published ?? true, // Default to published
      tags: data.tags ?? [] // Default to empty array
    }

    // Store the post
    this.posts.set(post.id, post)

    return post
  }

  /**
   * Retrieves a post by its ID
   * @param id - The post ID
   * @returns Promise resolving to the post or null if not found
   * @throws Error if ID is invalid
   */
  async getPostById(id: string): Promise<Post | null> {
    if (!id || id.trim() === '') {
      throw new Error('Post ID is required')
    }

    const post = this.posts.get(id.trim())
    return post ?? null
  }

  /**
   * Updates an existing post
   * @param id - The post ID
   * @param data - Update data
   * @returns Promise resolving to the updated post
   * @throws Error if post not found or validation fails
   */
  async updatePost(id: string, data: UpdatePostData): Promise<Post> {
    if (!id || id.trim() === '') {
      throw new Error('Post ID is required')
    }

    // Check if update data is provided
    const hasUpdateData = Object.keys(data).length > 0
    if (!hasUpdateData) {
      throw new Error('Update data is required')
    }

    // Validate title if provided
    if (data.title !== undefined && data.title.trim() === '') {
      throw new Error('Title cannot be empty')
    }

    // Get existing post
    const existingPost = this.posts.get(id.trim())
    if (!existingPost) {
      throw new Error('Post not found')
    }

    // Create updated post
    const updatedPost: Post = {
      ...existingPost,
      title: data.title !== undefined ? data.title.trim() : existingPost.title,
      content: data.content !== undefined ? data.content.trim() : existingPost.content,
      published: data.published !== undefined ? data.published : existingPost.published,
      tags: data.tags !== undefined ? data.tags : existingPost.tags,
      updatedAt: new Date()
    }

    // Store updated post
    this.posts.set(id.trim(), updatedPost)

    return updatedPost
  }

  /**
   * Deletes a post by ID
   * @param id - The post ID
   * @returns Promise resolving to true if deleted, false if not found
   * @throws Error if ID is invalid
   */
  async deletePost(id: string): Promise<boolean> {
    if (!id || id.trim() === '') {
      throw new Error('Post ID is required')
    }

    return this.posts.delete(id.trim())
  }

  /**
   * Retrieves all posts with pagination and filtering
   * @param options - Query options including pagination and filters
   * @returns Promise resolving to paginated posts result
   */
  async getAllPosts(options: GetAllPostsOptions = {}): Promise<PaginatedPostsResult> {
    const { page = 1, limit = 10, filters } = options

    // Get all posts as array
    let allPosts = Array.from(this.posts.values())

    // Apply filters if provided
    if (filters) {
      allPosts = this.applyFilters(allPosts, filters)
    }

    // Calculate pagination
    const total = allPosts.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    // Get paginated posts
    const posts = allPosts.slice(startIndex, endIndex)

    return {
      posts,
      total,
      page,
      limit
    }
  }

  /**
   * Retrieves all posts by a specific author
   * @param authorId - The author ID
   * @returns Promise resolving to array of posts
   * @throws Error if author ID is invalid
   */
  async getPostsByAuthor(authorId: string): Promise<Post[]> {
    if (!authorId || authorId.trim() === '') {
      throw new Error('Author ID is required')
    }

    const allPosts = Array.from(this.posts.values())
    return allPosts.filter(post => post.authorId === authorId.trim())
  }

  /**
   * Publishes a post (sets published to true)
   * @param id - The post ID
   * @returns Promise resolving to the updated post
   * @throws Error if post not found
   */
  async publishPost(id: string): Promise<Post> {
    const post = await this.getPostById(id)
    if (!post) {
      throw new Error('Post not found')
    }

    return this.updatePost(id, { published: true })
  }

  /**
   * Unpublishes a post (sets published to false)
   * @param id - The post ID
   * @returns Promise resolving to the updated post
   * @throws Error if post not found
   */
  async unpublishPost(id: string): Promise<Post> {
    const post = await this.getPostById(id)
    if (!post) {
      throw new Error('Post not found')
    }

    return this.updatePost(id, { published: false })
  }

  /**
   * Applies filters to a list of posts
   * @param posts - Array of posts to filter
   * @param filters - Filter criteria
   * @returns Filtered array of posts
   */
  private applyFilters(posts: Post[], filters: PostFilters): Post[] {
    return posts.filter(post => {
      // Filter by author ID
      if (filters.authorId && post.authorId !== filters.authorId) {
        return false
      }

      // Filter by published status
      if (filters.published !== undefined && post.published !== filters.published) {
        return false
      }

      // Filter by tags (post must have at least one matching tag)
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => post.tags.includes(tag))
        if (!hasMatchingTag) {
          return false
        }
      }

      // Filter by search term (searches in title and content)
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase()
        const titleMatch = post.title.toLowerCase().includes(searchTerm)
        const contentMatch = post.content.toLowerCase().includes(searchTerm)
        if (!titleMatch && !contentMatch) {
          return false
        }
      }

      return true
    })
  }
}