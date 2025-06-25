@echo off
REM setup.bat - Windows batch script for ParaSocial backend setup

echo 🚀 Setting up ParaSocial backend...

REM Navigate to backend directory
cd backend

echo 📦 Installing dependencies...
call npm install

echo 🗄️ Setting up database...
REM Generate Prisma client
call npm run db:generate

REM Push database schema (creates tables)  
call npm run db:push

echo ✅ Setup complete!
echo.
echo 🔥 To start development:
echo 1. Run: npm run dev (from project root)
echo 2. Create test data: POST http://localhost:3001/api/v1/dev/seed
echo 3. Visit: http://localhost:3000/test
echo.
echo 🛠️ Available endpoints:
echo - Health: GET http://localhost:3001/health
echo - Status: GET http://localhost:3001/api/v1/status  
echo - Posts: GET http://localhost:3001/api/v1/posts
echo - Users: GET http://localhost:3001/api/v1/users/:username
echo.
pause