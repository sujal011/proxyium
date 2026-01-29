#!/bin/bash

# Comprehensive Proxy Testing Script

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

test_passed() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

test_failed() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

test_info() {
    echo -e "${YELLOW}→${NC} $1"
}

echo "============================================"
echo "Web Proxy Application Test Suite"
echo "============================================"
echo ""

# Test 1: Backend Health Check
test_info "Test 1: Backend health check"
if curl -s http://localhost:8001/api/health | grep -q "ok"; then
    test_passed "Backend is healthy"
else
    test_failed "Backend health check failed"
fi

# Test 2: Proxy Simple HTML
test_info "Test 2: Proxy simple HTML (example.com)"
RESPONSE=$(curl -s "http://localhost:8001/api/proxy?url=https://example.com")
if echo "$RESPONSE" | grep -q "Example Domain"; then
    test_passed "Successfully proxied HTML content"
else
    test_failed "Failed to proxy HTML content"
fi

# Test 3: URL Rewriting in HTML
test_info "Test 3: URL rewriting in HTML"
if echo "$RESPONSE" | grep -q "data-proxy-link"; then
    test_passed "Links are being rewritten with proxy attributes"
else
    test_failed "URL rewriting not working"
fi

# Test 4: Interceptor Script Injection
test_info "Test 4: Interceptor script injection"
if echo "$RESPONSE" | grep -q "data-proxy-interceptor"; then
    test_passed "Interceptor script is injected"
else
    test_failed "Interceptor script not injected"
fi

# Test 5: HTTPS Support
test_info "Test 5: HTTPS website proxying"
if curl -s "http://localhost:8001/api/proxy?url=https://info.cern.ch" | grep -q "CERN"; then
    test_passed "HTTPS proxying works"
else
    test_failed "HTTPS proxying failed"
fi

# Test 6: Invalid URL Handling
test_info "Test 6: Invalid URL error handling"
if curl -s "http://localhost:8001/api/proxy?url=invalid-url" | grep -q "error"; then
    test_passed "Invalid URLs are handled properly"
else
    test_failed "Invalid URL handling not working"
fi

# Test 7: Missing URL Parameter
test_info "Test 7: Missing URL parameter"
if curl -s "http://localhost:8001/api/proxy" | grep -q "required"; then
    test_passed "Missing parameter validation works"
else
    test_failed "Missing parameter not validated"
fi

# Test 8: Frontend Accessibility
test_info "Test 8: Frontend is accessible"
if curl -s http://localhost:3000 | grep -q "Internal Web Proxy"; then
    test_passed "Frontend is serving correctly"
else
    test_failed "Frontend not accessible"
fi

# Test 9: CORS Headers
test_info "Test 9: CORS headers present"
HEADERS=$(curl -sI "http://localhost:8001/api/health")
if echo "$HEADERS" | grep -qi "access-control-allow-origin"; then
    test_passed "CORS headers are present"
else
    test_failed "CORS headers missing"
fi

# Test 10: Content-Type Detection
test_info "Test 10: Content-Type handling"
HEADERS=$(curl -sI "http://localhost:8001/api/proxy?url=https://example.com")
if echo "$HEADERS" | grep -qi "content-type"; then
    test_passed "Content-Type header is set"
else
    test_failed "Content-Type header missing"
fi

echo ""
echo "============================================"
echo "Test Results Summary"
echo "============================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed ✗${NC}"
    exit 1
fi
