/**
 * Data Configuration
 * SignalBay uses Polymarket as the source of truth for prediction market data
 */

// Data source options:
// 'polymarket' - Real Polymarket prediction markets (SOURCE OF TRUTH)
// 'mock' - Mock/simulated data (fallback)
export const DATA_SOURCE = 'polymarket' // 'polymarket' | 'mock'

// Polymarket API Configuration
// NOTE: Reading market data does NOT require authentication (public API)
// API keys are only needed for trading/placing orders
export const POLYMARKET_CONFIG = {
  // Gamma Markets API (for reading market data - no auth required)
  gammaApiUrl: 'https://gamma-api.polymarket.com',
  // CLOB API (for trading/order book - may require auth for trading)
  clobApiUrl: 'https://clob.polymarket.com',
  // API Key (optional - only needed for trading)
  // Get from: https://polymarket.com (when setting up trading)
  apiKey: import.meta.env.VITE_POLYMARKET_API_KEY || null,
  // Private Key (optional - only needed for trading)
  // Export from Magic Link: https://reveal.magic.link/polymarket
  // Or export from your Web3 wallet (MetaMask, Coinbase Wallet, etc.)
  privateKey: import.meta.env.VITE_POLYMARKET_PRIVATE_KEY || null,
  // Funder address (optional - only needed for trading)
  // Address shown below your profile picture on Polymarket site
  funderAddress: import.meta.env.VITE_POLYMARKET_FUNDER_ADDRESS || null,
  // Rate limits
  rateLimit: 100, // requests per minute (estimated)
}


// Cache configuration
export const CACHE_CONFIG = {
  priceCacheTimeout: 60000, // 1 minute
  historyCacheTimeout: 300000, // 5 minutes
}

// Update intervals (respects API rate limits)
export const UPDATE_INTERVALS = {
  priceUpdates: 30000, // 30 seconds
  marketRefresh: 60000, // 1 minute
}

