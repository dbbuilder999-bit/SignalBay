/**
 * Polymarket Service
 * Fetches real prediction market data from Polymarket API
 * 
 * Polymarket Gamma API Documentation:
 * - Markets API: https://docs.polymarket.com/developers/gamma-markets-api/get-markets
 * - Events API: /events (currently implemented)
 * - Tags API: /tags (currently implemented - use getTags() to get tag_id values)
 * - Sports API: /sports (currently implemented - use getSports() to get sport metadata and tag IDs)
 * - Health API: /health (not yet implemented)
 * 
 * Currently using:
 * - /markets endpoint for fetching markets (supports tag_id, sports_market_types, etc.)
 * - /public-search endpoint for searching markets (supports q, search_tags, sort, etc.)
 * - /events endpoint for fetching events
 * - /tags endpoint for fetching tags (to get tag_id values for filtering)
 * - /sports endpoint for fetching sports metadata (to get sport tag IDs)
 * 
 * TODO: 
 * - Consider implementing /health endpoint for API health monitoring
 * 
 * - No authentication required for reading market data (public API)
 * - Authentication only needed for trading (placing orders)
 * 
 * To add API keys for trading:
 * 1. Set VITE_POLYMARKET_API_KEY in your .env file
 * 2. Set VITE_POLYMARKET_FUNDER_ADDRESS in your .env file
 * 3. See POLYMARKET_SETUP.md for detailed trading setup
 */

import { POLYMARKET_CONFIG } from '../config/dataConfig'

class PolymarketService {
  constructor() {
    // Polymarket API endpoints (from config)
    // Use proxy in development to avoid CORS issues
    const isDev = import.meta.env.DEV
    this.apiUrl = isDev 
      ? '/api/polymarket'  // Use Vite proxy in development
      : POLYMARKET_CONFIG.gammaApiUrl  // Direct API in production
    this.clobUrl = isDev
      ? '/api/clob'  // Use Vite proxy in development
      : POLYMARKET_CONFIG.clobApiUrl  // Direct API in production
    // API key (optional - only for trading)
    this.apiKey = POLYMARKET_CONFIG.apiKey
    this.funderAddress = POLYMARKET_CONFIG.funderAddress
    // Cache for market data
    this.cache = new Map()
    this.cacheTimeout = 300000 // 5 minutes cache (300000 ms = 5 * 60 * 1000)
    this.subscriptions = new Map()
  }

