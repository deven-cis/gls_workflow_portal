#!/bin/bash

# Setup Script for GLS Workflow Portal
# This script sets up Node.js, installs dependencies, and starts the dev server

set -e  # Exit on error

echo "🚀 GLS Workflow Portal - Setup Script"
echo "======================================"
echo ""

# Check if nvm is available
if ! command -v nvm &> /dev/null; then
    echo "⚠️  nvm (Node Version Manager) not found"
    echo "Install nvm from: https://github.com/nvm-sh/nvm"
    echo "Then run this script again"
    exit 1
fi

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "📦 Installing Node.js from .nvmrc..."
nvm install
nvm use

echo ""
echo "✅ Node.js $(node -v)"
echo "✅ npm $(npm -v)"
echo ""

# Install dependencies
echo "📥 Installing dependencies..."
if [ -f "pnpm-lock.yaml" ]; then
    echo "Using pnpm..."
    pnpm install
elif [ -f "yarn.lock" ]; then
    echo "Using yarn..."
    yarn install
else
    echo "Using npm..."
    npm install
fi

echo ""
echo "✅ Dependencies installed!"
echo ""

# Show next steps
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start dev server: npm run dev"
echo "2. Open: http://localhost:3000/dashboard/my_tasks"
echo "3. Check mock API in Network tab (DevTools)"
echo ""
echo "To connect FastAPI backend:"
echo "1. Update .env.local: NEXT_PUBLIC_API_URL=http://localhost:8000/api"
echo "2. Restart dev server: npm run dev"
echo "3. See TESTING_GUIDE.md for FastAPI setup"
echo ""
echo "For more info, read:"
echo "- COMPLETION_SUMMARY.md (overview)"
echo "- QUICK_START.md (quick reference)"
echo "- ARCHITECTURE.md (full architecture)"
echo "- TESTING_GUIDE.md (testing & integration)"
echo ""
