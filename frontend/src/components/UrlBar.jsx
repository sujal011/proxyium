import React, { useState, useEffect } from 'react';

function UrlBar({ onNavigate, currentUrl, loading }) {
  const [inputUrl, setInputUrl] = useState('');

  useEffect(() => {
    setInputUrl(currentUrl);
  }, [currentUrl]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputUrl.trim() && !loading) {
      onNavigate(inputUrl.trim());
    }
  };

  return (
    <form className="url-bar" onSubmit={handleSubmit} data-testid="url-bar-form">
      <input
        type="text"
        className="url-input"
        placeholder="Enter URL (e.g., example.com or https://example.com)"
        value={inputUrl}
        onChange={(e) => setInputUrl(e.target.value)}
        disabled={loading}
        data-testid="url-input"
      />
      <button 
        type="submit" 
        className="go-button"
        disabled={loading || !inputUrl.trim()}
        data-testid="go-button"
      >
        {loading ? 'Loading...' : 'Go'}
      </button>
    </form>
  );
}

export default UrlBar;
