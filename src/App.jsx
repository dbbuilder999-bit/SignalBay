import React, { useState, useEffect } from 'react'
import { Search, Star, Twitter } from 'lucide-react'
import MarketSidebar from './components/MarketSidebar'
import PredictionChart from './components/PredictionChart'
import TradingTabs from './components/TradingTabs'
import OrderPanel from './components/OrderPanel'
import MarketsList from './components/MarketsList'
import EventsList from './components/EventsList'
import TruncatedText from './components/TruncatedText'
import LandingPage from './components/LandingPage'
import LoginModal from './components/LoginModal'
// Polymarket is the source of truth for market data
import { polymarketService } from './services/PolymarketService'
import { walletService } from './services/WalletService'

// Always use Polymarket service for real data
const dataService = polymarketService

// Component to handle market header image with fallback to icon
function MarketHeaderImage({ market }) {
  const [imageError, setImageError] = useState(false)
  
  // Check multiple possible field names for image URL
  const imageUrl = market?.imageUrl || 
                   market?.image || 
                   market?.thumbnail || 
                   market?.image_url ||
                   market?.thumbnailUrl ||
                   market?.thumbnail_url ||
                   null
  
  // Only use if it's a valid URL
  const hasValidImage = imageUrl && 
                       typeof imageUrl === 'string' && 
                       (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))
  
  if (hasValidImage && !imageError) {
    return (
      <img
        src={imageUrl}
        alt={market?.title || 'Market'}
        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        onError={() => setImageError(true)}
      />
    )
  }
  
  return <span className="text-3xl flex-shrink-0">{market?.icon || '📊'}</span>
}

