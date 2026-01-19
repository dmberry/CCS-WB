#!/bin/bash

# CCS-WB - Development Environment Setup
# This script initializes and runs the development environment

set -e

echo "======================================"
echo "   CCS-WB - Setup & Run"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required tools
check_requirement() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is required but not installed.${NC}"
        echo "Please install $1 and try again."
        exit 1
    fi
}

echo "Checking requirements..."
check_requirement node
check_requirement npm
check_requirement python3
check_requirement pip3

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ is required (found v$NODE_VERSION)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)
if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 10 ]); then
    echo -e "${RED}Error: Python 3.10+ is required (found $PYTHON_VERSION)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python $PYTHON_VERSION${NC}"

# Setup environment variables
if [ ! -f .env.local ]; then
    echo ""
    echo -e "${YELLOW}Creating .env.local from template...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env.local
        echo -e "${YELLOW}Please edit .env.local and add your API keys:${NC}"
        echo "  - ANTHROPIC_API_KEY (Claude API)"
        echo "  - SEMANTIC_SCHOLAR_API_KEY (optional, for higher rate limits)"
    else
        cat > .env.local << 'EOF'
# CCS-WB Environment Variables
# Copy this to .env.local and fill in your values

# Claude API (Optional - can configure in browser)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Semantic Scholar API (Optional - for higher rate limits)
SEMANTIC_SCHOLAR_API_KEY=

# Python Analysis Service URL (for local development)
PYTHON_ANALYSIS_SERVICE_URL=http://localhost:8000

# Node environment
NODE_ENV=development
EOF
        echo -e "${YELLOW}Created .env.local - Please add your API keys${NC}"
    fi
fi

# Install Next.js dependencies
echo ""
echo "Installing Next.js dependencies..."
if [ -f package.json ]; then
    npm install
    echo -e "${GREEN}✓ Next.js dependencies installed${NC}"
else
    echo -e "${YELLOW}No package.json found - will be created during project setup${NC}"
fi

# Setup Python virtual environment and install dependencies
echo ""
echo "Setting up Python analysis service..."
PYTHON_SERVICE_DIR="./analysis-service"

if [ -d "$PYTHON_SERVICE_DIR" ]; then
    cd "$PYTHON_SERVICE_DIR"

    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        echo "Creating Python virtual environment..."
        python3 -m venv venv
    fi

    # Activate and install dependencies
    source venv/bin/activate

    if [ -f requirements.txt ]; then
        echo "Installing Python dependencies..."
        pip install -r requirements.txt
        echo -e "${GREEN}✓ Python dependencies installed${NC}"
    else
        echo -e "${YELLOW}No requirements.txt found - will be created during project setup${NC}"
    fi

    cd ..
else
    echo -e "${YELLOW}Analysis service directory not found - will be created during project setup${NC}"
fi

echo ""
echo "======================================"
echo "   Starting Development Servers"
echo "======================================"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Python analysis service if it exists
if [ -d "$PYTHON_SERVICE_DIR" ] && [ -f "$PYTHON_SERVICE_DIR/main.py" ]; then
    echo "Starting Python analysis service on http://localhost:8000..."
    cd "$PYTHON_SERVICE_DIR"
    source venv/bin/activate
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
    PYTHON_PID=$!
    cd ..
    sleep 2
    echo -e "${GREEN}✓ Python service started (PID: $PYTHON_PID)${NC}"
fi

# Start Next.js development server
if [ -f package.json ]; then
    echo "Starting Next.js development server on http://localhost:3000..."
    npm run dev &
    NEXT_PID=$!
    echo -e "${GREEN}✓ Next.js server started (PID: $NEXT_PID)${NC}"
fi

echo ""
echo "======================================"
echo -e "${GREEN}   CCS-WB is running!${NC}"
echo "======================================"
echo ""
echo "Access the application:"
echo "  - Frontend:        http://localhost:3000"
echo "  - Python API:      http://localhost:8000"
echo "  - API Docs:        http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for all background processes
wait
