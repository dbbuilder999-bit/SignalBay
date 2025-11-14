import React, { useState } from 'react'
import { Search, Sun, Moon } from 'lucide-react'
import TruncatedText from './TruncatedText'

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

export default function MarketSidebar({ markets, selectedMarket, onSelectMarket, activeTab, onTabChange, darkMode, onToggleDarkMode }) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredMarkets = markets.filter(market =>
    market.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    market.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
      <div className="p-4 border-t border-white/10 flex items-center justify-between">
        <button
          onClick={onToggleDarkMode}
          className="p-2 hover:bg-white/5 rounded-lg transition"
        >
          {darkMode ? <Sun className="h-5 w-5 text-gray-400" /> : <Moon className="h-5 w-5 text-gray-400" />}
        </button>
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

