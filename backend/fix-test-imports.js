// backend/fix-test-imports.js
// Version: 1.0.0 - Fix specific import path issues causing test failures
// Run with: node fix-test-imports.js

const fs = require('fs')
const path = require('path')

console.log('🔧 Fixing import paths in test files...')

// Specific files with import issues based on test output
const filesToFix = [
  {
    path: 'src/controllers/__tests__/FollowController.test.ts',
    fixes: [
      {
        from: "from '../../src/controllers/FollowController'",
        to: "from '../FollowController'"
      }
    ]
  },
  {
    path: 'src/controllers/__tests__/PostController.test.ts', 
    fixes: [
      {
        from: "from '../../src/controllers/PostController.js'",
        to: "from '../PostController'"
      },
      {
        from: "from '../../src/controllers/PostController'",
        to: "from '../PostController'"
      }
    ]
  },
  {
    path: 'src/repositories/__tests__/PostRepository.test.ts',
    fixes: [
      {
        from: "from '../../src/repositories/PostRepository'",
        to: "from '../PostRepository'"
      }
    ]
  },
  {
    path: 'src/repositories/__tests__/PostRepository.create.test.ts',
    fixes: [
      {
        from: "from '../../src/repositories/PostRepository.js'",
        to: "from '../PostRepository'"
      },
      {
        from: "from '../../src/repositories/PostRepository'", 
        to: "from '../PostRepository'"
      }
    ]
  }
]

filesToFix.forEach(file => {
  const filePath = file.path
  
  if (fs.existsSync(filePath)) {
    console.log(`\n📁 Processing: ${filePath}`)
    
    let content = fs.readFileSync(filePath, 'utf8')
    let changed = false
    
    file.fixes.forEach(fix => {
      if (content.includes(fix.from)) {
        content = content.replace(new RegExp(fix.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fix.to)
        console.log(`  ✅ Fixed: ${fix.from} → ${fix.to}`)
        changed = true
      }
    })
    
    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`  💾 Saved changes to ${filePath}`)
    } else {
      console.log(`  ℹ️  No changes needed in ${filePath}`)
    }
  } else {
    console.log(`  ❌ File not found: ${filePath}`)
  }
})

// Create .env file if it doesn't exist
if (!fs.existsSync('.env')) {
  console.log('\n📝 Creating .env file...')
  const envContent = `# Test Environment Variables
NODE_ENV=test
DATABASE_URL="file:./test.db"
JWT_SECRET="test-secret-key-for-testing-only"
BASE_URL="http://localhost:3001"
PORT=3001
`
  fs.writeFileSync('.env', envContent)
  console.log('✅ Created .env file with test configuration')
} else {
  console.log('\n📄 .env file already exists')
}

console.log('\n✨ Import path fixes completed!')
console.log('\n🚀 Next steps:')
console.log('1. Run: npx prisma generate')
console.log('2. Run: npm run test:quick')
console.log('3. If integration tests still fail, run: npx prisma db push')