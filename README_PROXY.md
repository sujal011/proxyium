# Internal Web Proxy Application

A full-stack web proxy application built with Node.js + Express backend and React frontend. This tool allows authorized internal users to access websites through a secure proxy with full navigation support.

## 🏗️ Architecture Overview

### Request Flow
```
User → React Frontend → Express Backend → Target Website
                ↓              ↓
        Direct HTML      URL Rewriting
        Injection        & Response
```

### Components

**Backend (Node.js + Express)**
- `/app/server/index.js` - Main Express application
- `/app/server/routes/proxy.js` - Proxy route handlers
- `/app/server/utils/rewriter.js` - HTML/CSS URL rewriting logic

**Frontend (React)**
- `/app/frontend/src/App.js` - Main application component
- `/app/frontend/src/components/UrlBar.jsx` - URL input component
- `/app/frontend/src/components/ProxyViewer.jsx` - Content display component
- `/app/frontend/src/components/HistoryList.jsx` - Recent URLs sidebar

## ✨ Features

- ✅ Full HTTP method support (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
- ✅ HTTPS target support
- ✅ Automatic URL rewriting for links, forms, images, and assets
- ✅ Direct HTML injection rendering
- ✅ Internal navigation through proxy
- ✅ Form submission handling
- ✅ Recent URL history
- ✅ Responsive design
- ✅ Loading states and error handling
- ✅ CSS and JavaScript proxying
- ✅ Binary asset support (images, videos, etc.)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (LTS)
- Yarn or npm
- Modern web browser

### Installation

1. **Install Backend Dependencies**
```bash
cd /app/server
yarn install
```

2. **Install Frontend Dependencies**
```bash
cd /app/frontend
yarn install
```

### Running the Application

#### Development Mode

**Terminal 1 - Backend:**
```bash
cd /app/server
node index.js
# Server runs on http://localhost:8001
```

**Terminal 2 - Frontend:**
```bash
cd /app/frontend
yarn start
# App opens at http://localhost:3000
```

#### Using Supervisor (Production-like)

The application is configured to run via supervisor:
```bash
# Check status
sudo supervisorctl status

# Start/Stop/Restart
sudo supervisorctl start proxy_backend
sudo supervisorctl start frontend
sudo supervisorctl restart proxy_backend
```

## 🔧 Configuration

### Backend Environment Variables

Create `/app/server/.env`:
```bash
PROXY_PORT=8001
```

### Frontend Environment Variables

The frontend uses `REACT_APP_BACKEND_URL` from `/app/frontend/.env` to communicate with the backend:
```bash
REACT_APP_BACKEND_URL=https://your-backend-url.com
```

## 📝 Usage

1. **Enter a URL**: Type any website URL in the input bar (e.g., `example.com` or `https://example.com`)
2. **Click Go**: The proxy will fetch and display the content
3. **Navigate**: Click any link within the proxied content - it will continue through the proxy
4. **Forms**: Submit forms normally - they'll be proxied automatically
5. **History**: Click any URL in the sidebar to revisit

## 🔍 How It Works

### Backend URL Rewriting

The server uses Cheerio to parse HTML and rewrite URLs:

```javascript
// Original link
<a href="/about">About</a>

// Rewritten link
<a href="/api/proxy?url=https%3A%2F%2Fexample.com%2Fabout" data-proxy-link="true">About</a>
```

### Frontend Navigation Handling

The frontend intercepts navigation events via postMessage:
- Link clicks post messages to parent window
- Form submissions are captured and proxied
- AJAX requests (fetch/XMLHttpRequest) are intercepted

### Content Types Supported

- **HTML**: Full rewriting with script injection
- **CSS**: URL rewriting in stylesheets
- **JavaScript**: Proxied as-is
- **Images**: Binary pass-through
- **JSON/API**: Direct pass-through
- **Other binary**: Pass-through

## 🧪 Testing

### Backend API Test
```bash
# Health check
curl http://localhost:8001/api/health

# Proxy test
curl "http://localhost:8001/api/proxy?url=https://example.com"
```

### Frontend Test
1. Open http://localhost:3000
2. Enter "example.com"
3. Click "Go"
4. Verify the page loads
5. Click a link on the page
6. Verify navigation works

## ⚠️ Limitations & Considerations

### Known Limitations

1. **JavaScript-Heavy Sites**: SPAs with client-side routing may not work perfectly
2. **WebSockets**: Not currently supported
3. **Content Security Policy**: Some sites may block injection
4. **CORS**: Handled by backend, but some APIs may still fail
5. **Authentication**: Cookies are forwarded but session management can be complex
6. **Relative URLs in CSS**: Some edge cases may not be caught
7. **Dynamic JavaScript**: Code that generates URLs dynamically may bypass rewriting

### Security Considerations

**Important**: This proxy is designed for **authorized, internal use only**.

- No authentication implemented (add before production use)
- No request logging (add for audit trails if needed)
- No domain allowlist/denylist (add to restrict access)
- All traffic goes through your server
- SSL/TLS certificates of target sites are verified
- No custom certificate manipulation

### Recommended Production Enhancements

1. **Add Authentication**: Implement user authentication and session management
2. **Add Logging**: Log all proxy requests with timestamps, users, and URLs
3. **Domain Controls**: Implement allowlist/denylist for permitted domains
4. **Rate Limiting**: Prevent abuse with rate limits
5. **Caching**: Cache static assets to improve performance
6. **Error Handling**: More detailed error messages and recovery
7. **Monitoring**: Add health checks and performance monitoring

## 📦 Dependencies

### Backend
- `express` - Web framework
- `cors` - CORS middleware
- `node-fetch` - HTTP client
- `cheerio` - HTML parsing and manipulation

### Frontend
- `react` - UI library
- `react-dom` - React rendering

## 🐛 Troubleshooting

### Backend not starting
```bash
# Check logs
tail -f /var/log/supervisor/proxy_backend.err.log

# Verify Node.js is installed
node --version

# Reinstall dependencies
cd /app/server && yarn install
```

### Frontend connection errors
```bash
# Verify REACT_APP_BACKEND_URL is set
cat /app/frontend/.env | grep REACT_APP_BACKEND_URL

# Check if backend is running
curl http://localhost:8001/api/health
```

### Proxied site not loading
- Check browser console for errors
- Verify the target site is accessible
- Some sites block proxies via CSP headers
- Check backend logs for errors

### Links not working
- Verify the interceptor script was injected
- Check browser console for postMessage events
- Some sites use custom navigation that bypasses standard events

## 📄 Project Structure

```
/app/
├── server/                      # Node.js Backend
│   ├── package.json            # Backend dependencies
│   ├── index.js                # Express server entry point
│   ├── routes/
│   │   └── proxy.js            # Proxy route handlers
│   └── utils/
│       └── rewriter.js         # URL rewriting utilities
│
└── frontend/                    # React Frontend
    ├── package.json            # Frontend dependencies
    ├── src/
    │   ├── App.js              # Main application
    │   ├── App.css             # Application styles
    │   ├── components/
    │   │   ├── UrlBar.jsx      # URL input component
    │   │   ├── ProxyViewer.jsx # Content display
    │   │   └── HistoryList.jsx # Recent URLs
    │   └── index.js            # React entry point
    └── public/
        └── index.html          # HTML template
```

## 🔐 Compliance & Legal

**Important Compliance Notes:**

1. **Authorized Use Only**: This tool is designed for legitimate internal business purposes
2. **Respect Policies**: Must comply with organizational IT and security policies
3. **Terms of Service**: Respect target website Terms of Service
4. **No Evasion**: Not for evading security controls, law enforcement, or censorship
5. **Audit Trail**: Consider implementing logging for accountability
6. **Data Privacy**: Be aware of data handling and privacy implications

## 🎯 Use Cases

✅ **Appropriate Uses:**
- Accessing business-critical sites blocked by corporate firewall
- Testing website accessibility
- Internal development and debugging
- Authorized penetration testing
- Compliance testing

❌ **Inappropriate Uses:**
- Circumventing security policies without authorization
- Accessing blocked content for personal use
- Evading monitoring or audit trails
- Unauthorized data exfiltration

## 🚀 Future Enhancements

Potential improvements for production deployment:

1. **Authentication System**: OAuth2, SAML, or JWT-based auth
2. **Access Control**: Role-based permissions for different domains
3. **Audit Logging**: Comprehensive request/response logging
4. **Caching Layer**: Redis/Memcached for performance
5. **WebSocket Support**: For real-time applications
6. **Better Error Handling**: User-friendly error pages
7. **Request Filtering**: Content inspection and filtering
8. **Performance Optimization**: Connection pooling, compression
9. **Mobile Optimization**: Better responsive design
10. **Browser Extension**: For easier access

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console and server logs
3. Verify all dependencies are installed
4. Ensure environment variables are set correctly

## ⚖️ License

This is an internal tool. Ensure proper authorization before deployment or use.

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Tech Stack**: Node.js 18+, Express 4.18+, React 18+
