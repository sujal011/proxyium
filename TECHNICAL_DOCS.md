# Web Proxy - Technical Documentation

## Architecture Deep Dive

### System Components

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌─────────────┐
│   Browser   │─────▶│React Frontend│─────▶│Node.js/     │─────▶│  Target     │
│             │      │              │      │Express      │      │  Website    │
│             │◀─────│              │◀─────│  Backend    │◀─────│             │
└─────────────┘      └──────────────┘      └─────────────┘      └─────────────┘
     │                      │                      │
     │                      │                      │
     ▼                      ▼                      ▼
User Input          Direct HTML           URL Rewriting
Navigation          Injection             & Proxying
```

## Backend Implementation

### Express Server (index.js)

**Purpose**: Main server entry point
- Initializes Express app
- Configures CORS middleware
- Mounts proxy routes at `/api/proxy`
- Provides health check endpoint

**Key Configuration**:
```javascript
- Port: 8001 (from PROXY_PORT env var)
- Body parser limit: 50mb (for large form submissions)
- CORS: Enabled for all origins
- Host: 0.0.0.0 (accepts external connections)
```

### Proxy Routes (routes/proxy.js)

**Route Handler**: `router.all('/', async (req, res))`

**Request Flow**:
1. Extract target URL from query param or body
2. Validate URL format
3. Build request headers (User-Agent, Accept, etc.)
4. Handle different HTTP methods (GET, POST, PUT, etc.)
5. Forward request to target URL using node-fetch
6. Process response based on content type
7. Rewrite URLs if HTML/CSS
8. Send response back to client

**Content Type Processing**:
- `text/html` → HTML rewriting with Cheerio
- `text/css` → CSS URL rewriting
- `application/json` → Pass-through
- `image/*` → Binary pass-through
- Other → Automatic handling

**Header Filtering**:
Removes problematic headers that would break the proxy:
- content-encoding (we decode)
- transfer-encoding (we re-encode)
- content-security-policy (would block injection)
- x-frame-options (would prevent iframe if needed)
- strict-transport-security (unnecessary)

### URL Rewriter (utils/rewriter.js)

**HTML Rewriting Function**: `rewriteHtml(html, baseUrl)`

**Rewriting Strategy**:
1. Parse HTML with Cheerio (jQuery-like API)
2. Find all URL-containing attributes
3. Convert relative URLs to absolute
4. Wrap absolute URLs in proxy endpoint
5. Add data attributes for client-side handling
6. Inject interceptor script

**Elements Rewritten**:
```javascript
<a href>           → Links
<link href>        → Stylesheets
<script src>       → Scripts
<img src>          → Images
<form action>      → Form submissions
<iframe src>       → Embedded frames
<video src>        → Video sources
<audio src>        → Audio sources
```

**Interceptor Script**:
Injected into every HTML page to:
- Override XMLHttpRequest.open() to proxy AJAX calls
- Override window.fetch() to proxy fetch calls
- Intercept link clicks and post to parent window
- Intercept form submissions and post to parent window

**CSS Rewriting Function**: `rewriteCss(css, baseUrl)`

Rewrites `url()` declarations in CSS:
```css
/* Original */
background: url('/images/bg.png');

/* Rewritten */
background: url('/api/proxy?url=https%3A%2F%2Fexample.com%2Fimages%2Fbg.png');
```

## Frontend Implementation

### Main App Component (App.js)

**State Management**:
```javascript
currentUrl      - Currently proxied URL
proxyContent    - HTML content to display
loading         - Loading state
error           - Error message
history         - Array of recent URLs
```

**Key Functions**:

1. `handleNavigate(url)` - Main navigation function
   - Validates and normalizes URL
   - Calls backend proxy endpoint
   - Updates state with response
   - Adds to history

2. `handleProxyNavigate(proxyUrl)` - Internal navigation
   - Extracts target URL from proxy URL
   - Calls handleNavigate

3. `handleFormSubmit(action, method, data)` - Form handling
   - Extracts target URL from form action
   - Sends POST/GET request to backend
   - Updates content with response

**Message Listener**:
Listens for postMessage events from proxied content:
- `proxy-navigate` - User clicked a link
- `proxy-form-submit` - User submitted a form

### URL Bar Component (UrlBar.jsx)

**Features**:
- Controlled input synced with currentUrl
- Auto-disables during loading
- Prevents submission when loading or empty
- Shows "Loading..." text on button during fetch

### Proxy Viewer Component (ProxyViewer.jsx)

**Implementation**:
Uses `dangerouslySetInnerHTML` to inject proxied HTML:
```javascript
<div dangerouslySetInnerHTML={{ __html: content }} />
```

**Security Note**: Content comes from the backend which has already processed and rewritten it. The risk is accepting content from potentially malicious sites, but since this is an internal tool with authorized use, the risk is accepted.

### History List Component (HistoryList.jsx)

**Features**:
- Displays last 10 visited URLs
- Shows only hostname (not full URL)
- Highlights currently active URL
- Click to navigate to previous URL
- Responsive horizontal scroll on mobile

## URL Rewriting Deep Dive

### Challenge

When proxying a website, all internal links, forms, images, and assets must continue to go through the proxy. Otherwise, the browser would make direct requests to the target site, breaking the proxy.

### Solution

**Three-Layer Approach**:

1. **Server-Side HTML Rewriting**
   - Parse HTML with Cheerio
   - Find all URL attributes
   - Convert to proxy URLs
   - Add tracking attributes

2. **Server-Side CSS Rewriting**
   - Regex-based url() replacement
   - Convert to proxy URLs

3. **Client-Side JavaScript Interception**
   - Override native APIs (fetch, XMLHttpRequest)
   - Intercept events (click, submit)
   - PostMessage to parent for navigation

### Example Transformation

**Original Page**:
```html
<a href="/about">About</a>
<img src="/logo.png">
<form action="/search" method="GET">
```

**After Server Rewriting**:
```html
<a href="/api/proxy?url=https%3A%2F%2Fexample.com%2Fabout" 
   data-proxy-link="true">About</a>
