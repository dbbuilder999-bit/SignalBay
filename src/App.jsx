import React from 'react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Github, ArrowRight, Cpu, Globe, Zap } from 'lucide-react'

export default function ForgeSite() {
  const snippets = [
    `// Send a payment-enabled API request\nconst res = await x402.fetch('https://api.datafeed.ai', {\n  method: 'POST',\n  headers: {\n    'X-402-Payment': '0.5 USDC',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({ query: 'SELECT * FROM streams WHERE usage > 100' })\n})\n\nif (res.ok) {\n  const data = await res.json()\n  console.log('Stream data:', data)\n} else {\n  console.error('Payment or request failed')\n}`,

    `// Agent-to-Agent micropayment and service call\nimport { AgentWallet } from 'x402-sdk'\n\nconst wallet = new AgentWallet({ privateKey: process.env.AGENT_KEY })\n\nasync function renderTask() {\n  const paymentTx = await wallet.pay({\n    to: 'forge.network/render',\n    amount: '3',\n    asset: 'USDC',\n    memo: 'Render chart for analytics v3'\n  })\n\n  console.log('Transaction:', paymentTx.hash)\n  const status = await paymentTx.wait()\n  console.log('Payment confirmed:', status)\n  if (status.success) {\n    await notifyAgent('forge-notify/render', { id: paymentTx.hash })\n  }\n}\n\nrenderTask().catch(console.error)`,

    `// Verify payment and auto-execute smart workflow\nimport { verifyPayment } from 'x402-utils'\n\nconst receipt = await verifyPayment({ tx: '0xdeadbeef...' })\n\nif (receipt.valid) {\n  console.log('✅ Verified payment for', receipt.service)\n  await executeJob(receipt.jobId)\n} else {\n  console.log('❌ Payment invalid or expired')\n}\n\nasync function executeJob(id) {\n  const job = await x402.getJob(id)\n  await job.run()\n  console.log('Job completed successfully')\n  await x402.logAudit({ job: id, status: 'done' })\n}`
  ]

  const useTypingEffect = (text, speed = 15) => {
    const [displayed, setDisplayed] = useState('')
    useEffect(() => {
      let index = 0
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, index))
        index++
        if (index > text.length) clearInterval(interval)
      }, speed)
      return () => clearInterval(interval)
    }, [text, speed])
    return displayed
  }

  // Scroll to top on initial load
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="relative min-h-screen bg-[#030509] text-gray-100 overflow-hidden">
      {/* Glowing Animated Background */}
      <div className="absolute inset-0 overflow-hidden z-0">
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-6 h-6 rounded-full blur-2xl"
            style={{
              background: i % 2 === 0 ? 'rgba(0,255,200,0.8)' : 'rgba(0,150,255,0.7)',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              boxShadow: '0 0 80px rgba(0,255,255,0.6)'
            }}
            animate={{
              y: [0, 200, -200, 0],
              x: [0, -200, 200, 0],
              opacity: [0.3, 1, 0.5, 0.8],
              scale: [1, 1.3, 1]
            }}
            transition={{ duration: 15 + Math.random() * 15, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        <motion.div
          className="absolute inset-0 opacity-40"
          animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(0,255,255,0.3) 1px, transparent 1px), linear-gradient(0deg, rgba(0,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
            filter: 'drop-shadow(0 0 10px rgba(0,255,255,0.9))'
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur bg-[#030509]/90 border-b border-white/10 px-8 py-4 flex justify-between items-center">
        <h1 className="font-semibold text-xl tracking-tight text-white drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">x402 Forge</h1>
        <div className="flex items-center gap-6 text-sm opacity-90">
          {['home', 'vision', 'tech', 'developers', 'docs'].map(link => (
            <a key={link} href={`#${link}`} className="hover:text-teal-400 transition">
              {link.charAt(0).toUpperCase() + link.slice(1)}
            </a>
          ))}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="text-center py-32 px-6 relative z-10">
        <motion.h1
          className="text-6xl font-extrabold mb-4 text-white drop-shadow-[0_0_25px_rgba(0,255,255,0.7)]"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          Build the Future of Autonomous Agents
        </motion.h1>
        <p className="text-lg text-gray-300 mb-10 max-w-3xl mx-auto drop-shadow-[0_0_10px_rgba(0,255,255,0.4)]">
          x402 Forge powers programmable payments, AI coordination, and the next evolution of digital transactions.
        </p>
        <div className="flex justify-center gap-4">
          <a href="#developers" className="px-6 py-3 bg-teal-500 text-black rounded-2xl font-semibold hover:bg-teal-400 transition flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,255,0.6)]">
            Get Started <ArrowRight className="h-4 w-4" />
          </a>
          <a href="https://github.com/dbbuilder999-bit/x402-forge" className="px-6 py-3 border border-white/30 rounded-2xl font-medium flex items-center gap-2 hover:bg-white/10 transition shadow-[0_0_20px_rgba(0,255,255,0.4)]">
            <Github className="h-4 w-4" /> GitHub
          </a>
        </div>
      </section>

      {/* Vision Section */}
      <section id="vision" className="text-center py-24 px-6 max-w-5xl mx-auto relative z-10">
        <h2 className="text-5xl font-bold mb-6 text-white drop-shadow-[0_0_20px_rgba(0,255,255,0.6)]">Vision: The Invisible Payment Layer</h2>
        <p className="text-gray-300 text-lg mb-6">Every web request can carry value. With x402, payments become a native, programmable primitive of the internet.</p>
        <p className="text-gray-400 max-w-3xl mx-auto mb-12">Forge turns API calls into on-chain events, enabling agents to coordinate, meter usage, and share revenue in real time. No middlemen, no custom billing — just verifiable, automated economics at machine speed.</p>
        <div className="grid md:grid-cols-3 gap-8 mt-12">
          {[
            { icon: <Cpu className='h-10 w-10 text-teal-400 mx-auto mb-4'/>, title: 'Why x402', desc: 'A trustless payment protocol embedded into every API layer, making data and compute monetizable.' },
            { icon: <Globe className='h-10 w-10 text-teal-400 mx-auto mb-4'/>, title: 'Use Cases', desc: 'Autonomous services that pay each other for inference, storage, or access across global networks.' },
            { icon: <Zap className='h-10 w-10 text-teal-400 mx-auto mb-4'/>, title: 'For Teams', desc: 'Integrate x402 into your stack to create usage-based billing and microservices that earn in real time.' }
          ].map((item, i) => (
            <motion.div
              key={i}
              className="bg-[#0f1220]/90 p-6 rounded-2xl border border-white/10 hover:border-teal-400/50 transition backdrop-blur shadow-[0_0_20px_rgba(0,255,255,0.15)]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.2 }}
            >
              {item.icon}
              <h3 className="text-teal-300 font-semibold mb-2 text-lg">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tech Cards Section */}
      <section id="tech" className="max-w-6xl mx-auto mb-24 px-6 relative z-10">
        <h2 className="text-3xl font-semibold mb-8 text-center text-white">Technology Modules</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {["Bridge Layer", "Agent Mesh", "Proof Engine"].map((title, i) => (
            <motion.div
              key={i}
              className="bg-[#0f1220]/90 backdrop-blur p-6 rounded-2xl border border-white/10 hover:border-teal-400/50 shadow-[0_0_20px_rgba(0,255,255,0.2)] transition"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
            >
              <h3 className="text-teal-300 font-semibold text-lg mb-2">{title}</h3>
              <p className="text-sm text-gray-300 mb-4">{title === 'Bridge Layer' ? 'Verifies paid HTTP requests and automates on-chain settlement with sub-3s latency.' : title === 'Agent Mesh' ? 'Enables P2P task routing, payment splitting, and autonomous coordination.' : 'Emits verifiable receipts and cryptographic proofs for every transaction.'}</p>
              <ul className="text-sm text-gray-400 space-y-2 list-disc list-inside">
                <li>Secure multi-sig verification</li>
                <li>Adaptive transaction gas optimization</li>
                <li>AI-driven audit trail summaries</li>
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Reactive Code Section */}
      <section id="developers" className="max-w-5xl mx-auto mb-24 px-6 relative z-10">
        <h2 className="text-3xl font-semibold mb-8 text-center text-white">Reactive Code Examples</h2>
        <div className="space-y-10">
          {snippets.map((snippet, i) => {
            const animatedText = useTypingEffect(snippet, 12)
            return (
              <motion.div
                key={i}
                className="rounded-2xl bg-[#0f172a] text-green-300 p-6 font-mono text-sm overflow-x-auto border border-teal-400/40 shadow-[0_0_25px_rgba(0,255,255,0.7)] hover:shadow-[0_0_40px_rgba(0,255,255,0.9)] transition"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: false }}
                transition={{ duration: 0.8, delay: i * 0.3 }}
              >
                <pre>{animatedText}</pre>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Docs Section */}
      <section id="docs" className="max-w-4xl mx-auto mb-24 px-6 text-center relative z-10">
        <h2 className="text-3xl font-semibold mb-4 text-teal-400 drop-shadow-[0_0_20px_rgba(0,255,255,0.6)]">Documentation</h2>
        <p className="text-gray-400 mb-6">
          Explore SDKs, architecture, and guides for building intelligent autonomous agents with x402.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <a href="https://github.com/coinbase/x402" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-teal-500 text-black rounded-2xl font-medium hover:bg-teal-400 transition inline-flex items-center gap-2 shadow-[0_0_25px_rgba(0,255,255,0.7)]">
            View on GitHub <ArrowRight className="h-4 w-4" />
          </a>
          <a href="https://www.x402.org/" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-blue-500 text-black rounded-2xl font-medium hover:bg-blue-400 transition inline-flex items-center gap-2 shadow-[0_0_25px_rgba(0,150,255,0.8)]">
            Visit x402.org <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-sm opacity-80 border-t border-white/10 relative z-10 text-gray-300">
        © {new Date().getFullYear()} x402 Forge — MIT Licensed
      </footer>
    </div>
  )
}