  /**
   * Fetch markets from Polymarket
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of market objects
   */
  async getMarkets(options = {}) {
    try {
      
      // Check cache - if we have a cached result with same or larger limit, use it
      const requestedLimit = options.limit || 20
      let cached = null
      let cacheKey = null
      
      // Try to find a cached result that satisfies our request
      // Look for any cache entry with same active/closed settings and sufficient limit
      const activeFilter = options.active !== false
      const closedFilter = options.closed !== undefined ? options.closed : false
      
      // for (const [key, value] of this.cache.entries()) {
      //   if (key.startsWith('markets-')) {
      //     try {
      //       const cachedOptions = JSON.parse(key.replace('markets-', ''))
      //       const cachedLimit = cachedOptions.limit || 20
      //       const cachedActive = cachedOptions.active !== false
      //       const cachedClosed = cachedOptions.closed !== undefined ? cachedOptions.closed : false
            
      //       // If cached limit is >= requested limit and other options match, use it
      //       if (cachedLimit >= requestedLimit && 
      //           cachedActive === activeFilter &&
      //           cachedClosed === closedFilter &&
      //           Date.now() - value.timestamp < this.cacheTimeout) {
      //         console.log(`[Cache HIT] Using cached data: ${key} (requested limit: ${requestedLimit}, age: ${Math.round((Date.now() - value.timestamp) / 1000)}s)`)
      //         // Return a slice if we need fewer items
      //         if (cachedLimit > requestedLimit) {
      //           return value.data.slice(0, requestedLimit)
      //         }
      //         return value.data
      //       }
      //     } catch (e) {
      //       // Skip invalid cache keys
      //       continue
      //     }
      //   }
      // }
      
      // If no suitable cache found, create new cache key
      cacheKey = `markets-${JSON.stringify(options)}`

      // Polymarket Gamma Markets API endpoint
      // Documentation: https://docs.polymarket.com/developers/gamma-markets-api/get-markets
      const params = new URLSearchParams({
        limit: String(options.limit || 20),
        offset: String(options.offset || 0),
        active: options.active !== false ? true : false,
        closed: options.closed !== undefined ? options.closed : false, // Exclude closed markets by default
        ...(options.tag_id && { 
          tag_id: Array.isArray(options.tag_id) 
            ? options.tag_id.map(String).join(',') 
            : String(options.tag_id) 
        }),
        ...(options.related_tags !== undefined && { related_tags: String(options.related_tags) }),
        ...(options.sports_market_types && { 
          sports_market_types: Array.isArray(options.sports_market_types) 
            ? options.sports_market_types.join(',') 
            : String(options.sports_market_types) 
        }),
        ...(options.order && { order: options.order }),
        ...(options.ascending !== undefined && { ascending: String(options.ascending) }),
        ...(options.clob_token_ids && { 
          clob_token_ids: Array.isArray(options.clob_token_ids) 
            ? options.clob_token_ids.join(',') 
            : String(options.clob_token_ids) 
        }),
        // Add category for debugging visibility (API will ignore unknown params)
        ...(options._category && { category: options._category }),
      })
      // Try the Gamma Markets API endpoint (uses proxy in dev, direct in prod)
      const url = `${this.apiUrl}/markets?${params.toString()}`
      const response = await fetch(url,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Polymarket API error: ${response.status}`, errorText)
        
        // If it's a validation error with tag_id, try without tag_id
        if (response.status === 422 && errorText.includes('tag_id')) {
          // Remove tag_id and related_tags from options and retry
          const retryOptions = { ...options }
          delete retryOptions.tag_id
          delete retryOptions.related_tags
          return this.getMarkets(retryOptions)
        }
        
        // Throw error instead of returning fallback - we want REAL data only
        throw new Error(`Polymarket API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      
      // Handle different response formats
      const marketsData = Array.isArray(data) ? data : (data.data || data.markets || [])
      
      if (!marketsData || marketsData.length === 0) {
        // Return empty array instead of fallback - we want REAL data only
        return []
      }
      
      const markets = this.transformMarkets(marketsData)

      // Cache the result (5 minute TTL)
      this.cache.set(cacheKey, {
        data: markets,
        timestamp: Date.now(),
      })

      return markets.length > 0 ? markets : []
    } catch (error) {
      console.error('Error fetching Polymarket markets:', error)
      // Throw error instead of returning fallback - we want REAL data only
      throw error
    }
  }

  /**
   * Transform Polymarket market data to SignalBay format
   */
  transformMarkets(polymarketData) {
    if (!Array.isArray(polymarketData)) {
        return []
    }
    
    return polymarketData
      .filter(market => {
        // More lenient filter - accept any market with an id or question/title
        const isValid = market && (market.id || market.question || market.title || market.slug)
        if (!isValid) {
          return false
        }
        // Filter out closed markets unless they have valid prices
        if (market.closed === true) {
          // Check if market has any meaningful price data
          const hasPrices = market.outcomePrices && 
            (typeof market.outcomePrices === 'string' ? 
              JSON.parse(market.outcomePrices).some(p => parseFloat(p) > 0) :
              market.outcomePrices.some(p => parseFloat(p) > 0))
          if (!hasPrices) {
            return false
          }
        }
        return true
      })
      .map((market) => {
        
        // Parse outcomes and prices - they come as JSON strings
        let outcomes = []
        let outcomePrices = []
        
        try {
          if (typeof market.outcomes === 'string') {
            outcomes = JSON.parse(market.outcomes)
          } else if (Array.isArray(market.outcomes)) {
            outcomes = market.outcomes
          } else if (market.tokens) {
            outcomes = Array.isArray(market.tokens) ? market.tokens : []
          }
          
          if (typeof market.outcomePrices === 'string') {
            outcomePrices = JSON.parse(market.outcomePrices)
          } else if (Array.isArray(market.outcomePrices)) {
            outcomePrices = market.outcomePrices
          }
        } catch (e) {
        }
        
        // Find Yes/No indices
        const yesIndex = outcomes.findIndex(o => 
          (typeof o === 'string' && (o === 'Yes' || o === 'YES' || o.toLowerCase().includes('yes'))) ||
          (o && (o.outcome === 'Yes' || o.outcome === 'YES' || o.side === 'YES'))
        )
        const noIndex = outcomes.findIndex(o => 
          (typeof o === 'string' && (o === 'No' || o === 'NO' || o.toLowerCase().includes('no'))) ||
          (o && (o.outcome === 'No' || o.outcome === 'NO' || o.side === 'NO'))
        )
        
        // Get prices from outcomePrices array or from token objects
        let yesPrice = 50
        let noPrice = 50
        
        if (outcomePrices.length > 0 && yesIndex >= 0 && noIndex >= 0) {
          // Prices from outcomePrices array
          yesPrice = parseFloat(outcomePrices[yesIndex] || 0) * 100
          noPrice = parseFloat(outcomePrices[noIndex] || 0) * 100
        } else if (market.bestAsk !== undefined && market.bestBid !== undefined) {
          // Use bestAsk/bestBid if available
          yesPrice = parseFloat(market.bestAsk || 0) * 100
          noPrice = parseFloat(market.bestBid || 0) * 100
        } else {
          // Try direct price fields
          const directYesPrice = market.yesPrice || market.priceYes || market.price_yes
          const directNoPrice = market.noPrice || market.priceNo || market.price_no
          
          if (directYesPrice !== undefined || directNoPrice !== undefined) {
            yesPrice = parseFloat(directYesPrice || (1 - (directNoPrice || 0.5))) * 100
            noPrice = parseFloat(directNoPrice || (1 - (directYesPrice || 0.5))) * 100
          }
        }
        
        // Ensure prices are valid
        if (yesPrice <= 0 && noPrice > 0) yesPrice = 100 - noPrice
        if (noPrice <= 0 && yesPrice > 0) noPrice = 100 - yesPrice
        if (yesPrice <= 0 && noPrice <= 0) {
          yesPrice = 50
          noPrice = 50
        }

        // Calculate volume (handle different formats)
        const volume = market.volumeNum || 
          (market.volume ? (typeof market.volume === 'string' ? parseFloat(market.volume) : market.volume) : 0) ||
          (market.volume24hr || market.volume24h || market.volume_24h || market.tradingVolume || 0)
        
        const volume24h = market.volume24hr || market.volume24h || market.volume_24h || 0
        const liquidity = market.liquidityNum || 
          (market.liquidity ? (typeof market.liquidity === 'string' ? parseFloat(market.liquidity) : market.liquidity) : 0)

        // Get dates
        const endDate = market.endDateIso || 
                       market.endDate_iso || 
                       market.endDate || 
                       market.end_date ||
                       market.resolutionDate ||
                       market.resolution_date ||
                       (market.events && market.events[0]?.endDate) ||
                       new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        
        const startDate = market.startDate ||
                         market.creationDate ||
                         (market.events && market.events[0]?.startDate) ||
                         (market.events && market.events[0]?.creationDate) ||
                         market.createdAt

        // Get category/icon
        const category = market.category || 
                        market.tags?.[0] || 
                        market.groupItemTitle ||
                        'general'
        const icon = this.getIconForCategory(category)
        
        // Get image URL (Polymarket may provide imageUrl, image, thumbnail, etc.)
        const imageUrl = market.imageUrl || 
                        market.image || 
                        market.thumbnail || 
                        market.image_url ||
                        market.thumbnailUrl ||
                        market.thumbnail_url ||
                        (market.events && market.events[0]?.imageUrl) ||
                        null

        // Get title
        const title = market.question || 
                     market.title || 
                     market.marketMaker ||
                     'Market'

        // Get description
        const description = market.description || 
                           market.details ||
                           market.category ||
                           ''

        // Get condition ID or market ID
        const conditionId = market.conditionId || 
                           market.condition_id ||
                           market.id ||
                           market.slug ||
                           `polymarket-${Date.now()}-${Math.random()}`
        
        // Parse token IDs from clobTokenIds if available
        let yesTokenId = null
        let noTokenId = null
        try {
          if (market.clobTokenIds) {
            const tokenIds = typeof market.clobTokenIds === 'string' 
              ? JSON.parse(market.clobTokenIds) 
              : market.clobTokenIds
            if (Array.isArray(tokenIds) && tokenIds.length >= 2) {
              // First token is typically Yes, second is No (but may vary)
              yesTokenId = tokenIds[0]
              noTokenId = tokenIds[1]
            }
          }
        } catch (e) {
        }

        return {
          id: conditionId,
          icon: icon,
          imageUrl: imageUrl,
          title: title,
          description: description,
          yesPrice: Math.max(0.1, Math.min(99.9, yesPrice)),
          noPrice: Math.max(0.1, Math.min(99.9, noPrice)),
          volume: volume,
          volume24h: volume24h,
          liquidity: liquidity,
          category: category,
          startDate: startDate,
          endDate: endDate,
          closed: market.closed === true || market.closed === 'true' || market.closed === 1, // Preserve closed status
          // Polymarket-specific data
          polymarketData: {
            conditionId: conditionId,
            slug: market.slug || market.id,
            resolutionSource: market.resolutionSource || market.resolution_source,
            marketMakerAddress: market.marketMakerAddress || market.market_maker_address,
            yesTokenId: yesTokenId,
            noTokenId: noTokenId,
            tickSize: market.tickSize || market.tick_size || '0.001',
            negRisk: market.negRisk || market.neg_risk || market.enableNegRisk || false,
            closed: market.closed === true || market.closed === 'true' || market.closed === 1, // Also preserve in polymarketData
          },
        }
      })
      .filter(market => market.id && market.title) // Filter out invalid transformations
  }

  /**
   * Get icon for category
   */
  getIconForCategory(category) {
    const categoryIcons = {
      politics: '🗳️',
      sports: '🏀',
      crypto: '₿',
      stocks: '📈',
      entertainment: '🎬',
      technology: '💻',
      economics: '💵',
      weather: '🌤️',
      general: '📊',
    }
    return categoryIcons[category?.toLowerCase()] || '📊'
  }

  /**
   * Get market by ID
   */
  async getMarket(marketId) {
    try {
      // Try to get from cache first
      const markets = await this.getMarkets({ limit: 100 })
      let market = markets.find(m => 
        m.id === marketId || 
        m.polymarketData?.conditionId === marketId ||
        m.polymarketData?.slug === marketId
      )

      if (!market) {
        // Try fetching specific market by condition ID or tokens
        try {
          const response = await fetch(
            `${this.apiUrl}/markets?tokens=${marketId}&limit=1`,
            {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
            }
          )
          if (response.ok) {
            const data = await response.json()
            const marketsData = Array.isArray(data) ? data : (data.data || data.markets || [])
            const transformed = this.transformMarkets(marketsData)
            market = transformed[0]
          }
        } catch (error) {
        }
      }

      return market || null
    } catch (error) {
      console.error('Error fetching market:', error)
      return null
    }
  }

  /**
   * Get price history for a market using CLOB fills API
   * This is the correct endpoint for Polymarket price history
   */
  async getPriceHistory(marketId, timeframe = '1d') {
    try {
      // Get market to find the CLOB token IDs
      const market = await this.getMarket(marketId)
      if (!market) {
        return { yes: this.generateMockHistory(50, timeframe), no: this.generateMockHistory(50, timeframe) }
      }

      // Extract clobTokenIds array (first is "yes", second is "no")
      // clobTokenIds can be a string array or already parsed array
      let clobTokenIds = []
      
      if (market.clobTokenIds) {
        if (Array.isArray(market.clobTokenIds)) {
          clobTokenIds = market.clobTokenIds
        } else if (typeof market.clobTokenIds === 'string') {
          try {
            const parsed = JSON.parse(market.clobTokenIds)
            if (Array.isArray(parsed)) {
              clobTokenIds = parsed
            }
          } catch {
            // If parsing fails, try using the string directly as single token
            clobTokenIds = [market.clobTokenIds]
          }
        }
      }

      // Fallback to other token ID fields if clobTokenIds is not available
      if (clobTokenIds.length === 0) {
        const yesTokenId = market.polymarketData?.yesTokenId || market.yesTokenId
        const noTokenId = market.polymarketData?.noTokenId || market.noTokenId
        if (yesTokenId) clobTokenIds.push(yesTokenId)
        if (noTokenId) clobTokenIds.push(noTokenId)
      }

      if (clobTokenIds.length === 0) {
        // Fallback to mock if we can't find valid token IDs
        const yesPrice = market.yesPrice || 50
        return {
          yes: this.generateMockHistory(yesPrice, timeframe),
          no: this.generateMockHistory(100 - yesPrice, timeframe)
        }
      }

      // Map timeframe to interval parameter
      const intervalMap = {
        '1m': '1m',
        '1H': '1h',
        '1h': '1h',
        '6h': '6h',
        '6H': '6h',
        '1D': '1d',
        '1d': '1d',
        '1W': '1w',
        '1w': '1w',
        '1M': '1w', // Map 1M to 1w as closest option
        'All': 'max',
        'max': 'max'
      }

      const interval = intervalMap[timeframe] || '1d'
      
      // Set fidelity (resolution in minutes) based on timeframe
      // Lower fidelity = more data points (higher resolution)
      // Higher fidelity = fewer data points (lower resolution, better for long timeframes)
      const fidelityMap = {
        '1m': 1,   // 1 minute resolution for 1m view
        '1h': 5,   // 5 minute resolution for 1h view
        '6h': 10,  // 10 minute resolution for 6h view
        '1d': 30,  // 30 minute resolution for 1d view
        '1w': 60,  // 1 hour resolution for 1w view
        'max': 120 // 2 hour resolution for max view
      }
      const fidelity = fidelityMap[interval] || 10 // Default to 10 minutes

      // Note: interval and startTs/endTs are mutually exclusive
      // We use interval here, which represents a duration ending at the current time

      // Fetch price history for both Yes and No tokens
      const fetchHistory = async (tokenId) => {
        try {
          const url = `${this.clobUrl}/prices-history?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`
          const response = await fetch(url, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            throw new Error(`CLOB API error: ${response.status}`)
          }

          const json = await response.json()

          if (!json.history || !Array.isArray(json.history) || json.history.length === 0) {
            return []
          }

          // Convert prices-history format to lightweight-charts format
          return json.history.map((point) => {
            const price = parseFloat(point.p || point.price || 0)
            const normalizedPrice = Math.max(0, Math.min(1, price))
            const timestamp = point.t || point.timestamp || Date.now() / 1000
            
            return {
              time: Math.floor(timestamp),
              value: normalizedPrice * 100 // Convert to cents (0-100)
            }
          }).sort((a, b) => a.time - b.time)
        } catch (error) {
          console.error(`Error fetching price history for token ${tokenId}:`, error)
          return []
        }
      }

      // Fetch both histories in parallel
      const [yesHistory, noHistory] = await Promise.all([
        fetchHistory(clobTokenIds[0]),
        clobTokenIds[1] ? fetchHistory(clobTokenIds[1]) : Promise.resolve([])
      ])

      // If we have data, return it; otherwise fallback to mock
      const yesPrice = market.yesPrice || 50
      const noPrice = market.noPrice || (100 - yesPrice)

      return {
        yes: yesHistory.length > 0 ? yesHistory : this.generateMockHistory(yesPrice, timeframe),
        no: noHistory.length > 0 ? noHistory : this.generateMockHistory(noPrice, timeframe)
      }
    } catch (error) {
      console.error('Error fetching price history from CLOB:', error)
      // Fallback to mock history on error
      try {
        const market = await this.getMarket(marketId)
        const yesPrice = market?.yesPrice || 50
        const noPrice = market?.noPrice || (100 - yesPrice)
        return {
          yes: this.generateMockHistory(yesPrice, timeframe),
          no: this.generateMockHistory(noPrice, timeframe)
        }
      } catch {
        return {
          yes: this.generateMockHistory(50, timeframe),
          no: this.generateMockHistory(50, timeframe)
        }
      }
    }
  }

  /**
   * Generate mock history (Polymarket doesn't provide public price history API)
   */
  generateMockHistory(basePrice, timeframe) {
    const data = []
    const now = Math.floor(Date.now() / 1000)
    const hoursBack = this.getHoursForTimeframe(timeframe)
    let currentPrice = basePrice

    for (let i = hoursBack; i >= 0; i--) {
      const time = now - (i * 3600)
      const variation = (Math.random() - 0.5) * 3
      currentPrice = Math.max(0, Math.min(100, currentPrice + variation))

      data.push({
        time: time,
        value: currentPrice,
      })
    }

    return data
  }

  /**
   * Get hours for timeframe
   */
  getHoursForTimeframe(timeframe) {
    const timeframeMap = {
      '1H': 1,
      '4H': 4,
      '1D': 24,
      '1W': 168,
      '1M': 720,
      'All': 8760,
    }
    return timeframeMap[timeframe] || 24
  }

  /**
   * Subscribe to real-time price updates
   * Note: Polymarket doesn't have public WebSocket, so we poll the API
   */
  subscribeToPriceUpdates(marketId, callback) {
    if (!this.subscriptions) {
      this.subscriptions = new Map()
    }

    const updatePrice = async () => {
      try {
        const market = await this.getMarket(marketId)
        if (market) {
          callback({
            marketId,
            yesPrice: market.yesPrice,
            noPrice: market.noPrice,
            timestamp: Date.now(),
          })
        }
      } catch (error) {
        console.error('Error updating price:', error)
      }
    }

    // Update immediately
    updatePrice()

    // Then update every 30 seconds (respects API rate limits)
    const interval = setInterval(updatePrice, 30000)

    this.subscriptions.set(marketId, { callback, interval })
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribeFromPriceUpdates(marketId) {
    if (this.subscriptions) {
      const subscription = this.subscriptions.get(marketId)
      if (subscription && subscription.interval) {
        clearInterval(subscription.interval)
        this.subscriptions.delete(marketId)
      }
    }
  }

  /**
   * Get current price for a token from CLOB API
   * @param {string} tokenId - The CLOB token ID
   * @param {string} side - 'BUY' or 'SELL'
   * @returns {Promise<number>} Price in cents (0-100)
   */
  async getTokenPrice(tokenId, side = 'BUY') {
    try {
      const url = `${this.clobUrl}/price?token_id=${tokenId}&side=${side.toUpperCase()}`
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`CLOB API error: ${response.status}`)
      }

      const data = await response.json()
      
      // The API returns price in decimal (0-1), convert to cents (0-100)
      const price = parseFloat(data.price || data || 0.5)
      return Math.max(0, Math.min(100, price * 100))
    } catch (error) {
      console.error(`Error fetching price for token ${tokenId} (${side}):`, error)
      return null
    }
  }

