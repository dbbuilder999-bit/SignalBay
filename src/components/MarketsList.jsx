import React, { useState, useEffect, useRef } from 'react'
import { Search, Filter, List, Grid } from 'lucide-react'
import { polymarketService } from '../services/PolymarketService'

const categories = ['Trending', 'New', 'Politics', 'Sports', 'Finance', 'Crypto', 'Tech', 'Pop Culture', 'Business', 'World', 'Science']

// Map UI category names to Polymarket category values
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
            limit: 200,
            active: true,
            closed: false,
          })
          setMarkets(marketsData)
          // Cache the results
          categoryCacheRef.current['Trending'] = marketsData
        } else {
          // For specific categories, fetch fresh data and filter
          // Check cache first
          if (categoryCacheRef.current[selectedCategory]) {
            setMarkets(categoryCacheRef.current[selectedCategory])
            setLoading(false)
            return
          }

          // Get category keywords for filtering
          const categoryKeywords = categoryMap[selectedCategory] || []
          if (categoryKeywords.length === 0) {
            setMarkets([])
            setLoading(false)
            return
          }

          // Fetch fresh markets (we'll filter client-side since Polymarket API
          // may not support category filtering directly)
          const marketsData = await polymarketService.getMarkets({
            limit: 200,
            active: true,
            closed: false,
          })
          
          // Filter markets for this category
          const filtered = marketsData.filter(market => {
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

  // Filter markets by search query only (category filtering is done via API/cache)
  const filteredMarkets = markets.filter(market => {
    if (!searchQuery) return true
    
    return market.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           market.description?.toLowerCase().includes(searchQuery.toLowerCase())
  })

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
            <h1 className="text-2xl font-bold text-white">{filteredMarkets.length} Markets</h1>
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

