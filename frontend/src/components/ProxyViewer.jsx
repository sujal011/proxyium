import React from 'react';

function ProxyViewer({ content }) {
  return (
    <div 
      className="proxy-viewer" 
      dangerouslySetInnerHTML={{ __html: content }}
      data-testid="proxy-viewer"
    />
  );
}

export default ProxyViewer;
