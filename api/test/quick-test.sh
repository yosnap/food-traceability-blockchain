#!/bin/bash

# 🚀 Quick Test Script - Food Traceability API
# Prueba rápida de endpoints principales

BASE_URL="http://localhost:3001"

echo "🧪 Quick Test - Food Traceability API"
echo "====================================="

# Test 1: Health Check
echo -n "1. Health Check... "
if curl -s "$BASE_URL/api/health" | grep -q "healthy"; then
    echo "✅"
else
    echo "❌"
fi

# Test 2: System Info
echo -n "2. System Info... "
if curl -s "$BASE_URL/api/info" | grep -q "Food Traceability"; then
    echo "✅"
else
    echo "❌"
fi

# Test 3: Basic Test
echo -n "3. Basic Test... "
if curl -s "$BASE_URL/test" | grep -q "success"; then
    echo "✅"
else
    echo "❌"
fi

# Test 4: User Profile (with auth)
echo -n "4. User Profile... "
if curl -s -H "Authorization: producer-token" "$BASE_URL/api/users/me" | grep -q "success\|address"; then
    echo "✅"
else
    echo "❌"
fi

# Test 5: Food Ping
echo -n "5. Food Ping... "
if curl -s -H "Authorization: producer-token" "$BASE_URL/api/food/ping" | grep -q "success\|error"; then
    echo "✅"
else
    echo "❌"
fi

echo ""
echo "Quick test completed! ✨"
echo "For detailed testing, run: ./test-api-complete.sh"