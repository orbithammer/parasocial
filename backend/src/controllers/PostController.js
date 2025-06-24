// backend/src/controllers/PostController.js
// Post management controller with CRUD operations for posts

/**
 * Post controller class
 * Handles HTTP requests for post operations
 */
export class PostController {
  constructor(postRepository, userRepository) {
    this.postRepository = postRepository
    this.userRepository = userRepository
  }

  /**
   * Create a new post
   * POST /posts
   */
  async createPost(req, res) {
    try {
      // Validate required fields
      const { content, contentWarning, isScheduled, scheduledFor } = req.body

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Post content is required'
        })
      }

      if (content.length > 5000) {
        return res.status(400).json({
          success: false,
          error: 'Post content cannot exceed 5000 characters'
        })
      }

      // Validate scheduled post data
      if (isScheduled && !scheduledFor) {
        return res.status(400).json({
          success: false,
          error: 'Scheduled posts must include scheduledFor date'
        })
      }

      if (isScheduled && new Date(scheduledFor) <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Scheduled date must be in the future'
        })
      }

      // Create post data
      const postData = {
        content: content.trim(),
        contentWarning: contentWarning?.trim() || null,
        isScheduled: Boolean(isScheduled),
        scheduledFor: isScheduled ? new Date(scheduledFor) : null,
        isPublished: !isScheduled,
        publishedAt: !isScheduled ? new Date() : null,
        authorId: req.user.id
      }

      // Create the post
      const newPost = await this.postRepository.create(postData)

      // Return post with author information
      res.status(201).json({
        success: true,
        data: newPost
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create post',
        message: error.message
      })
    }
  }

  /**
   * Get public feed of all posts
   * GET /posts
   */
  async getPosts(req, res) {
    try {
      // Parse pagination parameters
      const page = Math.max(1, parseInt(req.query.page) || 1)
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
      const offset = (page - 1) * limit

      // Get posts with pagination
      const result = await this.postRepository.findManyWithPagination({
        offset,
        limit,
        includeAuthor: true,
        includeMedia: true,
        onlyPublished: true
      })

      // Filter out current user's own posts if they're logged in
      let filteredPosts = result.posts
      if (req.user) {
        filteredPosts = result.posts.filter(post => post.authorId !== req.user.id)
      }

      // Calculate adjusted pagination
      const totalPages = Math.ceil(result.totalCount / limit)

      res.json({
        success: true,
        data: {
          posts: filteredPosts,
          pagination: {
            currentPage: page,
            totalPages,
            totalPosts: result.totalCount,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch posts',
        message: error.message
      })
    }
  }

  /**
   * Get specific post by ID
   * GET /posts/:id
   */
  async getPostById(req, res) {
    try {
      const { id } = req.params

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Post ID is required'
        })
      }

      // Find post with author and media
      const post = await this.postRepository.findByIdWithAuthorAndMedia(id)

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        })
      }

      // Check if post is published (unless it's the author viewing)
      if (!post.isPublished && (!req.user || req.user.id !== post.authorId)) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        })
      }

      res.json({
        success: true,
        data: post
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch post',
        message: error.message
      })
    }
  }

  /**
   * Delete own post
   * DELETE /posts/:id
   */
  async deletePost(req, res) {
    try {
      const { id } = req.params

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Post ID is required'
        })
      }

      // Find post to verify ownership
      const post = await this.postRepository.findById(id)

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        })
      }

      // Verify the user owns the post
      if (post.authorId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own posts'
        })
      }

      // Delete the post
      await this.postRepository.delete(id)

      res.json({
        success: true,
        message: 'Post deleted successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete post',
        message: error.message
      })
    }
  }

  /**
   * Get posts by specific user
   * GET /users/:username/posts
   */
  async getUserPosts(req, res) {
    try {
      const { username } = req.params

      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        })
      }

      // Find user first
      const user = await this.userRepository.findByUsername(username)

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        })
      }

      // Parse pagination parameters
      const page = Math.max(1, parseInt(req.query.page) || 1)
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
      const offset = (page - 1) * limit

      // Get user's posts
      const result = await this.postRepository.findManyByAuthorId(user.id, {
        offset,
        limit,
        includeAuthor: true,
        includeMedia: true,
        onlyPublished: true
      })

      const totalPages = Math.ceil(result.totalCount / limit)

      res.json({
        success: true,
        data: {
          posts: result.posts,
          pagination: {
            currentPage: page,
            totalPages,
            totalPosts: result.totalCount,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user posts',
        message: error.message
      })
    }
  }
}