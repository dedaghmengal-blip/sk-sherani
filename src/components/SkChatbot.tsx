import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, RefreshCw, X, MessageSquare } from 'lucide-react';
import { ChatMessage, MatchState } from '../types';
import { getApiUrl } from '../utils/api';
import { triggerHaptic } from '../utils/vibrate';

interface SkChatbotProps {
  matchState: MatchState;
}

const QUICK_PROMPTS = [
  "What is the current match score?",
  "Who is currently batting lala?",
  "Who is the bowler, and what is their status?",
  "Give me an energetic regional style commentary line!",
  "Who is winning today's match?"
];

export default function SkChatbot({ matchState }: SkChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Attempt local storage cache for persistence if preferred
    return [
      {
        id: 'welcome',
        role: 'model',
        text: "Assalamu Alaykum lala! Jawaan, welcome to the pitch! I am SK, your host and cricket consultant. Ask me anything about this match, player squads, or scores, and I'll give you regional commentary advice! Kasa ho, tabiyat teek ha?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const msgEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isOpen]);

  // Alert/bubble notification if a message arrives while closed (e.g. if we trigger an automated alert)
  useEffect(() => {
    if (!isOpen && messages.length > 1) {
      setUnreadCount(prev => prev + 1);
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    triggerHaptic(20);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/match/chat-sk'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userMsg.text,
          history: messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          }))
        })
      });

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        text: data.reply || "Aala Jawaan! I didn't catch that exact cricket ball, can you try again lala?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
      triggerHaptic(30);
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: "Lala, the server is out of range! The network connection took a hard bouncer, but don't worry, currently we are tracking everything perfectly.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    triggerHaptic(40);
    setMessages([
      {
        id: 'welcome-reset',
        role: 'model',
        text: "Innings restarted lala! Ask me anything about the live match scores or player stats.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleToggle = () => {
    triggerHaptic(25);
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  return (
    <div className="fixed z-50 font-sans" style={{ contentVisibility: 'auto' }}>
      
      {/* FLOATING ACTION BUBBLE TRIGGER BUTTON */}
      <div className="fixed bottom-24 right-4 md:bottom-16 md:right-6">
        <button
          type="button"
          onClick={handleToggle}
          className={`relative p-3.5 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-90 hover:scale-105 shadow-[0_8px_32px_rgba(34,197,94,0.3)] border cursor-pointer ${
            isOpen 
              ? 'bg-red-650 bg-red-650 border-red-500/30 text-white hover:bg-red-500' 
              : 'bg-green-600 border-green-500 text-slate-950 font-black hover:bg-green-500'
          }`}
          title="Chat with SK AI Commentary Assistant"
          id="sk-ai-chatbot-bubble"
        >
          {isOpen ? (
            <X className="w-5.5 h-5.5 text-white animate-spin-once" />
          ) : (
            <div className="flex items-center gap-1.5 px-0.5">
              <Bot className="w-5.5 h-5.5 animate-pulse" />
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-900 fill-amber-900/10" />
            </div>
          )}

          {/* Unread message badge */}
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full text-[9px] font-black font-mono animate-bounce border border-black shadow">
              {unreadCount}
            </span>
          )}

          {/* Glowing pulse rings when closed to hint interactive helper */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full border-2 border-green-500 animate-ping opacity-25"></span>
          )}
        </button>
      </div>

      {/* CHAT VIEW CARD BOX (Collapsible & Floating above button / Bottom Sheet on Mobile) */}
      {isOpen && (
        <div 
          className="fixed inset-x-4 bottom-38 md:bottom-32 md:right-6 md:left-auto md:w-[380px] h-[460px] md:h-[500px] bg-zinc-950/95 border border-white/10 rounded-2xl flex flex-col shadow-[0_12px_40px_rgba(0,0,0,0.85)] overflow-hidden animate-in slide-in-from-bottom duration-200 select-none z-50 backdrop-blur"
          id="sk-ai-floating-panel"
        >
          {/* Bot Header with immersive theme */}
          <div className="bg-[#0b0b0b] p-3 flex items-center justify-between border-b border-white/10 text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-green-650 bg-green-650 text-white p-1.5 rounded font-bold">
                <Bot className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-black text-[11px] tracking-wider flex items-center gap-1 px-0.5 uppercase font-mono">
                  SK <span className="text-green-500">AI AGENT</span> <Sparkles className="w-3 h-3 text-green-500 fill-green-500/20 animate-pulse" />
                </h3>
                <p className="text-[8px] text-white/30 uppercase tracking-widest font-mono">Real-time stadium commentary</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* Reset History */}
              <button 
                onClick={clearHistory}
                className="p-1 px-1.5 text-[8.5px] rounded hover:bg-white/5 border border-white/5 font-extrabold text-white/50 transition flex items-center gap-0.5 uppercase font-mono cursor-pointer"
                title="Restart Chat Sessions"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Reset
              </button>
              
              {/* Close Button */}
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 text-white/40 hover:text-white rounded hover:bg-white/5"
                title="Minimize AI Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages viewport */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-[#0c0c0c] flex flex-col scrollbar-thin scrollbar-thumb-white/5">
            {messages.map((m) => (
              <div 
                key={m.id} 
                className={`max-w-[85%] flex flex-col ${m.role === 'user' ? 'self-end items-end animate-in slide-in-from-right-2 duration-100' : 'self-start items-start animate-in slide-in-from-left-2 duration-100'}`}
              >
                {/* Sender Label */}
                <span className="text-[7.5px] text-white/30 mb-0.5 font-mono uppercase px-1">
                  {m.role === 'user' ? 'Viewer' : 'SK Agent 🏟️'} • {m.timestamp}
                </span>
                
                {/* Balloon box */}
                <div 
                  className={`rounded-xl p-2.5 text-[11px] leading-relaxed shadow-md text-left ${
                    m.role === 'user' 
                      ? 'bg-green-600 text-white font-bold rounded-tr-none' 
                      : 'bg-zinc-900 border border-white/5 text-white/95 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line leading-normal">{m.text}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="self-start flex flex-col items-start max-w-[80%] animate-pulse">
                <span className="text-[7.5px] text-white/30 mb-0.5 font-mono uppercase">SK is typing...</span>
                <div className="rounded-xl rounded-tl-none p-2.5 text-xs bg-zinc-900 border border-white/5 text-white/50 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={msgEndRef} />
          </div>

          {/* Recommended Prompt Pills */}
          <div className="bg-[#090909] border-t border-white/5 p-1.5 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none shrink-0 font-mono text-[9px]">
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => handleSendMessage(qp)}
                className="text-[8.5px] font-bold font-mono tracking-tight bg-black hover:bg-green-605 hover:text-green-400 text-white/60 px-2.5 py-1.5 rounded-lg border border-white/5 cursor-pointer transition active:scale-95 disabled:opacity-40 uppercase shrink-0"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input panel */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="p-2.5 bg-[#0b0b0b] border-t border-white/10 flex gap-1.5 shrink-0"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask SK about live scores..."
              disabled={isLoading}
              className="flex-1 bg-black text-[11px] text-white placeholder-white/20 px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-green-500 font-medium"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="bg-green-600 text-white p-2 px-2.5 rounded-xl hover:bg-green-500 transition cursor-pointer disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
