// backend/debug-test-connection.js
// Version: 1.0.0
// Debug script to check what database URL the test environment is using

// Force set environment variables
process.env['DATABASE_URL'] = 'postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial_test'
process.env['TEST_DATABASE_URL'] = 'postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial_test'
process.env['NODE_ENV'] = 'test'

console.log('🔍 Environment Variables:')
console.log('DATABASE_URL:', process.env.DATABASE_URL)
console.log('TEST_DATABASE_URL:', process.env.TEST_DATABASE_URL)
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('')

// Try to create Prisma client and connect
const { PrismaClient } = require('@prisma/client')

async function testConnection() {
  console.log('🔗 Testing Prisma Connection...')
  
  // Test with explicit datasource
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial_test'
      }
    }
  })

  try {
    // Try to connect
    await prisma.$connect()
    console.log('✅ Prisma connection successful!')
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT current_database() as db_name`
    console.log('📊 Connected to database:', result[0].db_name)
    
    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    console.log('📋 Tables found:', tables.map(t => t.table_name))
    
  } catch (error) {
    console.error('❌ Prisma connection failed:')
    console.error(error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()

// backend/debug-test-connection.js