<img src="/api/proxy?url=https%3A%2F%2Fexample.com%2Flogo.png">
<form action="/api/proxy?url=https%3A%2F%2Fexample.com%2Fsearch" 
      method="GET" data-proxy-form="true">
```

**After Client Interception**:
- Click on link → postMessage to parent → parent navigates
- Submit form → postMessage to parent → parent submits via proxy

## Form Handling

### GET Forms

Converted to proxy URL with query parameters:
```
Action: /search?q=test
→ /api/proxy?url=https://example.com/search?q=test
```

### POST Forms

Sent to backend with body:
```javascript
{
  url: "https://example.com/form",
  field1: "value1",
  field2: "value2"
}
```

Backend forwards as POST request with form data.

## CORS Handling

**Problem**: Browsers block cross-origin requests.

**Solution**: Backend acts as same-origin server:
- Frontend makes request to own backend
- Backend makes request to target (no CORS)
- Backend returns response to frontend

The backend adds CORS headers to allow frontend access.

## Error Handling

### Backend Errors

**Network Errors**:
- DNS resolution failures
- Connection timeouts
- SSL certificate errors

Returns 500 with error message.

**Invalid URLs**:
Returns 400 with validation error.

**Target Server Errors**:
Forwards original status code (404, 500, etc.)

### Frontend Errors

**Network Errors**:
Displays error banner with message.

**Invalid Input**:
Prevents submission, shows validation.

**Response Errors**:
Shows HTTP status and error message.

## Performance Considerations

### Bottlenecks

1. **Sequential Processing**:
   - Each request waits for target response
   - No parallel asset loading
   - Full HTML parsing for every request

2. **No Caching**:
   - Every request hits target server
   - Repeated visits re-fetch content
   - Static assets not cached

3. **Large Payloads**:
   - HTML rewriting increases size
   - Injected scripts add overhead
   - Base64 encoding for some assets

### Optimization Opportunities

1. **Response Caching**:
   - Cache static assets (images, CSS, JS)
   - Use ETags and conditional requests
   - Implement Redis cache layer

2. **Streaming**:
   - Stream large responses
   - Progressive HTML rewriting
   - Chunked transfer encoding

3. **Asset Preloading**:
   - Parse HTML and preload critical assets
   - Parallel asset fetching
   - HTTP/2 server push

4. **CDN Integration**:
   - Serve static assets via CDN
   - Edge caching for common sites
   - Geographic distribution

## Security Considerations

### Implemented

✅ HTTPS Support - Proxies HTTPS sites correctly
✅ Header Filtering - Removes problematic security headers
✅ URL Validation - Validates input URLs
✅ Error Handling - Doesn't expose internal errors

### Not Implemented (Add for Production)

❌ Authentication - No user verification
❌ Authorization - No access control
❌ Rate Limiting - Can be abused
❌ Input Sanitization - Limited validation
❌ Audit Logging - No request tracking
❌ Domain Filtering - No allowlist/denylist
❌ Content Filtering - No malware scanning
❌ Session Management - No user sessions

### Potential Vulnerabilities

1. **XSS via Proxied Content**:
   - Malicious sites can inject scripts
   - Scripts run in proxy context
   - Mitigation: Content Security Policy

2. **SSRF (Server-Side Request Forgery)**:
   - Attacker can make server request internal URLs
   - Could access internal services
   - Mitigation: URL allowlist, internal IP blocking

3. **Resource Exhaustion**:
   - Large file downloads
   - Many concurrent requests
   - Mitigation: Rate limiting, size limits

4. **Session Hijacking**:
   - Cookies forwarded to target
   - Could leak auth cookies
   - Mitigation: Cookie filtering, HTTPS only

## Testing Strategy

### Unit Tests (Not Implemented)

**Backend**:
- URL rewriting correctness
- Different content type handling
- Error scenarios
- Header filtering

**Frontend**:
- Component rendering
- Navigation handling
- Form submission
- Error display

### Integration Tests (Not Implemented)

- Full request/response cycle
- URL rewriting end-to-end
- Form submission flow
- Navigation flow

### Manual Testing

**Test Cases**:
1. Load simple HTML page (example.com)
2. Navigate internal links
3. Submit forms (GET and POST)
4. Load images and CSS
5. Handle errors (404, 500)
6. Test different content types
7. Mobile responsiveness

## Deployment Guide

### Development Deployment

Already configured with supervisor:
```bash
sudo supervisorctl status
sudo supervisorctl restart proxy_backend
sudo supervisorctl restart frontend
```

### Production Deployment

**Requirements**:
- Node.js 18+ on server
- Nginx reverse proxy
- SSL certificate
- Domain name

**Nginx Configuration**:
```nginx
server {
    listen 443 ssl;
    server_name proxy.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Process Manager** (PM2):
```bash
# Install PM2
npm install -g pm2

# Start backend
cd /app/server
pm2 start index.js --name proxy-backend

# Start frontend (production build)
cd /app/frontend
yarn build
pm2 serve build 3000 --name proxy-frontend

# Save configuration
pm2 save
pm2 startup
```

### Alternative Deployment

**Docker** (Not Implemented):
Would need Dockerfile for backend and frontend, docker-compose.yml for orchestration.

**Cloud Platforms**:
- **Heroku**: Deploy as two apps (backend + frontend)
- **AWS**: EC2 instance or ECS containers
- **DigitalOcean**: App Platform or Droplet
- **Vercel**: NOT RECOMMENDED - proxy functionality may violate ToS

## Monitoring & Maintenance

### Health Checks

**Backend Health**:
```bash
curl http://localhost:8001/api/health
```

**Proxy Functionality**:
```bash
curl "http://localhost:8001/api/proxy?url=https://example.com"
```

### Log Monitoring

**Backend Logs**:
```bash
tail -f /var/log/supervisor/proxy_backend.out.log
tail -f /var/log/supervisor/proxy_backend.err.log
```

**Frontend Logs**:
```bash
tail -f /var/log/supervisor/frontend.out.log
```

### Metrics to Track (Not Implemented)

- Request rate (requests/second)
- Response time (avg, p95, p99)
- Error rate (4xx, 5xx responses)
- Bandwidth usage
- Active connections
- Memory usage
- CPU usage

### Maintenance Tasks

1. **Regular Updates**:
   - Update Node.js dependencies
   - Update React dependencies
   - Security patches

2. **Log Rotation**:
   - Configure logrotate for logs
   - Archive old logs
   - Clean up disk space

3. **Backup**:
   - Configuration files
   - Environment variables
   - Custom modifications

## Known Issues & Workarounds

### Issue 1: JavaScript-Heavy SPAs

**Problem**: Sites with client-side routing (React Router, Vue Router) may not work correctly.

**Cause**: Client-side JavaScript generates URLs dynamically, bypassing our rewriting.

**Workaround**: None currently. Future: deeper JavaScript instrumentation.

### Issue 2: WebSocket Connections

**Problem**: WebSocket connections fail.

**Cause**: Not implemented in proxy.

**Workaround**: Add WebSocket proxying with `ws` library.

### Issue 3: Video Streaming

**Problem**: Large video files may timeout or consume memory.

**Cause**: No streaming implementation.

**Workaround**: Implement chunked transfer and streaming.

### Issue 4: CSP Violations

**Problem**: Some sites have strict Content Security Policy that blocks injection.

**Cause**: Our interceptor script violates inline script policy.

**Workaround**: We remove CSP headers, but some JavaScript might still check.

## Debugging Guide

### Backend Not Starting

**Check**:
```bash
# Node version
node --version  # Should be 18+

# Dependencies installed
ls -la /app/server/node_modules

# Port availability
lsof -i :8001
```

### Frontend Not Connecting

**Check**:
```bash
# Environment variable
cat /app/frontend/.env | grep REACT_APP_BACKEND_URL

# Backend reachable
curl http://localhost:8001/api/health
```

### Links Not Working

**Check**:
1. Browser console for JavaScript errors
2. Check if data-proxy-link attribute is present
3. Verify postMessage events in console
4. Check if event listeners are attached

### Forms Not Submitting

**Check**:
1. Browser console for errors
2. Check network tab for POST request
3. Verify form has data-proxy-form attribute
4. Check backend logs for request

## Contributing Guidelines (Future)

### Code Style

- ESLint for JavaScript
- Prettier for formatting
- Consistent naming conventions
- Comprehensive comments

### Pull Request Process

1. Fork repository
2. Create feature branch
3. Write tests
4. Update documentation
5. Submit PR with description

### Areas for Contribution

- WebSocket support
- Improved caching
- Better error handling
- Authentication system
- Domain filtering
- Performance optimization
- Mobile improvements

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Maintained By**: Development Team
