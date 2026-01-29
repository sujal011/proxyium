import { load } from 'cheerio';

export function rewriteHtml(html, baseUrl) {
  const $ = load(html);
  const base = new URL(baseUrl);
  const origin = base.origin;

  function makeProxyUrl(url) {
    if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('data:') || url.startsWith('mailto:')) {
      return url;
    }

    try {
      const absoluteUrl = new URL(url, baseUrl).href;
      return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
    } catch (e) {
      return url;
    }
  }

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    $(el).attr('href', makeProxyUrl(href));
    $(el).attr('data-proxy-link', 'true');
  });

  $('link[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      $(el).attr('href', makeProxyUrl(href));
    }
  });

  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      $(el).attr('src', makeProxyUrl(src));
    }
  });

  $('img[src], img[data-src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      $(el).attr('src', makeProxyUrl(src));
    }
    const dataSrc = $(el).attr('data-src');
    if (dataSrc) {
      $(el).attr('data-src', makeProxyUrl(dataSrc));
    }
  });

  $('source[src], source[srcset]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      $(el).attr('src', makeProxyUrl(src));
    }
    const srcset = $(el).attr('srcset');
    if (srcset) {
      $(el).attr('srcset', makeProxyUrl(srcset));
    }
  });

  $('form[action]').each((_, el) => {
    const action = $(el).attr('action');
    $(el).attr('action', makeProxyUrl(action || baseUrl));
    $(el).attr('data-proxy-form', 'true');
  });

  $('iframe[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      $(el).attr('src', makeProxyUrl(src));
    }
  });

  $('video[src], audio[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      $(el).attr('src', makeProxyUrl(src));
    }
  });

  const interceptScript = `
    <script data-proxy-interceptor>
      (function() {
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
          if (url && !url.startsWith('data:') && !url.startsWith('blob:')) {
            try {
              const absoluteUrl = new URL(url, window.location.origin + '${baseUrl}').href;
              url = '/api/proxy?url=' + encodeURIComponent(absoluteUrl);
            } catch (e) {}
          }
          return originalOpen.call(this, method, url, ...rest);
        };

        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
          if (typeof url === 'string' && !url.startsWith('data:') && !url.startsWith('blob:')) {
            try {
              const absoluteUrl = new URL(url, '${baseUrl}').href;
              url = '/api/proxy?url=' + encodeURIComponent(absoluteUrl);
            } catch (e) {}
          }
          return originalFetch.call(this, url, options);
        };

        document.addEventListener('click', function(e) {
          const link = e.target.closest('a[href]');
          if (link && link.hasAttribute('data-proxy-link')) {
            e.preventDefault();
            const href = link.getAttribute('href');
            if (href && !href.startsWith('#')) {
              window.parent.postMessage({ type: 'proxy-navigate', url: href }, '*');
            }
          }
        }, true);

        document.addEventListener('submit', function(e) {
          const form = e.target;
          if (form.hasAttribute('data-proxy-form')) {
            e.preventDefault();
            const formData = new FormData(form);
            const action = form.getAttribute('action');
            const method = form.getAttribute('method') || 'GET';
            
            window.parent.postMessage({ 
              type: 'proxy-form-submit', 
              action: action,
              method: method.toUpperCase(),
              data: Object.fromEntries(formData)
            }, '*');
          }
        }, true);
      })();
    </script>
  `;

  $('head').append(interceptScript);

  return $.html();
}

export function rewriteCss(css, baseUrl) {
  return css.replace(/url\(['"]?([^'"\)]+)['"]?\)/g, (match, url) => {
    if (url.startsWith('data:') || url.startsWith('#')) {
      return match;
    }
    try {
      const absoluteUrl = new URL(url, baseUrl).href;
      return `url('/api/proxy?url=${encodeURIComponent(absoluteUrl)}')`;
    } catch (e) {
      return match;
    }
  });
}
