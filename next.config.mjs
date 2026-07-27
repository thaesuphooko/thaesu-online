/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  GOD MODE – Top 1 Infinity Premium Ultra Pro Max                        ║
 * ║  Vercel‑Optimized Next.js 16 Config – Zero Warnings, Full Power        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Features enabled:
 *  - Hardened security headers (CSP, HSTS, CORS, etc.)
 *  - Vercel‑friendly serverless optimizations (no standalone output)
 *  - Image optimization (AVIF/WebP) with remote patterns & extended cache
 *  - Compiler console removal & test‑id stripping
 *  - Type‑safe routing (typedRoutes)
 *  - Aggressive (but safe) webpack chunk splitting
 *  - Server external packages for RSC
 *  - Experimental scroll restoration & large page data tuning
 *  - Dev‑time HMR tuning, fetch logging, build indicators
 *  - Production environment variable validation (exits early if missing)
 */

import { createRequire } from 'module';
import crypto from 'crypto';
const require = createRequire(import.meta.url);
const path = require('path');

// ── Validate critical env vars in production ───────
if (process.env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL'];
  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

const nextConfig = {
  // ─── Core ──────────────────────────────────────
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  trailingSlash: false,
  crossOrigin: 'anonymous',

  // Keep‑alive for faster API responses
  httpAgentOptions: { keepAlive: true },

  staticPageGenerationTimeout: 180,
  generateBuildId: async () => `build-${crypto.randomBytes(8).toString('hex')}`,

  // ─── Type‑safe routing (moved from experimental) ──
  typedRoutes: true,

  // ─── Security Headers (Full Shield) ─────────────
  async headers() {
    return [
      {
        source: '/((?!api).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Content-Security-Policy', value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self'",
              "connect-src 'self' https://api.telegram.org https://*.cloudinary.com",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ') },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ];
  },

  // ─── Images ────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'cdn.jsdelivr.net' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400, // 31 days
  },

  // ─── Rewrites ──────────────────────────────────
  async rewrites() {
    return [
      { source: '/cron-reports/:path*', destination: '/cron-reports/:path*' },
    ];
  },

  // ─── Compiler Hardening ────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
    reactRemoveProperties: process.env.NODE_ENV === 'production'
      ? { properties: ['^data-testid$'] }
      : false,
  },

  // ─── Server external packages (keeps Node modules out of RSC) ──
  serverExternalPackages: [
    'bcryptjs',
    'jsonwebtoken',
    'pg',
    'pg-connection-string',
  ],

  // ─── Experimental (Termux‑safe, Vercel‑friendly) ──
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'framer-motion',
      'recharts',
    ],
    scrollRestoration: true,
    largePageDataBytes: 128 * 1000,
  },

  // ─── Webpack (aliases, fallback, chunk splitting) ──
  webpack: (config, { isServer }) => {
    config.resolve.alias['@'] = path.resolve('./');

    // Avoid snapshot errors on Termux by disabling filesystem cache
    config.cache = false;

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      };
      // Aggressive chunk splitting for faster page loads
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: 'framework-react',
            chunks: 'all',
            priority: 40,
          },
          framer: {
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            name: 'lib-framer',
            chunks: 'all',
            priority: 30,
          },
        },
      };
      config.optimization.runtimeChunk = 'single';
    }

    if (isServer) {
      config.externals = [...(config.externals || []), 'socket.io'];
    }

    return config;
  },

  // ─── Dev‑time Tuning (HMR, logs, indicators) ──
  onDemandEntries: {
    maxInactiveAge: 30 * 1000,
    pagesBufferLength: 8,
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  devIndicators: {
    buildActivity: false,
  },
};

export default nextConfig;
