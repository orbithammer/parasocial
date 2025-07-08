// backend/fix-test-imports.js
// Version: 1.0.0 - Fix incorrect import paths in test files
// Run with: node fix-test-imports.js

const fs = require('fs')
const path = require('path')

// Test files with wrong import paths
const filesToFix = [
  'src/middleware/__tests__/postValidationMiddleware.test.ts',
  'src/middleware/__tests__/followValidationMiddleware.test.ts'
]

console.log('🔧 Fixing import paths in test files...')

filesToFix.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`\n📁 Processing: ${filePath}`)
    
    let content = fs.readFileSync(filePath, 'utf8')
    
    // Fix import paths - remove the extra ../../src/ prefix
    const fixes = [
      {
        from: "from '../../src/middleware/postValidationMiddleware'",
        to: "from '../postValidationMiddleware'"
      },
      {
        from: "from '../../src/middleware/followValidationMiddleware'",
        to: "from '../followValidationMiddleware'"
      },
      {
        from: '../../src/middleware/postValidationMiddleware',
        to: '../postValidationMiddleware'
      },
      {
        from: '../../src/middleware/followValidationMiddleware', 
        to: '../followValidationMiddleware'
      }
    ]
    
    let changed = false
    fixes.forEach(fix => {
      if (content.includes(fix.from)) {
        content = content.replace(new RegExp(fix.from, 'g'), fix.to)
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

console.log('\n✨ Import path fixes completed!')
console.log('\n🚀 Now run: npm run test')