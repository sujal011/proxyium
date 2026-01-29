#!/bin/bash

# Web Proxy Startup Script
# This script helps start, stop, and manage the proxy application

set -e

BACKEND_DIR="/app/server"
FRONTEND_DIR="/app/frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Function to check if a service is running
check_service() {
    if pgrep -f "$1" > /dev/null; then
        return 0
    else
        return 1
    fi
}

case "$1" in
    start)
        print_info "Starting Web Proxy Application..."
        
        # Start backend
        cd $BACKEND_DIR
        if check_service "node index.js"; then
            print_info "Backend already running"
        else
            nohup node index.js > /tmp/proxy_backend.log 2>&1 &
            sleep 2
            if check_service "node index.js"; then
                print_status "Backend started on port 8001"
            else
                print_error "Failed to start backend"
                exit 1
            fi
        fi
        
        # Start frontend
        cd $FRONTEND_DIR
        if check_service "react-scripts start"; then
            print_info "Frontend already running"
        else
            nohup yarn start > /tmp/proxy_frontend.log 2>&1 &
            sleep 5
            if check_service "react-scripts start"; then
                print_status "Frontend started on port 3000"
            else
                print_error "Failed to start frontend"
                exit 1
            fi
        fi
        
        print_status "Web Proxy Application is running!"
        print_info "Backend: http://localhost:8001"
        print_info "Frontend: http://localhost:3000"
        ;;
        
    stop)
        print_info "Stopping Web Proxy Application..."
        
        # Stop backend
        if pkill -f "node index.js"; then
            print_status "Backend stopped"
        else
            print_info "Backend not running"
        fi
        
        # Stop frontend
        if pkill -f "react-scripts start"; then
            print_status "Frontend stopped"
        else
            print_info "Frontend not running"
        fi
        
        print_status "Web Proxy Application stopped"
        ;;
        
    restart)
        print_info "Restarting Web Proxy Application..."
        $0 stop
        sleep 2
        $0 start
        ;;
        
    status)
        print_info "Checking Web Proxy Application status..."
        
        if check_service "node index.js"; then
            print_status "Backend: Running"
        else
            print_error "Backend: Not running"
        fi
        
        if check_service "react-scripts start"; then
            print_status "Frontend: Running"
        else
            print_error "Frontend: Not running"
        fi
        ;;
        
    logs)
        case "$2" in
            backend)
                print_info "Backend logs:"
                tail -f /tmp/proxy_backend.log
                ;;
            frontend)
                print_info "Frontend logs:"
                tail -f /tmp/proxy_frontend.log
                ;;
            *)
                print_info "Usage: $0 logs [backend|frontend]"
                exit 1
                ;;
        esac
        ;;
        
    test)
        print_info "Testing Web Proxy Application..."
        
        # Test backend health
        if curl -s http://localhost:8001/api/health | grep -q "ok"; then
            print_status "Backend health check: OK"
        else
            print_error "Backend health check: FAILED"
            exit 1
        fi
        
        # Test proxy functionality
        if curl -s "http://localhost:8001/api/proxy?url=https://example.com" | grep -q "Example Domain"; then
            print_status "Proxy functionality: OK"
        else
            print_error "Proxy functionality: FAILED"
            exit 1
        fi
        
        print_status "All tests passed!"
        ;;
        
    *)
        echo "Web Proxy Management Script"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|test}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the application"
        echo "  stop     - Stop the application"
        echo "  restart  - Restart the application"
        echo "  status   - Check if services are running"
        echo "  logs     - View logs (use: logs backend|frontend)"
        echo "  test     - Run basic functionality tests"
        exit 1
        ;;
esac

exit 0
