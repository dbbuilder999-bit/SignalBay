import React from 'react'
import { ArrowRight, TrendingUp, Shield, Zap } from 'lucide-react'

export default function LandingPage({ onStartTrading }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0d14] via-[#0f1419] to-[#0a0d14] flex items-center justify-center px-6">
      <div className="max-w-4xl w-full text-center">
        {/* Logo */}
        <div className="mb-12 flex justify-center">
          <img 
            src="/assets/signalbay-logo.png" 
            alt="SignalBay" 
            className="h-32 w-auto"
          />
        </div>

        {/* Main Heading */}
        <h1 className="text-6xl md:text-7xl font-bold text-white mb-6">
          SignalBay
        </h1>
        <p className="text-2xl md:text-3xl text-gray-300 mb-4">
          Professional Prediction Markets Trading
        </p>
        <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
          Trade on real-world events with live markets, real-time prices, and professional-grade tools.
          Powered by Polymarket.
        </p>

        {/* CTA Button */}
        <button
          onClick={onStartTrading}
          className="group px-8 py-4 bg-yellow-500 text-black rounded-lg font-semibold text-lg hover:bg-yellow-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-yellow-500/50 flex items-center gap-3 mx-auto"
        >
          Start Trading
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition">
            <TrendingUp className="h-10 w-10 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Live Markets</h3>
            <p className="text-gray-400 text-sm">
              Real-time prediction markets from Polymarket with live prices and order books
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition">
            <Shield className="h-10 w-10 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Secure Trading</h3>
            <p className="text-gray-400 text-sm">
              Professional-grade trading interface with secure order execution
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition">
            <Zap className="h-10 w-10 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Fast Execution</h3>
            <p className="text-gray-400 text-sm">
              Instant order placement and real-time price updates
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-16 text-sm text-gray-500">
          Data provided by Polymarket • No authentication required for viewing markets
        </p>
      </div>
    </div>
  )
}

