import React, { useState, useEffect, useRef } from 'react'
import { Search, Filter, List, Grid } from 'lucide-react'
import { polymarketService } from '../services/PolymarketService'

const categories = ['Trending', 'New', 'Politics', 'Sports', 'Finance', 'Crypto', 'Tech', 'Pop Culture', 'Business', 'World', 'Science']

// Map UI category names to Polymarket API parameters
// Note: API uses tag_id (integer) for categories, not category (string)
// For sports, we can use sports_market_types parameter
const categoryApiMap = {
  'Trending': null, // Special: shows all markets
  'New': null, // Special: shows all markets
  'Politics': null, // Would need tag_id - using client-side filtering for now
  'Sports': { sports_market_types: [] }, // Can use sports_market_types for sports
  'Finance': null, // Would need tag_id - using client-side filtering for now
  'Crypto': null, // Would need tag_id - using client-side filtering for now
  'Tech': null, // Would need tag_id - using client-side filtering for now
  'Pop Culture': null, // Would need tag_id - using client-side filtering for now
  'Business': null, // Would need tag_id - using client-side filtering for now
  'World': null, // Would need tag_id - using client-side filtering for now
  'Science': null, // Would need tag_id - using client-side filtering for now
}

// Map UI category names to keywords for client-side filtering (fallback)
const categoryMap = {
  'Trending': null, // Special: shows all markets
  'New': null, // Special: shows all markets
  'Politics': ['politics', 'political', 'election', 'elections'],
  'Sports': ['sports', 'sport'],
  'Finance': ['finance', 'financial', 'economics', 'economic'],
  'Crypto': ['crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain'],
  'Tech': ['tech', 'technology', 'tech companies'],
  'Pop Culture': ['entertainment', 'pop culture', 'celebrity', 'movies', 'music'],
  'Business': ['business', 'companies', 'corporate'],
  'World': ['world', 'international', 'global'],
  'Science': ['science', 'scientific', 'research'],
}

// Component to handle market images with fallback to icon
function MarketImage({ src, alt, fallbackIcon, size = 'small' }) {
  const [imageError, setImageError] = useState(false)

  if (imageError && fallbackIcon) {
    const sizeClass = size === 'large' ? 'text-4xl' : 'text-xl'
    return <span className={`${sizeClass} flex-shrink-0`}>{fallbackIcon}</span>
  }

  const sizeClass = size === 'large' ? 'w-full h-32 rounded-lg mb-3' : 'w-10 h-10 rounded'
  return (
    <img 
      src={src} 
      alt={alt}
      className={`${sizeClass} object-cover flex-shrink-0`}
      onError={() => setImageError(true)}
    />
  )
}