export default function SignalBay() {
  const [walletAddress, setWalletAddress] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showLanding, setShowLanding] = useState(() => {
    // Check if user has visited before (stored in localStorage)
    try {
      return !localStorage.getItem('signalbay-has-visited')
    } catch {
      return true
    }
  })
  const [viewMode, setViewMode] = useState('markets') // 'events' | 'markets' | 'trade'
  const [selectedMarket, setSelectedMarket] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null) // Track selected event for filtering markets
  const [markets, setMarkets] = useState([])
  const [activeTab, setActiveTab] = useState('Related')
  const [loading, setLoading] = useState(true)
  const [watchlist, setWatchlist] = useState(() => {
    // Load watchlist from localStorage on mount
    try {
      const saved = localStorage.getItem('signalbay-watchlist')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [showRulesModal, setShowRulesModal] = useState(false)

  // Fetch markets on mount (only when in trade view, since MarketsList handles its own data)
  useEffect(() => {
    // Don't fetch if showing events/markets list - MarketsList handles its own data fetching
    if (viewMode !== 'trade') {
      setLoading(false)
      return
    }

    const fetchMarkets = async () => {
      try {
        setLoading(true)
        // Use same limit as MarketsList to leverage cache
        const marketData = await dataService.getMarkets({ limit: 1000, active: true, closed: false })
        setMarkets(marketData)
        if (marketData.length > 0 && !selectedMarket) {
          setSelectedMarket(marketData[0])
        }
      } catch (error) {
        console.error('Error loading markets:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMarkets()
  }, [viewMode])

  // Check wallet connection on mount
  useEffect(() => {
    const checkWalletConnection = () => {
      if (walletService.isConnected()) {
        setWalletAddress(walletService.getAddress())
      }
    }
    checkWalletConnection()

    // Listen for wallet account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          walletService.disconnect()
          setWalletAddress(null)
        } else {
          setWalletAddress(accounts[0])
        }
      })

      window.ethereum.on('chainChanged', () => {
        window.location.reload()
      })
    }
  }, [])

  // Handle wallet connection
  const handleWalletConnect = (result) => {
    setWalletAddress(result.address)
    console.log('Wallet connected:', result.address)
  }

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('signalbay-watchlist', JSON.stringify(watchlist))
    } catch (error) {
      console.error('Error saving watchlist to localStorage:', error)
    }
  }, [watchlist])

  // Toggle market in watchlist
  const toggleWatchlist = (marketId) => {
    setWatchlist(prev => {
      if (prev.includes(marketId)) {
        console.log(`[Watchlist] Removing market ${marketId} from watchlist`)
        return prev.filter(id => id !== marketId)
      } else {
        console.log(`[Watchlist] Adding market ${marketId} to watchlist`)
        return [...prev, marketId]
      }
    })
  }

  // Check if market is in watchlist
  const isInWatchlist = (marketId) => {
    return watchlist.includes(marketId)
  }

  // Subscribe to price updates for selected market
  useEffect(() => {
    if (!selectedMarket) return

    const handlePriceUpdate = (update) => {
      setSelectedMarket(prev => {
        if (!prev || prev.id !== update.marketId) return prev
        return {
          ...prev,
          yesPrice: update.yesPrice,
          noPrice: update.noPrice,
        }
      })
      
      // Also update in markets list
      setMarkets(prev => prev.map(m => 
        m.id === update.marketId
          ? { ...m, yesPrice: update.yesPrice, noPrice: update.noPrice }
          : m
      ))
    }

    dataService.subscribeToPriceUpdates(selectedMarket.id, handlePriceUpdate)

    return () => {
      dataService.unsubscribeFromPriceUpdates(selectedMarket.id)
    }
  }, [selectedMarket?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading markets...</p>
        </div>
      </div>
    )
  }

  // Handle start trading from landing page
  const handleStartTrading = () => {
    try {
      localStorage.setItem('signalbay-has-visited', 'true')
    } catch (error) {
      console.error('Error saving visit status:', error)
    }
    setShowLanding(false)
    setViewMode('markets')
  }

  // Show landing page if not visited before
  if (showLanding) {
    return <LandingPage onStartTrading={handleStartTrading} />
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-gray-100">
      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onConnect={handleWalletConnect}
      />

      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-[#0a0d14] border-b border-white/10 px-6 py-4">
        <div className="flex justify-between items-center max-w-[1920px] mx-auto">
          <div className="flex items-center gap-8">
            <button
              onClick={() => {
                setViewMode('markets')
                setSelectedEvent(null) // Clear event filter when clicking logo
              }}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img 
                src="/assets/signalbay-logo.png" 
                alt="SignalBay" 
                className="h-16 w-auto"
              />
            </button>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setViewMode('events')}
                className={`transition text-sm ${
                  viewMode === 'events'
                    ? 'text-white font-semibold'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Events
              </button>
              <button
                onClick={() => {
                  setViewMode('markets')
                  setSelectedEvent(null) // Clear event filter when switching to markets
                }}
                className={`transition text-sm ${
                  viewMode === 'markets'
                    ? 'text-white font-semibold'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Markets
              </button>
              <button
                onClick={() => setViewMode('trade')}
                className={`transition text-sm ${
                  viewMode === 'trade'
                    ? 'text-white font-semibold'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Trade
              </button>
            </div>
          </div>
          
          {/* Wallet Connection Button - Top Right */}
          {walletAddress ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-400 font-medium">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
              <button
                onClick={() => {
                  walletService.disconnect()
                  setWalletAddress(null)
                }}
                className="ml-2 text-xs text-gray-400 hover:text-white"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition font-semibold text-sm"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </nav>

      {viewMode === 'events' ? (
        <EventsList 
          onSelectEvent={async (event) => {
            // When an event is clicked, fetch markets for that event
            try {
              let eventMarkets = []
              
              // First, check if event has markets directly
              if (event.markets && Array.isArray(event.markets) && event.markets.length > 0) {
                eventMarkets = event.markets
              } else {
                // Otherwise, search for markets using event title or slug
                const searchQuery = event.slug || event.title || event.question || event.name
                if (searchQuery) {
                  const searchResults = await dataService.searchMarkets(searchQuery, {
                    limit_per_type: 100,
                    search_tags: true,
                    sort: 'relevance',
                  })
                  
                  // Filter results to match event more closely
                  eventMarkets = searchResults.filter(market => {
                    const marketTitle = (market.title || market.question || '').toLowerCase()
                    const marketDescription = (market.description || '').toLowerCase()
                    const eventTitle = (event.title || event.question || event.name || '').toLowerCase()
                    const eventSlug = (event.slug || '').toLowerCase()
                    
                    return marketTitle.includes(eventTitle) || 
                           marketDescription.includes(eventTitle) ||
                           (eventSlug && (marketTitle.includes(eventSlug) || marketDescription.includes(eventSlug)))
                  })
                }
              }
              
              // If exactly one market, go straight to trade view
              if (eventMarkets.length === 1) {
                let market = eventMarkets[0]
                // Ensure market has an id
                if (!market.id) {
                  market.id = market.conditionId || market.slug || `event-market-${Date.now()}`
                }
                // If market doesn't have prices, try to fetch full market data
                if (!market.yesPrice || !market.noPrice) {
                  try {
                    const fullMarket = await dataService.getMarket(market.id)
                    if (fullMarket) {
                      market = fullMarket
                    }
                  } catch (error) {
                    console.warn('Could not fetch full market data, using event market:', error)
                  }
                }
                // Ensure prices have defaults
                if (!market.yesPrice) market.yesPrice = 50
                if (!market.noPrice) market.noPrice = 50
                // Add market to markets list if not already present
                setMarkets(prev => {
                  const exists = prev.find(m => m.id === market.id)
                  if (exists) return prev
                  return [market, ...prev]
                })
                setSelectedMarket(market)
                setViewMode('trade')
              } else if (eventMarkets.length > 1) {
                // Multiple markets - show markets list filtered by event
                setSelectedEvent(event)
                setViewMode('markets')
              } else {
                // No markets found - show markets list with event filter (user can search)
                setSelectedEvent(event)
                setViewMode('markets')
              }
            } catch (error) {
              console.error('Error fetching markets for event:', error)
              // On error, still show markets view with event filter
              setSelectedEvent(event)
              setViewMode('markets')
            }
          }}
        />
      ) : viewMode === 'markets' ? (
        <MarketsList 
          eventFilter={selectedEvent}
          onClearEventFilter={() => setSelectedEvent(null)}
          onSelectMarket={(market) => {
            // Add market to markets list if not already present
            setMarkets(prev => {
              const exists = prev.find(m => m.id === market.id)
              if (exists) return prev
              return [market, ...prev]
            })
            setSelectedMarket(market)
            setViewMode('trade') // Switch to trade view
          }}
        />
      ) : (
        <div className="flex max-w-[1920px] mx-auto" style={{ height: 'calc(100vh - 73px)', paddingBottom: '60px' }}>
        {/* Left Sidebar */}
        <MarketSidebar
          markets={markets}
          selectedMarket={selectedMarket}
          onSelectMarket={setSelectedMarket}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          watchlist={watchlist}
          isInWatchlist={isInWatchlist}
        />

        {/* Central Trading Area */}
        <main className="flex-1 flex flex-col border-r border-white/10 overflow-hidden">
          {selectedMarket && (
            <>
              {/* Market Header */}
              <div className="bg-[#0a0d14] border-b border-white/10 px-6 py-4">
                <div className="flex items-start gap-4">
                  <MarketHeaderImage market={selectedMarket} />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-white">{selectedMarket.title}</h2>
                      {(selectedMarket.closed === true || selectedMarket.closed === 'true' || 
                        (selectedMarket.polymarketData && selectedMarket.polymarketData.closed === true)) && (
                        <span className="px-3 py-1 text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/50 rounded-full">
                          🔒 Closed
                        </span>
                      )}
                    </div>
                    <TruncatedText 
                      text={selectedMarket.description} 
                      maxLength={200}
                      className="max-w-3xl"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-xs text-gray-400">24h Volume</span>
                      <p className="text-lg font-semibold text-white">
                        {selectedMarket.volume >= 1000000 
                          ? `$${(selectedMarket.volume / 1000000).toFixed(2)}M`
                          : `$${(selectedMarket.volume / 1000).toFixed(2)}K`}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">End Date</span>
                      <p className="text-lg font-semibold text-white">
                        {selectedMarket.endDate 
                          ? new Date(selectedMarket.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowRulesModal(true)}
                className="px-4 py-2 text-sm border border-white/20 rounded-lg hover:bg-white/5 transition"
              >
                Rules
              </button>
              <button 
                onClick={() => {
                  if (selectedMarket) {
                    console.log(`[Watchlist] Toggling market: ${selectedMarket.id}, currently in watchlist: ${isInWatchlist(selectedMarket.id)}`)
                    toggleWatchlist(selectedMarket.id)
                  }
                }}
                className={`p-2 rounded-lg transition ${
                  selectedMarket && isInWatchlist(selectedMarket.id)
                    ? 'bg-yellow-500/20 hover:bg-yellow-500/30'
                    : 'hover:bg-white/5'
                }`}
                title={selectedMarket && isInWatchlist(selectedMarket.id) ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                <Star 
                  className={`h-5 w-5 transition ${
                    selectedMarket && isInWatchlist(selectedMarket.id)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-400'
                  }`} 
                />
              </button>
                  </div>
                </div>
              </div>

              {/* Price Chart */}
              <div className="flex-1 bg-[#0a0d14] border-b border-white/10">
                <PredictionChart market={selectedMarket} />
              </div>

              {/* Trading Tabs */}
              <div className="bg-[#0a0d14] border-b border-white/10">
                <TradingTabs />
              </div>
            </>
          )}
        </main>

        {/* Right Trading Panel */}
        <aside className="w-96 bg-[#0a0d14] border-l border-white/10 overflow-y-auto">
          {selectedMarket ? (
            <OrderPanel market={selectedMarket} />
          ) : (
            <div className="p-6 text-center text-gray-400">
              Select a market to start trading
            </div>
          )}
        </aside>
      </div>
      )}


      {/* Rules Modal */}
      {showRulesModal && selectedMarket && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowRulesModal(false)}
        >
          <div 
            className="bg-[#0a0d14] border border-white/20 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Market Rules</h2>
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="text-gray-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{selectedMarket.title}</h3>
                  {selectedMarket.description && (
                    <p className="text-gray-300 mb-4">{selectedMarket.description}</p>
                  )}
                </div>

                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">Resolution Criteria</h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    {selectedMarket.polymarketData?.resolutionSource ? (
                      <p>
                        <span className="font-medium">Resolution Source:</span>{' '}
                        {selectedMarket.polymarketData.resolutionSource}
                      </p>
                    ) : (
                      <p className="text-gray-500 italic">
                        Resolution criteria will be determined based on the market outcome.
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">Market Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">End Date:</span>
                      <p className="text-white">
                        {selectedMarket.endDate 
                          ? new Date(selectedMarket.endDate).toLocaleString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Category:</span>
                      <p className="text-white capitalize">{selectedMarket.category || 'General'}</p>
                    </div>
                    {selectedMarket.polymarketData?.slug && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Market ID:</span>
                        <p className="text-white font-mono text-xs break-all">
                          {selectedMarket.polymarketData.slug}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs text-gray-500">
                    For detailed rules and resolution criteria, visit the market on Polymarket.com
                    {selectedMarket.polymarketData?.slug && (
                      <a 
                        href={`https://polymarket.com/event/${selectedMarket.polymarketData.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-400 hover:text-yellow-300 ml-1 underline"
                      >
                        View on Polymarket →
                      </a>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar - Always Visible */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0d14] border-t border-white/10 px-6 py-3">
        <div className="flex justify-between items-center max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com/yourusername"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition"
            >
              <Twitter className="h-5 w-5" />
              <span className="text-sm">Follow us on Twitter</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
