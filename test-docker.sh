#!/bin/bash

# Docker Test Script for Merged PDF Functionality
# This script automates the Docker testing process

set -e  # Exit on error

echo "================================"
echo "Docker Test Script for PDF Generator"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}: $2"
    else
        echo -e "${RED}✗ FAILED${NC}: $2"
        exit 1
    fi
}

# Step 1: Build and Start Containers
echo "Step 1: Building and starting Docker containers..."
docker-compose up -d --build
print_result $? "Container build and start"
echo ""

# Step 2: Wait for container to be healthy
echo "Step 2: Waiting for container to be healthy..."
sleep 10
docker-compose ps
print_result $? "Container status check"
echo ""

# Step 3: Check health endpoint
echo "Step 3: Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
echo "Health response: $HEALTH_RESPONSE"
if echo "$HEALTH_RESPONSE" | grep -q '"status":"OK"'; then
    print_result 0 "Health endpoint check"
else
    print_result 1 "Health endpoint check"
fi
echo ""

# Step 4: Test merged PDF generation with 2 URLs
echo "Step 4: Testing merged PDF generation (2 URLs)..."
PDF_RESPONSE=$(curl -s -X POST http://localhost:3000/generate-merged-pdf \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://example.com","https://www.ietf.org"]}')
echo "PDF response: $PDF_RESPONSE"
if echo "$PDF_RESPONSE" | grep -q '"success":true'; then
    print_result 0 "Merged PDF generation (2 URLs)"
else
    print_result 1 "Merged PDF generation (2 URLs)"
fi
echo ""

# Step 5: Test invalid URL validation
echo "Step 5: Testing invalid URL validation..."
INVALID_RESPONSE=$(curl -s -X POST http://localhost:3000/generate-merged-pdf \
  -H "Content-Type: application/json" \
  -d '{"urls":["not-a-valid-url"]}')
echo "Invalid URL response: $INVALID_RESPONSE"
if echo "$INVALID_RESPONSE" | grep -q '"error":"Invalid URL format provided"'; then
    print_result 0 "Invalid URL validation"
else
    print_result 1 "Invalid URL validation"
fi
echo ""

# Step 6: Check container logs
echo "Step 6: Checking container logs for errors..."
echo "--- Container Logs ---"
docker-compose logs pdf-generator
echo "--- End Logs ---"
echo ""

# Step 7: Display container stats
echo "Step 7: Container resource usage..."
docker stats webpage-pdf-generator --no-stream
echo ""

# Step 8: Clean up
echo "Step 8: Stopping and removing containers..."
docker-compose down
print_result $? "Container cleanup"
echo ""

echo "================================"
echo -e "${GREEN}All Docker tests completed successfully!${NC}"
echo "================================"
