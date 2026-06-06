export const getApiUrl = (path: string): string => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;

    // Use absolute URL pointing to the live server ONLY when running in Capacitor/Native platform or a local file environment.
    if (
      origin.startsWith('capacitor:') ||
      origin.startsWith('file:')
    ) {
      const href = window.location.href;
      // Dynamically detect matching base url to prevent CORS and state mismatch
      let resolvedBase = 'https://ais-pre-s2ggkv6cssjpq5hgwptjwj-556472082749.asia-east1.run.app';
      if (href.includes('ais-dev-s2ggkv6cssjpq5hgwptjwj-556472082749')) {
        resolvedBase = 'https://ais-dev-s2ggkv6cssjpq5hgwptjwj-556472082749.asia-east1.run.app';
      }
      return `${resolvedBase}${path}`;
    }
  }
  // For standard web deployments and sandboxed browser secure frames, relative URLs are 100% correct and safe.
  // The browser automatically resolves them to the correct serving domain and port.
  return path;
};