  /**
   * Get order book for a market
   */
  async getOrderBook(marketId) {
    try {
      const market = await this.getMarket(marketId)
      if (!market) {
        return this.generateMockOrderBook(marketId)
      }

      // Try to get real order book from Polymarket CLOB API
      // Note: This may have CORS restrictions in browser
      if (market.polymarketData?.yesTokenId) {
        try {
          const tokenId = market.polymarketData.yesTokenId
          const response = await fetch(
            `${this.clobUrl}/book?token_id=${tokenId}`,
            {
              headers: {
                'Accept': 'application/json',
              },
            }
          )

          if (response.ok) {
            const data = await response.json()
            
            // Transform order book data
            const bids = (data.bids || []).map(order => ({
              price: parseFloat(order.price || order[0] || 0) * 100, // Convert to cents
              amount: parseFloat(order.size || order[1] || 0),
              total: 0, // Will be calculated
            }))
            
            const asks = (data.asks || []).map(order => ({
              price: parseFloat(order.price || order[0] || 0) * 100,
              amount: parseFloat(order.size || order[1] || 0),
              total: 0,
            }))
            
            // Calculate cumulative totals
            let runningTotal = 0
            bids.forEach(order => {
              runningTotal += order.amount
              order.total = runningTotal
            })
            
            runningTotal = 0
            asks.forEach(order => {
              runningTotal += order.amount
              order.total = runningTotal
            })
            
            return { bids, asks }
          }
        } catch (error) {
        }
      }
      
      // Fallback to mock order book
      return this.generateMockOrderBook(marketId)
    } catch (error) {
      console.error('Error fetching order book:', error)
      return this.generateMockOrderBook(marketId)
    }
  }

