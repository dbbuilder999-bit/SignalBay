import React, { useState } from 'react'
import { X } from 'lucide-react'
import { walletService } from '../services/WalletService'

export default function LoginModal({ isOpen, onClose, onConnect }) {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handlePhantomConnect = async () => {
    try {
      setConnecting(true)
      setError(null)
      const result = await walletService.connectPhantom()
      if (result && onConnect) {
        onConnect(result)
        onClose()
      }
    } catch (err) {
      console.error('Phantom connection error:', err)
      setError(err.message || 'Failed to connect Phantom wallet')
    } finally {
      setConnecting(false)
    }
  }

  const handleMetaMaskConnect = async () => {
    try {
      setConnecting(true)
      setError(null)
      const result = await walletService.connectMetaMask()
      if (result && onConnect) {
        onConnect(result)
        onClose()
      }
    } catch (err) {
      console.error('MetaMask connection error:', err)
      setError(err.message || 'Failed to connect MetaMask wallet')
    } finally {
      setConnecting(false)
    }
  }

  const handleEmailLogin = () => {
    // Placeholder for email/social login
    setError('Email login coming soon')
  }

  const isPhantomInstalled = walletService.isPhantomInstalled()
  const isMetaMaskInstalled = walletService.isMetaMaskInstalled()

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-[#0a0d14] border border-white/10 rounded-lg max-w-md w-full mx-4 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white pr-8">Log in or sign up</h2>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Wallet Options */}
        <div className="p-6 space-y-3">
          {/* Phantom */}
          <button
            onClick={handlePhantomConnect}
            disabled={connecting || !isPhantomInstalled}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition ${
              isPhantomInstalled
                ? 'border-white/20 hover:border-purple-400/50 hover:bg-purple-500/10 bg-white/5'
                : 'border-white/10 bg-white/5 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="relative">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-xl">👻</span>
              </div>
              {isPhantomInstalled && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            <span className="font-medium text-white">
              {isPhantomInstalled ? 'Phantom' : 'Phantom (Not Installed)'}
            </span>
            {connecting && <span className="ml-auto text-sm text-gray-400">Connecting...</span>}
          </button>

          {/* MetaMask */}
          <button
            onClick={handleMetaMaskConnect}
            disabled={connecting || !isMetaMaskInstalled}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition ${
              isMetaMaskInstalled
                ? 'border-white/20 hover:border-orange-400/50 hover:bg-orange-500/10 bg-white/5'
                : 'border-white/10 bg-white/5 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#F6851B"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#F6851B"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#F6851B"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#F6851B"/>
              </svg>
            </div>
            <span className="font-medium text-white">
              {isMetaMaskInstalled ? 'MetaMask' : 'MetaMask (Not Installed)'}
            </span>
            {connecting && <span className="ml-auto text-sm text-gray-400">Connecting...</span>}
          </button>

          {/* Email/Social Login */}
          <button
            onClick={handleEmailLogin}
            disabled={connecting}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-white/20 hover:border-white/30 hover:bg-white/5 bg-white/5 transition"
          >
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <span className="font-medium text-white">Log in with email or socials</span>
          </button>
        </div>
      </div>
    </div>
  )
}

