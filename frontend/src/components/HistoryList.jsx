import React from 'react';

function HistoryList({ history, onSelect, currentUrl }) {
  if (history.length === 0) {
    return (
      <div className="history-list">
        <h3 className="history-title">Recent URLs</h3>
        <p className="history-empty">No history yet</p>
      </div>
    );
  }

  return (
    <div className="history-list" data-testid="history-list">
      <h3 className="history-title">Recent URLs</h3>
      <ul className="history-items">
        {history.map((url, index) => (
          <li 
            key={index} 
            className={`history-item ${url === currentUrl ? 'active' : ''}`}
            onClick={() => onSelect(url)}
            data-testid={`history-item-${index}`}
          >
            <span className="history-icon">🔗</span>
            <span className="history-url" title={url}>
              {new URL(url).hostname}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default HistoryList;