export default function MarketsList({ onSelectMarket }) {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Trending')
  const [viewMode, setViewMode] = useState('list') // 'list' or 'tile'
  const categoryCacheRef = useRef({}) // Cache markets by category using ref to avoid dependency issues
  const sportsTagIdsRef = useRef(null) // Cache sports tag IDs
  const tagsRef = useRef(null) // Cache tags data for category-to-tag_id mapping

  // Map UI category names to potential tag name matches
  const categoryToTagNameMap = {
    'Politics': ['politics', 'political', 'election', 'elections', 'government', 'governance'],
    'Finance': ['finance', 'financial', 'economics', 'economic', 'fiscal', 'monetary'],
    'Crypto': ['crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'web3'],
    'Tech': ['tech', 'technology', 'software', 'hardware', 'ai', 'artificial intelligence', 'machine learning'],
    'Pop Culture': ['entertainment', 'pop culture', 'celebrity', 'movies', 'music', 'tv', 'television', 'film'],
    'Business': ['business', 'companies', 'corporate', 'enterprise', 'startup', 'startups'],
    'World': ['world', 'international', 'global', 'geopolitics', 'foreign', 'diplomacy'],
    'Science': ['science', 'scientific', 'research', 'physics', 'chemistry', 'biology', 'medicine', 'medical'],
  }

  /**
   * Find tag IDs for a given category by matching category name to tag names
   * @param {string} categoryName - UI category name (e.g., "Politics", "Crypto")
   * @returns {Array<number>} Array of tag IDs for that category
   */
  const findTagIdsForCategory = (categoryName) => {
    if (!tagsRef.current || !Array.isArray(tagsRef.current)) {
      return []
    }

    const tagNameMatches = categoryToTagNameMap[categoryName] || []
    if (tagNameMatches.length === 0) {
      return []
    }

    const matchedTagIds = []
    tagsRef.current.forEach(tag => {
      const tagName = (tag.name || tag.tag || tag.title || '').toLowerCase()
      const tagId = tag.id || tag.tag_id

      if (tagId && tagNameMatches.some(match => tagName.includes(match.toLowerCase()))) {
        matchedTagIds.push(tagId)
      }
    })

    return matchedTagIds
  }

  // Fetch tags on component mount (for category-to-tag_id mapping)
  useEffect(() => {
    const fetchTags = async () => {
      if (tagsRef.current) {
        // Tags already cached
        return
      }

      try {
        console.log('[Tags] Fetching tags for category mapping...')
        const tags = await polymarketService.getTags()
        tagsRef.current = tags
        console.log(`[Tags] Cached ${tags.length} tags for category mapping`)
      } catch (err) {
        console.warn('Error fetching tags, will use client-side filtering as fallback:', err)
        tagsRef.current = [] // Set to empty array to prevent repeated failed attempts
      }
    }

    fetchTags()
  }, []) // Only run once on mount

  // Fetch markets based on selected category
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true)
        setError(null)

        // For "Trending" and "New", fetch all markets (client-side filtering)
        if (selectedCategory === 'Trending' || selectedCategory === 'New') {
          // Check cache first
          if (categoryCacheRef.current['Trending']) {
            setMarkets(categoryCacheRef.current['Trending'])
            setLoading(false)
            return
          }

          const marketsData = await polymarketService.getMarkets({
            limit: 1000, // Increased limit for better results after client-side filtering
            active: true,
            closed: false, // We'll fetch closed markets separately and combine them
            order: 'endDate', // Sort by endDate
            ascending: true, // Ascending order (earliest dates first)
          })
          
          // Also fetch closed markets to show at the bottom
          const closedMarketsData = await polymarketService.getMarkets({
            limit: 100, // Fewer closed markets needed
            active: true,
            closed: true, // Get closed markets
            order: 'endDate', // Sort by endDate
            ascending: true, // Ascending order (earliest dates first)
          })
          
          // Combine open and closed markets (will be sorted by sortMarkets function)
          const allMarkets = [...marketsData, ...closedMarketsData]
          setMarkets(allMarkets)
          // Cache the results (before sorting, so we can restore them)
          categoryCacheRef.current['Trending'] = allMarkets
        } else {
          // For specific categories, fetch fresh data using API parameters
          // Check cache first
          if (categoryCacheRef.current[selectedCategory]) {
            setMarkets(categoryCacheRef.current[selectedCategory])
            setLoading(false)
            return
          }

          // Get Polymarket API parameters for this category
          const apiParams = categoryApiMap[selectedCategory]
          const categoryKeywords = categoryMap[selectedCategory] || []
          
          if (!apiParams && categoryKeywords.length === 0) {
            setMarkets([])
            setLoading(false)
            return
          }

          // Build API options for open markets
          const apiOptions = {
            limit: 1000,
            active: true,
            closed: false, // Get open markets first
            order: 'endDate', // Sort by endDate
            ascending: true, // Ascending order (earliest dates first)
            // Add category name for debugging/visibility
            _category: selectedCategory.toLowerCase(),
          }
          
          // Also build options for closed markets
          const closedApiOptions = {
            ...apiOptions,
            closed: true, // Get closed markets
            limit: 100, // Fewer closed markets needed
          }
          
          // For Sports category, use sports tag IDs for server-side filtering
          if (selectedCategory === 'Sports') {
            try {
              // Get sports tag IDs (cache them)
              if (!sportsTagIdsRef.current) {
                const sports = await polymarketService.getSports()
                // Get all unique tag IDs from all sports
                const allTagIds = new Set()
                sports.forEach(sport => {
                  if (sport.tags) {
                    const tagIds = typeof sport.tags === 'string' 
                      ? sport.tags.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                      : Array.isArray(sport.tags) 
                        ? sport.tags.map(id => parseInt(id)).filter(id => !isNaN(id))
                        : []
                    tagIds.forEach(id => allTagIds.add(id))
                  }
                })
                sportsTagIdsRef.current = Array.from(allTagIds)
                console.log(`[Sports] Found ${sportsTagIdsRef.current.length} unique tag IDs from sports metadata`)
              }
              
              if (sportsTagIdsRef.current.length > 0) {
                // TESTING: Use single tag_id for now (first one)
                const singleTagId = sportsTagIdsRef.current[0]
                apiOptions.tag_id = singleTagId
                apiOptions.related_tags = true // Include related tags
                console.log(`[Sports] Using single tag_id for testing: ${singleTagId} (from ${sportsTagIdsRef.current.length} available)`)
              }
            } catch (err) {
              console.warn('Error fetching sports tag IDs, falling back to client-side filtering:', err)
            }
          } else {
            // For non-sports categories, try to find tag IDs from tags API
            const categoryTagIds = findTagIdsForCategory(selectedCategory)
            if (categoryTagIds.length > 0) {
              // Use all matched tag IDs for server-side filtering
              apiOptions.tag_id = categoryTagIds
              apiOptions.related_tags = true // Include related tags
              console.log(`[${selectedCategory}] Using ${categoryTagIds.length} tag IDs for server-side filtering:`, categoryTagIds)
            } else {
              console.log(`[${selectedCategory}] No tag IDs found, will use client-side filtering`)
            }
          }
          
          // Add other API-specific parameters if available
          if (apiParams) {
            if (apiParams.sports_market_types && Array.isArray(apiParams.sports_market_types) && apiParams.sports_market_types.length > 0) {
              apiOptions.sports_market_types = apiParams.sports_market_types
            }
            if (apiParams.tag_id) {
              apiOptions.tag_id = apiParams.tag_id
            }
          }

          // Fetch open markets (with server-side filtering if tag_id is available)
          const marketsData = await polymarketService.getMarkets(apiOptions)
          
          // Also fetch closed markets for this category (apply same filters)
          let closedMarketsData = []
          try {
            // Apply same tag_id filters to closed markets
            if (apiOptions.tag_id) {
              closedApiOptions.tag_id = apiOptions.tag_id
              closedApiOptions.related_tags = apiOptions.related_tags
            }
            closedMarketsData = await polymarketService.getMarkets(closedApiOptions)
          } catch (err) {
            console.warn('Error fetching closed markets:', err)
            // Continue without closed markets
          }
          
          // Combine open and closed markets
          const allMarketsData = [...marketsData, ...closedMarketsData]
          
          // Client-side filtering by category keywords (as fallback or additional filter)
          const filtered = allMarketsData.filter(market => {
            if (categoryKeywords.length === 0) {
              return true
            }
            
            const marketCategory = market.category?.toLowerCase() || ''
            const marketTitle = market.title?.toLowerCase() || ''
            const marketDescription = market.description?.toLowerCase() || ''
            
            return categoryKeywords.some(keyword => 
              marketCategory.includes(keyword) ||
              marketTitle.includes(keyword) ||
              marketDescription.includes(keyword) ||
              marketCategory === keyword
            )
          })

          setMarkets(filtered)
          // Cache the filtered results for this category
          categoryCacheRef.current[selectedCategory] = filtered
        }
      } catch (err) {
        console.error('Error fetching markets:', err)
        setError(err.message || 'Failed to load markets')
      } finally {
        setLoading(false)
      }
    }

    fetchMarkets()
  }, [selectedCategory]) // Re-fetch when category changes

  // Handle search queries using public-search endpoint
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery || searchQuery.trim().length === 0) {
        // If search is cleared, restore markets for current category
        if (categoryCacheRef.current[selectedCategory]) {
          setMarkets(categoryCacheRef.current[selectedCategory])
        }
        return
      }

      try {
        setLoading(true)
        setError(null)

        console.log(`[Search] Searching for: "${searchQuery}"`)
        const searchResults = await polymarketService.searchMarkets(searchQuery, {
          limit_per_type: 50, // Limit results per type (markets, events, etc.)
          search_tags: true, // Search in tags
          search_profiles: false, // Don't search profiles for now
          sort: 'relevance', // Sort by relevance
        })

        setMarkets(searchResults)
        console.log(`[Search] Displaying ${searchResults.length} search results`)
      } catch (err) {
        console.error('Error searching markets:', err)
        setError(err.message || 'Search failed')
        setMarkets([])
      } finally {
        setLoading(false)
      }
    }

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      performSearch()
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId)
  }, [searchQuery, selectedCategory]) // Re-search when query or category changes

  const formatPrice = (price) => {
    if (price >= 100) return '100.0¢'
    if (price <= 0) return '0.0¢'
    return `${price.toFixed(1)}¢`
  }

  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toLocaleString()}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
  }

  const calculateSpread = (yesPrice, noPrice) => {
    return Math.abs(yesPrice - noPrice)
  }

  /**
   * Sort markets: open markets first, then closed markets
   * Within each group, sort by endDate (ascending - earliest dates first)
   */
  const sortMarkets = (marketsArray) => {
    if (!Array.isArray(marketsArray) || marketsArray.length === 0) {
      return marketsArray
    }

    // Separate open and closed markets
    const openMarkets = []
    const closedMarkets = []

    marketsArray.forEach(market => {
      const isClosed = market.closed === true || market.closed === 'true' || 
                      (market.polymarketData && market.polymarketData.closed === true)
      
      if (isClosed) {
        closedMarkets.push(market)
      } else {
        openMarkets.push(market)
      }
    })

    // Sort function: by endDate (ascending - earliest first)
    const sortByEndDate = (a, b) => {
      const dateA = a.endDate ? new Date(a.endDate).getTime() : Infinity
      const dateB = b.endDate ? new Date(b.endDate).getTime() : Infinity
      
      // If both have dates, sort ascending (earliest first)
      if (dateA !== Infinity && dateB !== Infinity) {
        return dateA - dateB
      }
      // Markets without dates go to the end
      if (dateA === Infinity && dateB === Infinity) return 0
      if (dateA === Infinity) return 1
      if (dateB === Infinity) return -1
      return 0
    }

    // Sort each group by endDate
    openMarkets.sort(sortByEndDate)
    closedMarkets.sort(sortByEndDate)

    // Return open markets first, then closed markets
    return [...openMarkets, ...closedMarkets]
  }

  // When search is active, use search results directly (no additional filtering needed)
  // When no search, use markets from category
  // Sort markets: open first, then closed, both sorted by endDate
  const filteredMarkets = sortMarkets(markets)

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading markets...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-6">📊</div>
          <h2 className="text-2xl font-bold text-white mb-3">No Markets Available</h2>
          <p className="text-gray-400 mb-6">
            We couldn't fetch markets from Polymarket at this time. This could be due to a temporary connection issue or API maintenance.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black border-b border-gray-800 px-6 py-4">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">
              {searchQuery 
                ? `Search: "${searchQuery}" (${filteredMarkets.length} results)`
                : `${filteredMarkets.length} Markets`}
            </h1>
            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition ${
                    viewMode === 'list'
                      ? 'bg-yellow-500 text-black'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('tile')}
                  className={`p-2 rounded transition ${
                    viewMode === 'tile'
                      ? 'bg-yellow-500 text-black'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                  title="Tile View"
                >
                  <Grid className="h-4 w-4" />
                </button>
              </div>
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                />
              </div>
              {/* Filter Button */}
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-800 transition">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-300">Filter</span>
              </button>
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  selectedCategory === category
                    ? 'bg-yellow-500 text-black border-2 border-yellow-500'
                    : 'bg-gray-900 text-gray-300 border border-gray-700 hover:bg-gray-800'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Markets Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
        {markets.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">🔍</div>
              <h2 className="text-2xl font-bold text-white mb-3">No Markets Found</h2>
              <p className="text-gray-400 mb-2">
                There are currently no active markets available from Polymarket.
              </p>
              <p className="text-gray-500 text-sm">
                Check back later for new prediction markets.
              </p>
            </div>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">🔎</div>
              <h2 className="text-2xl font-bold text-white mb-3">No Markets Match Your Filters</h2>
              <p className="text-gray-400 mb-4">
                Try adjusting your search or category filters to see more markets.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('Trending')
                }}
                className="px-6 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition font-semibold text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Title</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Prices</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Spread</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">24h Vol</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Volume</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Liquidity</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Start</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">End</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarkets.map((market) => {
                  const spread = calculateSpread(market.yesPrice || 0, market.noPrice || 0)
                  const volume24h = market.volume24h || market.volume || 0
                  const totalVolume = market.volume || 0
                  const liquidity = market.liquidity || market.volume || 0

                  return (
                    <tr
                      key={market.id}
                      className="border-b border-gray-900 hover:bg-gray-900/50 transition cursor-pointer"
                    >
                      {/* Title */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {market.imageUrl ? (
                            <MarketImage 
                              src={market.imageUrl} 
                              alt={market.title || 'Market'}
                              fallbackIcon={market.icon}
                            />
                          ) : market.icon ? (
                            <span className="text-xl flex-shrink-0">{market.icon}</span>
                          ) : null}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {market.title || market.question || `Market ${market.id}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Prices */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-400 font-medium">
                            Yes {formatPrice(market.yesPrice || 0)}
                          </span>
                          <span className="text-gray-600">•</span>
                          <span className="text-red-400 font-medium">
                            No {formatPrice(market.noPrice || 0)}
                          </span>
                        </div>
                      </td>

                      {/* Spread */}
                      <td className="py-4 px-4 text-right text-sm text-gray-300">
                        {formatPrice(spread)}
                      </td>

                      {/* 24h Vol */}
                      <td className="py-4 px-4 text-right text-sm text-gray-300">
                        {formatCurrency(volume24h)}
                      </td>

                      {/* Volume */}
                      <td className="py-4 px-4 text-right text-sm text-gray-300">
                        {formatCurrency(totalVolume)}
                      </td>

                      {/* Liquidity */}
                      <td className="py-4 px-4 text-right text-sm text-gray-300">
                        {formatCurrency(liquidity)}
                      </td>

                      {/* Start */}
                      <td className="py-4 px-4 text-sm text-gray-400">
                        {formatDate(market.startDate || market.createdDate)}
                      </td>

                      {/* End */}
                      <td className="py-4 px-4 text-sm text-gray-400">
                        {formatDate(market.endDate || market.resolutionDate)}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 text-center">
                        <button 
                          onClick={() => onSelectMarket && onSelectMarket(market)}
                          className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition font-semibold text-sm"
                        >
                          Trade
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tile View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMarkets.map((market) => {
              const spread = calculateSpread(market.yesPrice || 0, market.noPrice || 0)
              const volume24h = market.volume24h || market.volume || 0
              const totalVolume = market.volume || 0

              return (
                <div
                  key={market.id}
                  onClick={() => onSelectMarket && onSelectMarket(market)}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-yellow-500/50 hover:bg-gray-800/50 transition cursor-pointer"
                >
                  {/* Image/Icon */}
                  <div className="mb-3 flex justify-center">
                    {market.imageUrl ? (
                      <MarketImage 
                        src={market.imageUrl} 
                        alt={market.title || 'Market'}
                        fallbackIcon={market.icon}
                        size="large"
                      />
                    ) : market.icon ? (
                      <div className="text-4xl text-center mb-3">{market.icon}</div>
                    ) : null}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2">
                    {market.title || market.question || `Market ${market.id}`}
                  </h3>

                  {/* Prices */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-400 font-medium">
                        Yes {formatPrice(market.yesPrice || 0)}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="text-xs text-red-400 font-medium">
                        No {formatPrice(market.noPrice || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                    <div>
                      <span className="text-gray-500">24h Vol</span>
                      <p className="text-white font-medium">{formatCurrency(volume24h)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">Spread</span>
                      <p className="text-white font-medium">{formatPrice(spread)}</p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectMarket && onSelectMarket(market)
                    }}
                    className="w-full px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition font-semibold text-sm"
                  >
                    Trade
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