  /**
   * Generate mock order book if API fails
   */
  async generateMockOrderBook(marketId) {
    const market = await this.getMarket(marketId)
    if (!market) return { bids: [], asks: [] }

    const generateOrders = (side, basePrice, count = 15) => {
      const orders = []
      for (let i = 0; i < count; i++) {
        const offset = side === 'bid'
          ? (count - i) * 0.1
          : (i + 1) * 0.1
        const orderPrice = side === 'bid'
          ? Math.max(0, basePrice - offset)
          : Math.min(100, basePrice + offset)
        orders.push({
          price: orderPrice,
          amount: Math.random() * 10 + 0.1,
          total: 0
        })
      }
      let runningTotal = 0
      orders.forEach(order => {
        runningTotal += order.amount
        order.total = runningTotal
      })
      return orders
    }

    return {
      bids: generateOrders('bid', market.yesPrice, 15),
      asks: generateOrders('ask', market.yesPrice, 15),
    }
  }

  /**
   * Get popular/trending markets
   */
  async getTrendingMarkets() {
    return this.getMarkets({
      limit: 20,
      active: true,
    })
  }

  /**
   * Search markets using Polymarket public-search endpoint
   * @param {string} query - Search query string
   * @param {Object} options - Additional search options
   * @returns {Promise<Array>} Array of market objects
   */
  async searchMarkets(query, options = {}) {
    try {
      if (!query || query.trim().length === 0) {
        return []
      }

      // Check cache first
      const cacheKey = `search-${query}-${JSON.stringify(options)}`
      const cached = this.cache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }
      

      const params = new URLSearchParams({
        q: query.trim(),
        ...(options.cache !== undefined && { cache: String(options.cache) }),
        ...(options.events_status && { events_status: options.events_status }),
        ...(options.limit_per_type && { limit_per_type: String(options.limit_per_type) }),
        ...(options.page && { page: String(options.page) }),
        ...(options.events_tag && Array.isArray(options.events_tag) && { 
          events_tag: options.events_tag.join(',') 
        }),
        ...(options.keep_closed_markets !== undefined && { keep_closed_markets: String(options.keep_closed_markets) }),
        ...(options.sort && { sort: options.sort }),
        ...(options.ascending !== undefined && { ascending: String(options.ascending) }),
        ...(options.search_tags !== undefined && { search_tags: String(options.search_tags) }),
        ...(options.search_profiles !== undefined && { search_profiles: String(options.search_profiles) }),
        ...(options.recurrence && { recurrence: options.recurrence }),
        ...(options.exclude_tag_id && Array.isArray(options.exclude_tag_id) && { 
          exclude_tag_id: options.exclude_tag_id.map(String).join(',') 
        }),
        ...(options.optimized !== undefined && { optimized: String(options.optimized) }),
      })
      const url = `${this.apiUrl}/public-search?${params.toString()}`
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Search API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      
      // Handle different response formats
      // The public-search endpoint returns results organized by type: { markets: [], events: [], tags: [] }
      let marketsData = []
      
      // First, extract markets from data.markets
      if (Array.isArray(data)) {
        // If response is directly an array, use it
        marketsData = data
      } else if (data.markets) {
        // Check for markets array first (most common structure for /public-search)
        marketsData = Array.isArray(data.markets) ? data.markets : []
      } else if (data.data) {
        // Check for nested data.markets or data as array
        if (Array.isArray(data.data)) {
          marketsData = data.data
        } else if (data.data.markets && Array.isArray(data.data.markets)) {
          marketsData = data.data.markets
        }
      } else if (data.results) {
        // Check for results array
        marketsData = Array.isArray(data.results) ? data.results : []
      }
      
      // Also extract markets from events (events contain markets)
      if (data.events && Array.isArray(data.events) && data.events.length > 0) {
        const marketsFromEvents = []
        
        data.events.forEach(event => {
          // Events may have a markets property with an array of markets
          if (event.markets && Array.isArray(event.markets)) {
            marketsFromEvents.push(...event.markets)
          }
          // Some events might be market-like objects themselves
          // Check if the event itself looks like a market (has question, outcomes, etc.)
          else if (event.question || event.title || event.outcomes) {
            // Treat the event as a market
            marketsFromEvents.push(event)
          }
        })
        
        if (marketsFromEvents.length > 0) {
          marketsData = [...marketsData, ...marketsFromEvents]
        } else {
        }
      }
      
      // Log the structure for debugging
      if (data.events !== undefined) {
      }

      // Transform the markets
      const markets = this.transformMarkets(marketsData)

      // Cache the result (5 minute TTL)
      this.cache.set(cacheKey, {
        data: markets,
        timestamp: Date.now(),
      })

      return markets
    } catch (error) {
      console.error('Error searching markets:', error)
      throw error
    }
  }

  /**
   * Fetch tags from Polymarket
   * Tags can be used to get tag_id values for filtering markets by category
   * @returns {Promise<Array>} Array of tag objects with id, name, etc.
   */
  async getTags() {
    try {
      // Check cache first
      const cacheKey = 'tags-metadata'
      const cached = this.cache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }
      

      const response = await fetch(
        `${this.apiUrl}/tags`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`)
      }

      const data = await response.json()
      const tagsData = Array.isArray(data) ? data : (data.data || data.tags || [])

      // Cache the result (5 minute TTL)
      this.cache.set(cacheKey, {
        data: tagsData,
        timestamp: Date.now(),
      })

      return tagsData
    } catch (error) {
      console.error('Error fetching Polymarket tags:', error)
      throw error
    }
  }

  /**
   * Fetch sports metadata from Polymarket
   * Returns sports with their tag IDs, images, series info, etc.
   * Use this to get tag_id values for filtering sports markets
   * @returns {Promise<Array>} Array of sport objects with sport name, tags, series, etc.
   */
  async getSports() {
    try {
      // Check cache first
      const cacheKey = 'sports-metadata'
      const cached = this.cache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }
      

      const response = await fetch(
        `${this.apiUrl}/sports`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`)
      }

      const data = await response.json()
      const sportsData = Array.isArray(data) ? data : (data.data || data.sports || [])

      // Cache the result (5 minute TTL)
      this.cache.set(cacheKey, {
        data: sportsData,
        timestamp: Date.now(),
      })

      return sportsData
    } catch (error) {
      console.error('Error fetching Polymarket sports:', error)
      throw error
    }
  }

  /**
   * Get tag IDs for a specific sport (e.g., "NFL", "NBA", "MLB")
   * @param {string} sportName - Sport name (e.g., "NFL", "NBA", "MLB")
   * @returns {Promise<Array<number>>} Array of tag IDs for that sport
   */
  async getSportTagIds(sportName) {
    try {
      const sports = await this.getSports()
      const sport = sports.find(s => 
        s.sport && s.sport.toUpperCase() === sportName.toUpperCase()
      )
      
      if (!sport || !sport.tags) {
        return []
      }
      
      // Tags can be a comma-separated string or array
      if (typeof sport.tags === 'string') {
        return sport.tags.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      } else if (Array.isArray(sport.tags)) {
        return sport.tags.map(id => parseInt(id)).filter(id => !isNaN(id))
      }
      
      return []
    } catch (error) {
      console.error(`Error getting tag IDs for sport ${sportName}:`, error)
      return []
    }
  }

  /**
   * Fetch events from Polymarket
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of event objects
   */
  async getEvents(options = {}) {
    try {
      // Check cache first
      const cacheKey = `events-${JSON.stringify(options)}`
      const cached = this.cache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }
      

      // Polymarket Events API endpoint
      const params = new URLSearchParams({
        order: options.order || 'id',
        ascending: String(options.ascending !== undefined ? options.ascending : false),
        closed: String(options.closed !== undefined ? options.closed : false),
        limit: String(options.limit || 100),
        ...(options.offset && { offset: String(options.offset) }),
        ...(options.featured !== undefined && { featured: String(options.featured) }),
      })

      const response = await fetch(
        `${this.apiUrl}/events?${params.toString()}`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`)
      }

      const data = await response.json()
      
      // Handle different response formats
      const eventsData = Array.isArray(data) ? data : (data.data || data.events || [])

      // Cache the result (5 minute TTL)
      this.cache.set(cacheKey, {
        data: eventsData,
        timestamp: Date.now(),
      })

      return eventsData
    } catch (error) {
      console.error('Error fetching Polymarket events:', error)
      throw error
    }
  }

  /**
   * Fallback markets if API fails
   */
  getFallbackMarkets() {
    return [
      {
        id: 'fallback-polymarket',
        icon: '📊',
        title: 'Polymarket API Unavailable',
        description: 'Unable to fetch real markets. Check your connection or try again later.',
        yesPrice: 50,
        noPrice: 50,
        volume: 0,
        category: 'general',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        polymarketData: {
          conditionId: 'fallback',
          slug: 'fallback',
          tickSize: '0.001',
          negRisk: false,
        },
      },
    ]
  }
}

// Export singleton instance
export const polymarketService = new PolymarketService()

export default PolymarketService

