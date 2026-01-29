import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import UrlBar from './components/UrlBar';
import ProxyViewer from './components/ProxyViewer';
import HistoryList from './components/HistoryList';

function App() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [proxyContent, setProxyContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  const handleNavigate = async (url) => {
    if (!url) {
      setError('Please enter a valid URL');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    setLoading(true);
    setError('');
    
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/proxy?url=${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      setProxyContent(html);
      setCurrentUrl(url);
      
      setHistory(prev => {
        const newHistory = [url, ...prev.filter(u => u !== url)].slice(0, 10);
        return newHistory;
      });
    } catch (err) {
      setError(err.message || 'Failed to load the page');
      setProxyContent('');
    } finally {
      setLoading(false);
    }
  };

  const handleProxyNavigate = async (proxyUrl) => {
    if (!proxyUrl) return;
    
    const match = proxyUrl.match(/\/api\/proxy\?url=([^&]+)/);
    if (match) {
      const decodedUrl = decodeURIComponent(match[1]);
      await handleNavigate(decodedUrl);
    }
  };

  const handleFormSubmit = async (action, method, data) => {
    const match = action.match(/\/api\/proxy\?url=([^&]+)/);
    if (!match) return;
    
    const targetUrl = decodeURIComponent(match[1]);
    setLoading(true);
    setError('');
    
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const options = {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: targetUrl, ...data })
      };

      const response = await fetch(`${backendUrl}/api/proxy`, options);
      
      if (!response.ok) {
        throw new Error(`Form submission failed: ${response.status}`);
      }

      const html = await response.text();
      setProxyContent(html);
      setCurrentUrl(targetUrl);
    } catch (err) {
      setError(err.message || 'Form submission failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'proxy-navigate') {
        handleProxyNavigate(event.data.url);
      } else if (event.data.type === 'proxy-form-submit') {
        handleFormSubmit(event.data.action, event.data.method, event.data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-content">
          <h1 className="app-title">Internal Web Proxy</h1>
          <UrlBar 
            onNavigate={handleNavigate} 
            currentUrl={currentUrl}
            loading={loading}
          />
        </div>
      </div>

      <div className="app-body">
        <div className="sidebar">
          <HistoryList 
            history={history} 
            onSelect={handleNavigate}
            currentUrl={currentUrl}
          />
        </div>

        <div className="main-content">
          {currentUrl && (
            <div className="proxy-banner" data-testid="proxy-banner">
              <span className="banner-icon">🔒</span>
              <span className="banner-text">
                Viewing via internal proxy: <strong>{currentUrl}</strong>
              </span>
            </div>
          )}

          {error && (
            <div className="error-message" data-testid="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="loading-container" data-testid="loading-indicator">
              <div className="loading-spinner"></div>
              <p>Loading proxied content...</p>
            </div>
          )}

          {!loading && proxyContent && (
            <ProxyViewer content={proxyContent} />
          )}

          {!loading && !proxyContent && !error && (
            <div className="empty-state">
              <div className="empty-icon">🌐</div>
              <h2>Welcome to Internal Web Proxy</h2>
              <p>Enter a URL above to start browsing through the proxy</p>
              <div className="features">
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Access websites through secure proxy</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Navigate within proxied sites seamlessly</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span>Recent history for quick access</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
