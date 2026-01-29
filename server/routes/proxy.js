import express from 'express';
import fetch from 'node-fetch';
import { rewriteHtml, rewriteCss } from '../utils/rewriter.js';

const router = express.Router();

router.all('/', async (req, res) => {
  try {
    const targetUrl = req.query.url || req.body?.url;
    
    if (!targetUrl) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const headers = {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': req.headers['accept'] || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br'
    };

    if (req.headers['referer']) {
      headers['Referer'] = req.headers['referer'];
    }

    const options = {
      method: req.method,
      headers: headers,
      redirect: 'follow'
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      if (req.body.url) {
        delete req.body.url;
      }
      
      if (Object.keys(req.body).length > 0) {
        if (req.headers['content-type']?.includes('application/json')) {
          options.body = JSON.stringify(req.body);
          headers['Content-Type'] = 'application/json';
        } else {
          const params = new URLSearchParams(req.body);
          options.body = params.toString();
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
      }
    }

    const response = await fetch(targetUrl, options);
    
    const contentType = response.headers.get('content-type') || '';
    
    const safeHeaders = {};
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (![
        'content-encoding',
        'transfer-encoding',
        'content-security-policy',
        'x-frame-options',
        'strict-transport-security'
      ].includes(lowerKey)) {
        safeHeaders[key] = value;
      }
    });

    res.status(response.status);
    Object.entries(safeHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    if (contentType.includes('text/html')) {
      const html = await response.text();
      const rewrittenHtml = rewriteHtml(html, targetUrl);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(rewrittenHtml);
    } else if (contentType.includes('text/css')) {
      const css = await response.text();
      const rewrittenCss = rewriteCss(css, targetUrl);
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.send(rewrittenCss);
    } else if (contentType.includes('application/json') || contentType.includes('application/javascript') || contentType.includes('text/')) {
      const text = await response.text();
      res.send(text);
    } else {
      const buffer = await response.buffer();
      res.send(buffer);
    }

  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ 
      error: 'Proxy request failed',
      message: error.message 
    });
  }
});

export default router;
