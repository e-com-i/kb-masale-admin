#!/bin/bash

echo "🚀 E-Commerce Admin Setup Script"
echo "=================================="
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ npm found: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found. Creating from template..."
    echo "GITHUB_TOKEN=your_github_personal_access_token_here" > .env.local
    echo "✅ Created .env.local"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env.local and add your GitHub Personal Access Token"
echo "      Get token from: https://github.com/settings/tokens"
echo "      Required scope: repo"
echo ""
echo "   2. Run the development server:"
echo "      npm run dev"
echo ""
echo "   3. Open http://localhost:3000 in your browser"
echo ""
echo "📖 Read README.md for detailed instructions"
echo ""
