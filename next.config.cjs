/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable source maps in production (no leaked code)
  productionBrowserSourceMaps: false,
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
        ],
      },
    ];
  },
  // Disable x-powered-by
  poweredByHeader: false,
  // Webpack optimization (optional)
  webpack: (config) => {
    // Disable chunk loading retry to avoid potential DDoS
    config.output.chunkLoadTimeout = 30000;
    return config;
  },
};

module.exports = nextConfig;
