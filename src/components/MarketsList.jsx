import React, { useState, useEffect } from 'react'
import { Search, Filter } from 'lucide-react'
import { polymarketService } from '../services/PolymarketService'

const categories = ['Trending', 'New', 'Politics', 'Sports', 'Finance', 'Crypto', 'Tech', 'Pop Culture', 'Business', 'World', 'Science']

export default function MarketsList({ onSelectMarket }) {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Trending')

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true)
        setError(null)
        const marketsData = await polymarketService.getMarkets({
          limit: 100,
          active: true,
          closed: false, // Only get open markets
        })
        setMarkets(marketsData)
      } catch (err) {
        console.error('Error fetching markets:', err)
        setError(err.message || 'Failed to load markets')
      } finally {
        setLoading(false)
      }
    }

    fetchMarkets()
  }, [])

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

  const filteredMarkets = markets.filter(market => {
    const matchesSearch = !searchQuery || 
      market.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      market.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'Trending' || 
      selectedCategory === 'New' ||
      market.category?.toLowerCase() === selectedCategory.toLowerCase()
    
    return matchesSearch && matchesCategory
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
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition font-semibold"
          >
            Retry
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

      {/* Markets Table */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
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
              {filteredMarkets.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-gray-400">
                    No markets found
                  </td>
                </tr>
              ) : (
                filteredMarkets.map((market) => {
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
                          {market.icon && (
                            <span className="text-xl">{market.icon}</span>
                          )}
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

