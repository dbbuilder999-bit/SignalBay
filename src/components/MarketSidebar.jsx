import React, { useState, useEffect, useRef } from 'react'
import { Search, Sun, Moon } from 'lucide-react'
import TruncatedText from './TruncatedText'
import { polymarketService } from '../services/PolymarketService'

// Component to handle market images with fallback to icon
function MarketImage({ src, alt, fallbackIcon }) {
  const [imageError, setImageError] = useState(false)

  if (imageError && fallbackIcon) {
    return <span className="text-2xl flex-shrink-0">{fallbackIcon}</span>
  }

  return (
    <img 
      src={src} 
      alt={alt}
      className="w-10 h-10 rounded object-cover flex-shrink-0"
      onError={() => setImageError(true)}
    />
  )
}

export default function MarketSidebar({ markets, selectedMarket, onSelectMarket, activeTab, onTabChange, watchlist = [], isInWatchlist }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null) // null = no search, [] = search with no results, [...] = search results
  const [isSearching, setIsSearching] = useState(false)
  const [watchlistMarkets, setWatchlistMarkets] = useState([]) // Markets fetched specifically for watchlist
  const [relatedMarkets, setRelatedMarkets] = useState([]) // Markets fetched for Related tab
  const [isLoadingRelated, setIsLoadingRelated] = useState(false)
  const searchTimeoutRef = useRef(null)
  const originalMarketsRef = useRef(markets) // Store original markets

  // Update original markets ref when markets prop changes
  useEffect(() => {
    if (!searchQuery) {
      originalMarketsRef.current = markets
    }
  }, [markets, searchQuery])

  // Fetch related markets when Related tab is active and a market is selected
  useEffect(() => {
    if (activeTab === 'Related' && selectedMarket) {
      const fetchRelatedMarkets = async () => {
        setIsLoadingRelated(true)
        try {
          const allRelatedMarkets = []
          
          // Strategy 1: Search by category if available
          if (selectedMarket.category) {
            try {
              const categoryMarkets = await polymarketService.searchMarkets(selectedMarket.category, {
                limit_per_type: 20,
                search_tags: true,
                sort: 'relevance',
              })
              // Filter out the current market and add to results
              categoryMarkets
                .filter(m => m.id !== selectedMarket.id)
                .forEach(m => {
                  if (!allRelatedMarkets.find(rm => rm.id === m.id)) {
                    allRelatedMarkets.push(m)
                  }
                })
            } catch (err) {
            }
          }
          
          // Strategy 2: Extract keywords from title and search
          const title = selectedMarket.title || selectedMarket.question || ''
          if (title) {
            // Extract key words (remove common words, get 2-3 most relevant words)
            const words = title.toLowerCase()
              .replace(/[^\w\s]/g, ' ')
              .split(/\s+/)
              .filter(w => w.length > 3 && !['will', 'this', 'that', 'what', 'when', 'where', 'which', 'who', 'how'].includes(w))
              .slice(0, 3)
            
            if (words.length > 0) {
              const searchQuery = words.join(' ')
              try {
                const keywordMarkets = await polymarketService.searchMarkets(searchQuery, {
                  limit_per_type: 20,
                  search_tags: true,
                  sort: 'relevance',
                })
                // Filter out the current market and add to results
                keywordMarkets
                  .filter(m => m.id !== selectedMarket.id)
                  .forEach(m => {
                    if (!allRelatedMarkets.find(rm => rm.id === m.id)) {
                      allRelatedMarkets.push(m)
                    }
                  })
              } catch (err) {
              }
            }
          }
          
          // Strategy 3: If market has tags, fetch markets with same tags
          if (selectedMarket.polymarketData?.tags && Array.isArray(selectedMarket.polymarketData.tags) && selectedMarket.polymarketData.tags.length > 0) {
            try {
              // Get markets with the same tag (use first tag)
              const tagId = selectedMarket.polymarketData.tags[0]
              if (tagId) {
                const tagMarkets = await polymarketService.getMarkets({
                  tag_id: tagId,
                  related_tags: true,
                  limit: 20,
                  active: true,
                })
                tagMarkets
                  .filter(m => m.id !== selectedMarket.id)
                  .forEach(m => {
                    if (!allRelatedMarkets.find(rm => rm.id === m.id)) {
                      allRelatedMarkets.push(m)
                    }
                  })
              }
            } catch (err) {
            }
          }
          
          // Strategy 4: Fallback - get trending markets in same category
          if (allRelatedMarkets.length === 0 && selectedMarket.category) {
            try {
              const fallbackMarkets = await polymarketService.getMarkets({
                limit: 30,
                active: true,
              })
              // Filter by category and exclude current market
              const categoryFiltered = fallbackMarkets.filter(m => 
                m.category === selectedMarket.category && 
                m.id !== selectedMarket.id
              )
              allRelatedMarkets.push(...categoryFiltered.slice(0, 10))
            } catch (err) {
            }
          }
          
          // Limit to 15 related markets
          setRelatedMarkets(allRelatedMarkets.slice(0, 15))
        } catch (err) {
          console.error('[Related] Error fetching related markets:', err)
          setRelatedMarkets([])
        } finally {
          setIsLoadingRelated(false)
        }
      }
      
      fetchRelatedMarkets()
    } else {
      setRelatedMarkets([])
      setIsLoadingRelated(false)
    }
  }, [activeTab, selectedMarket])

  // Fetch watchlisted markets that aren't in the current markets array
  useEffect(() => {
    if (activeTab === 'Watchlist' && watchlist.length > 0) {
      const fetchWatchlistMarkets = async () => {
        const missingMarketIds = watchlist.filter(id => 
          !markets.some(m => 
            m.id === id || 
            m.polymarketData?.slug === id ||
            m.polymarketData?.conditionId === id ||
            String(m.id) === String(id)
          )
        )

        if (missingMarketIds.length > 0) {
          try {
            // Try to fetch missing markets by ID
            const fetchedMarkets = []
            for (const marketId of missingMarketIds.slice(0, 20)) { // Limit to 20 to avoid too many requests
              try {
                const market = await polymarketService.getMarket(marketId)
                if (market) {
                  fetchedMarkets.push(market)
                }
              } catch (err) {
              }
            }
            if (fetchedMarkets.length > 0) {
              setWatchlistMarkets(fetchedMarkets)
            }
          } catch (err) {
            console.error('[Watchlist] Error fetching watchlist markets:', err)
          }
        } else {
          setWatchlistMarkets([])
        }
      }

      fetchWatchlistMarkets()
    } else {
      setWatchlistMarkets([])
    }
  }, [activeTab, watchlist, markets])

  // Handle search queries using public-search endpoint
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchQuery || searchQuery.trim().length === 0) {
      // If search is cleared, restore original markets
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    // Debounce search to avoid too many API calls
    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await polymarketService.searchMarkets(searchQuery, {
          limit_per_type: 50, // Limit results per type (markets, events, etc.)
          search_tags: true, // Search in tags
          search_profiles: false, // Don't search profiles for now
          sort: 'relevance', // Sort by relevance
        })

        setSearchResults(results)
      } catch (err) {
        console.error('Error searching markets in sidebar:', err)
        setSearchResults([]) // Set to empty array on error
      } finally {
        setIsSearching(false)
      }
    }, 500) // Wait 500ms after user stops typing

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  /**
   * Helper function to check if market is closed
   */
  const isMarketClosed = (market) => {
    return market.closed === true || market.closed === 'true' || 
           (market.polymarketData && market.polymarketData.closed === true)
  }

  /**
   * Sort markets: open markets first, then closed markets
   * Within each group, sort by volume (24hr volume first, then total volume) - most traded first
   */
  const sortMarkets = (marketsArray) => {
    if (!Array.isArray(marketsArray) || marketsArray.length === 0) {
      return marketsArray
    }

    // Separate open and closed markets
    const openMarkets = []
    const closedMarkets = []

    marketsArray.forEach(market => {
      if (isMarketClosed(market)) {
        closedMarkets.push(market)
      } else {
        openMarkets.push(market)
      }
    })

    // Sort function: by volume (24hr volume first, then total volume) - descending (most traded first)
    const sortByVolume = (a, b) => {
      // Prioritize 24hr volume, fallback to total volume
      const volumeA = a.volume24h || a.volume || 0
      const volumeB = b.volume24h || b.volume || 0
      
      // If volumes are equal, use total volume as tiebreaker
      if (volumeA === volumeB) {
        const totalVolumeA = a.volume || 0
        const totalVolumeB = b.volume || 0
        return totalVolumeB - totalVolumeA // Descending
      }
      
      return volumeB - volumeA // Descending (most traded first)
    }

    // Sort each group by volume
    openMarkets.sort(sortByVolume)
    closedMarkets.sort(sortByVolume)

    // Return open markets first, then closed markets
    return [...openMarkets, ...closedMarkets]
  }

  // Determine which markets to display based on active tab and search
  let marketsToDisplay = markets
  
  // Filter by active tab
  if (activeTab === 'Watchlist') {
    if (watchlist.length > 0) {
      // Combine current markets and fetched watchlist markets
      const allAvailableMarkets = [...markets, ...watchlistMarkets]
      
      marketsToDisplay = allAvailableMarkets.filter(m => {
        const isInList = watchlist.includes(m.id)
        if (!isInList) {
          // Also check if market ID matches any variation (slug, conditionId, etc.)
          return watchlist.some(watchlistId => 
            m.id === watchlistId || 
            m.polymarketData?.slug === watchlistId ||
            m.polymarketData?.conditionId === watchlistId ||
            String(m.id) === String(watchlistId)
          )
        }
        return isInList
      })
      
      // Remove duplicates
      const uniqueMarkets = []
      const seenIds = new Set()
      marketsToDisplay.forEach(m => {
        const id = m.id || m.polymarketData?.slug || m.polymarketData?.conditionId
        if (id && !seenIds.has(id)) {
          seenIds.add(id)
          uniqueMarkets.push(m)
        }
      })
      marketsToDisplay = uniqueMarkets
      
    } else {
      marketsToDisplay = []
    }
  } else if (activeTab === 'Trending') {
    // For Trending, show markets sorted by volume (24hr volume first, then total volume) - most traded first
    marketsToDisplay = [...markets].sort((a, b) => {
      const volumeA = a.volume24h || a.volume || 0
      const volumeB = b.volume24h || b.volume || 0
      return volumeB - volumeA // Descending (most traded first)
    })
  } else if (activeTab === 'Related') {
    // For Related, use fetched related markets, fallback to category filter from existing markets
    if (relatedMarkets.length > 0) {
      marketsToDisplay = relatedMarkets
    } else if (selectedMarket) {
      // Fallback: show markets in same category from existing markets
      const relatedCategory = selectedMarket.category
      marketsToDisplay = markets.filter(m => 
        m.category === relatedCategory && 
        m.id !== selectedMarket.id
      )
    } else {
      marketsToDisplay = []
    }
  }

  // Determine which markets to display and sort them
  // API already filters closed markets, so we just sort
  const filteredMarkets = searchResults !== null 
    ? sortMarkets(searchResults) // Use and sort search results if search is active
    : sortMarkets(marketsToDisplay) // Sort filtered markets if no search

  const formatPrice = (price) => {
    if (price >= 100) return '100¢'
    if (price <= 0) return '0¢'
    return `${price.toFixed(1)}¢`
  }

  const formatVolume = (volume) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(2)}M`
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`
    return `$${volume.toLocaleString()}`
  }

  return (
    <aside className="w-80 bg-[#0a0d14] border-r border-white/10 flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {['Related', 'Trending', 'Watchlist'].map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === tab
                ? 'text-white border-b-2 border-yellow-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Market List */}
      <div className="flex-1 overflow-y-auto">
        {isSearching && (
          <div className="p-4 text-center text-gray-400 text-sm">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400 mx-auto mb-2"></div>
            <p>Searching markets...</p>
          </div>
        )}
        {!isSearching && searchResults !== null && filteredMarkets.length === 0 && (
          <div className="p-4 text-center text-gray-400 text-sm">
            No markets found for "{searchQuery}"
          </div>
        )}
        {!isSearching && searchResults === null && activeTab === 'Watchlist' && filteredMarkets.length === 0 && (
          <div className="p-4 text-center text-gray-400 text-sm">
            <p className="mb-2">Your watchlist is empty</p>
            <p className="text-xs text-gray-500">Click the star icon on any market to add it to your watchlist</p>
          </div>
        )}
        {!isSearching && searchResults === null && activeTab === 'Related' && isLoadingRelated && (
          <div className="p-4 text-center text-gray-400 text-sm">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400 mx-auto mb-2"></div>
            <p>Loading related markets...</p>
          </div>
        )}
        {!isSearching && searchResults === null && activeTab === 'Related' && !isLoadingRelated && filteredMarkets.length === 0 && (
          <div className="p-4 text-center text-gray-400 text-sm">
            <p className="mb-2">No related markets found</p>
            <p className="text-xs text-gray-500">Try selecting a different market to see related markets</p>
          </div>
        )}
        {filteredMarkets.map((market) => (
          <button
            key={market.id}
            onClick={() => onSelectMarket(market)}
            className={`w-full text-left p-4 border-b border-white/5 hover:bg-white/5 transition ${
              selectedMarket?.id === market.id ? 'bg-yellow-500/10 border-l-4 border-l-yellow-500' : ''
            }`}
          >
            <div className="flex items-start gap-3 mb-2">
              {market.imageUrl ? (
                <MarketImage 
                  src={market.imageUrl} 
                  alt={market.title || 'Market'}
                  fallbackIcon={market.icon}
                />
              ) : market.icon ? (
                <span className="text-2xl flex-shrink-0">{market.icon}</span>
              ) : null}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{market.title}</p>
                <TruncatedText 
                  text={market.description} 
                  maxLength={80}
                  className="mt-0.5"
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">Yes</span>
                  <span className="text-sm font-semibold text-yellow-400">{formatPrice(market.yesPrice)}</span>
                </div>
                <span className="text-gray-600">•</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">No</span>
                  <span className="text-sm font-semibold text-red-400">{formatPrice(market.noPrice)}</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <span className="text-gray-400">Volume</span>
                <p className="text-white font-medium">{formatVolume(market.volume)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer Controls */}
      <div className="p-4 border-t border-white/10 flex items-center justify-end">
        <div className="flex gap-2">
          <button className="px-3 py-1 text-xs border border-white/20 rounded hover:bg-white/5 transition">
            EN
          </button>
          <button className="px-3 py-1 text-xs border border-white/20 rounded hover:bg-white/5 transition">
            CN
          </button>
        </div>
      </div>
    </aside>
  )
}

