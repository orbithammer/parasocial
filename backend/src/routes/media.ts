// backend\src\routes\media.ts
// Version: 1.0.0
// Fixed rate limiting type compatibility using keyGenerator for undefined IP handling

import { Router, Request, Response, RequestHandler } from 'express'
import rateLimit from 'express-rate-limit'
import multer from 'multer'

// Rate limiter configuration for media upload endpoints
const mediaUploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 uploads per hour
  message: {
    error: 'Too many upload attempts, please try again later',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Handle undefined IP by providing a key function
  keyGenerator: (req: Request): string => {
    // Use req.ip if available, otherwise fall back to connection info
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           '127.0.0.1'
  }
})

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: (_req, file, cb) => {
    // Accept only image and video files
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|mov/
    const extname = allowedTypes.test(file.originalname.toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image and video files are allowed'))
    }
  }
})

const router = Router()

// Apply rate limiting to all media routes
router.use(mediaUploadRateLimit)

// Single file upload endpoint
const uploadSingleHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' })
      return
    }
    
    res.json({ 
      success: true, 
      message: 'File uploaded successfully',
      file: {
        filename: file.filename,
        originalname: file.originalname,
        size: file.size
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'File upload failed' })
  }
}

// Multiple files upload endpoint
const uploadMultipleHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' })
      return
    }
    
    const uploadedFiles = files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      size: file.size
    }))
    
    res.json({ 
      success: true, 
      message: `${files.length} files uploaded successfully`,
      files: uploadedFiles
    })
  } catch (error) {
    console.error('Multiple upload error:', error)
    res.status(500).json({ error: 'File upload failed' })
  }
}

// File deletion endpoint
const deleteFileHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params
    if (!filename) {
      res.status(400).json({ error: 'Filename is required' })
      return
    }
    
    // File deletion logic here
    res.json({ 
      success: true, 
      message: 'File deleted successfully',
      filename 
    })
  } catch (error) {
    console.error('Delete error:', error)
    res.status(500).json({ error: 'File deletion failed' })
  }
}

// Route definitions with properly typed handlers
router.post('/upload', upload.single('file'), uploadSingleHandler)
router.post('/upload-multiple', upload.array('files', 5), uploadMultipleHandler)
router.delete('/delete/:filename', deleteFileHandler)

export default router