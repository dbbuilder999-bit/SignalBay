import React, { useState } from 'react'

export default function TradingTabs() {
  const [activeTab, setActiveTab] = useState('Open Orders')

  const tabs = ['Open Orders', 'My Positions', 'Order Book']

  return (
    <div className="px-6">
      <div className="flex border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium transition ${
              activeTab === tab
                ? 'text-white border-b-2 border-yellow-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="py-8 text-center">
        <p className="text-gray-400 text-sm">Connect wallet to view {activeTab.toLowerCase()}</p>
      </div>
    </div>
  )
}

