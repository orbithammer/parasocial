// backend\src\controllers\UserController.ts
// Version: 1.2
// Removed unused interface and cleaned up imports

import { Request, Response } from 'express'
import { ParsedQs } from 'qs'

// Interface for user creation request
interface CreateUserRequest {
  username: string
  email: string
  password: string
  firstName?: string
  lastName?: string
}

// Interface for user update request
interface UpdateUserRequest {
  username?: string
  email?: string
  firstName?: string
  lastName?: string
  isActive?: boolean
}

export class UserController {
  /**
   * Retrieves paginated list of users with optional filtering
   * @param req - Express request object with query parameters
   * @param res - Express response object
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      // Access query parameters using bracket notation to satisfy TypeScript
      const page = req.query['page']
      const limit = req.query['limit']
      const search = req.query['search']
      const sortBy = req.query['sortBy']
      const sortOrder = req.query['sortOrder']

      // Parse and validate pagination parameters
      const parsedPage = this.parseIntegerParam(page, 1)
      const parsedLimit = this.parseIntegerParam(limit, 10)
      const parsedSearch = this.parseStringParam(search)
      const parsedSortBy = this.parseStringParam(sortBy, 'createdAt')
      const parsedSortOrder = this.parseSortOrder(sortOrder, 'desc')

      // Validate page and limit ranges
      if (parsedPage < 1) {
        res.status(400).json({ error: 'Page must be greater than 0' })
        return
      }

      if (parsedLimit < 1 || parsedLimit > 100) {
        res.status(400).json({ error: 'Limit must be between 1 and 100' })
        return
      }

      // TODO: Replace with actual database query
      // const users = await UserService.findPaginated({
      //   page: parsedPage,
      //   limit: parsedLimit,
      //   search: parsedSearch,
      //   sortBy: parsedSortBy,
      //   sortOrder: parsedSortOrder
      // })
      // const totalCount = await UserService.getTotalCount(parsedSearch)

      // Calculate pagination metadata
      const totalPages = Math.ceil(100 / parsedLimit) // Placeholder total count
      const hasNextPage = parsedPage < totalPages
      const hasPreviousPage = parsedPage > 1

      res.status(200).json({
        message: 'Users retrieved successfully',
        data: [], // Placeholder until database integration
        pagination: {
          currentPage: parsedPage,
          totalPages,
          totalItems: 100, // Placeholder total count
          itemsPerPage: parsedLimit,
          hasNextPage,
          hasPreviousPage
        },
        filters: {
          search: parsedSearch,
          sortBy: parsedSortBy,
          sortOrder: parsedSortOrder
        }
      })
    } catch (error) {
      console.error('Error retrieving users:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Retrieves a single user by ID
   * @param req - Express request object with user ID parameter
   * @param res - Express response object
   */
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      if (!id) {
        res.status(400).json({ error: 'User ID is required' })
        return
      }

      // TODO: Replace with actual database query
      // const user = await UserService.findById(id)
      
      // Placeholder response
      res.status(200).json({
        message: 'User retrieved successfully',
        data: {
          id,
          username: 'placeholder',
          email: 'placeholder@example.com'
        }
      })
    } catch (error) {
      console.error('Error retrieving user:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Creates a new user
   * @param req - Express request object with user data
   * @param res - Express response object
   */
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password, firstName, lastName } = req.body as CreateUserRequest

      // Validate required fields
      if (!username || !email || !password) {
        res.status(400).json({ error: 'Username, email, and password are required' })
        return
      }

      // Validate email format
      if (!this.isValidEmail(email)) {
        res.status(400).json({ error: 'Invalid email format' })
        return
      }

      // Create user data object
      const userData: CreateUserRequest = {
        username: String(username).trim(),
        email: String(email).trim().toLowerCase(),
        password: String(password)
      }

      // Add optional fields if provided
      if (firstName) {
        userData.firstName = String(firstName).trim()
      }

      if (lastName) {
        userData.lastName = String(lastName).trim()
      }

      // TODO: Replace with actual database save and password hashing
      // const hashedPassword = await bcrypt.hash(userData.password, 10)
      // const newUser = await UserService.create({ ...userData, password: hashedPassword })

      res.status(201).json({
        message: 'User created successfully',
        data: {
          id: 'placeholder-id',
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName
        }
      })
    } catch (error) {
      console.error('Error creating user:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Updates an existing user
   * @param req - Express request object with user ID and update data
   * @param res - Express response object
   */
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const updateData = req.body as UpdateUserRequest

      if (!id) {
        res.status(400).json({ error: 'User ID is required' })
        return
      }

      // Validate email format if provided
      if (updateData.email && !this.isValidEmail(updateData.email)) {
        res.status(400).json({ error: 'Invalid email format' })
        return
      }

      // Build update object with only provided fields
      const validatedUpdateData: UpdateUserRequest = {}

      if (updateData.username) {
        validatedUpdateData.username = String(updateData.username).trim()
      }

      if (updateData.email) {
        validatedUpdateData.email = String(updateData.email).trim().toLowerCase()
      }

      if (updateData.firstName) {
        validatedUpdateData.firstName = String(updateData.firstName).trim()
      }

      if (updateData.lastName) {
        validatedUpdateData.lastName = String(updateData.lastName).trim()
      }

      if (typeof updateData.isActive === 'boolean') {
        validatedUpdateData.isActive = updateData.isActive
      }

      // TODO: Replace with actual database update
      // const updatedUser = await UserService.update(id, validatedUpdateData)

      res.status(200).json({
        message: 'User updated successfully',
        data: {
          id,
          ...validatedUpdateData
        }
      })
    } catch (error) {
      console.error('Error updating user:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Parses a query parameter as an integer with a default value
   * @param param - Express query parameter value
   * @param defaultValue - Default value if parsing fails
   * @returns Parsed integer or default value
   */
  private parseIntegerParam(param: string | ParsedQs | (string | ParsedQs)[] | undefined, defaultValue: number): number {
    if (typeof param === 'string') {
      const parsed = parseInt(param, 10)
      return isNaN(parsed) ? defaultValue : parsed
    }
    return defaultValue
  }

  /**
   * Parses a query parameter as a string with optional default value
   * @param param - Express query parameter value
   * @param defaultValue - Default value if parsing fails
   * @returns Parsed string or default value
   */
  private parseStringParam(param: string | ParsedQs | (string | ParsedQs)[] | undefined, defaultValue?: string): string | undefined {
    if (typeof param === 'string') {
      return param.trim()
    }
    return defaultValue
  }

  /**
   * Parses sort order parameter
   * @param param - Express query parameter value
   * @param defaultValue - Default sort order
   * @returns Valid sort order
   */
  private parseSortOrder(param: string | ParsedQs | (string | ParsedQs)[] | undefined, defaultValue: 'asc' | 'desc'): 'asc' | 'desc' {
    if (typeof param === 'string' && (param === 'asc' || param === 'desc')) {
      return param
    }
    return defaultValue
  }

  /**
   * Validates email format using regex
   * @param email - Email string to validate
   * @returns True if email is valid format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}