'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Send, Bot, User, Mic, MicOff, Sparkles } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string; ts: Date }

const QUICK_QS = [
  'How much did I spend this month?',
  'What is my safe to spend?',
  "Am I on track?",
  'Show my savings total',
  'What are my top spending categories?',
  'How are my goals?',
]

function formatMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\n/g, '<br/>')
    .replace(/• /g, '&bull; ')
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! 👋 I'm your PaisaPilot AI assistant.\n\nAsk me anything about your finances — spending, budget, savings, goals, and more!", ts: new Date() }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async (msg: string) => {
    if (!msg.trim() || loading) return
    const userMsg: Message = { role: 'user', content: msg, ts: new Date() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const r = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      const d = await r.json()
      setMessages(m => [...m, { role: 'assistant', content: d.message, ts: new Date() }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', ts: new Date() }])
    } finally {
      setLoading(false)
    }
  }, [loading])

  const startVoice = useCallback(() => {
    const SRClass = (typeof window !== 'undefined')
      ? (window.SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition)
      : undefined
    if (!SRClass) { alert('Voice input not supported in this browser'); return }
    const rec = new SRClass()
    rec.lang = 'en-IN'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e) => { setInput(e.results[0][0].transcript) }
    rec.onend = () => setIsListening(false)
    recognitionRef.current = { stop: () => rec.stop() }
    rec.start()
    setIsListening(true)
  }, [])

  const stopVoice = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  return (
    <>
      <TopBar title="AI Assistant" subtitle="Ask about your finances" />
      <div className="flex flex-col" style={{ height: 'calc(100vh - 60px)' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-2xl mx-auto w-full">
          {messages.length <= 1 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">Quick questions</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QS.map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[12px] hover:bg-indigo-500/15 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-slide-up`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-slate-700 border border-slate-600'}`}>
                {msg.role === 'assistant' ? <Bot size={15} className="text-indigo-400" /> : <User size={15} className="text-slate-400" />}
              </div>
              <div className={`max-w-[85%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600/20 border border-indigo-500/20 text-indigo-100 rounded-tr-md'
                      : 'bg-[#13131f] border border-white/[0.07] text-slate-200 rounded-tl-md'
                  }`}
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                />
                <p className="text-[10px] text-slate-600 px-1">{msg.ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 animate-slide-up">
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <Bot size={15} className="text-indigo-400" />
              </div>
              <div className="px-4 py-3 bg-[#13131f] border border-white/[0.07] rounded-2xl rounded-tl-md flex items-center gap-1.5">
                <Sparkles size={12} className="text-indigo-400 animate-spin-smooth" />
                <span className="text-[12px] text-slate-500">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/[0.07] bg-[#0d0d14] p-4 max-w-2xl mx-auto w-full">
          <div className="flex gap-2.5 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
              placeholder="Ask about your finances..."
              rows={1}
              className="flex-1 bg-[#13131f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button onClick={isListening ? stopVoice : startVoice}
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isListening ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/[0.05] text-slate-400 border border-white/[0.08] hover:text-slate-200'}`}>
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button onClick={() => send(input)} disabled={!input.trim() || loading}
              className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95">
              <Send size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
