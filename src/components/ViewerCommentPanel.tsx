import React, { useState } from 'react';
import { Send, MessageCircle, User, MessageSquareCode } from 'lucide-react';
import { MatchComment, MatchState } from '../types';
import { getApiUrl } from '../utils/api';

interface ViewerCommentPanelProps {
  comments: MatchComment[];
  onCommentAdded: (updatedComments: MatchComment[]) => void;
}

export default function ViewerCommentPanel({ comments, onCommentAdded }: ViewerCommentPanelProps) {
  const [userName, setUserName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      const resp = await fetch(getApiUrl('/api/match/comment'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: userName.trim() || 'Spectator',
          text: commentText.trim()
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        onCommentAdded(data.comments);
        setCommentText('');
      }
    } catch (err) {
      console.error("Error creating comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0c0c0c] border border-white/10 rounded-xl flex flex-col h-[520px] shadow-lg overflow-hidden font-sans" id="comment-feed-panel">
      {/* Title Header */}
      <div className="bg-[#0a0a0a] p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-sans">
          <MessageCircle className="w-5 h-5 text-green-500" />
          <div>
            <h3 className="font-extrabold text-sm tracking-tight uppercase">Viewer Arena Forum</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Live Crowd Analysis</p>
          </div>
        </div>
        <span className="bg-green-600/15 text-green-400 border border-green-500/20 font-mono text-[9px] font-bold px-2 py-0.5 rounded">
          {comments?.length || 0} MESSAGES
        </span>
      </div>

      {/* Input Form at top for convenience */}
      <form onSubmit={handleSubmit} className="p-3.5 bg-black border-b border-white/10 space-y-2.5">
        <div className="flex gap-2">
          {/* Spectator Name Input */}
          <div className="relative w-1/3">
            <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-white/40" />
            <input
              type="text"
              placeholder="Name (Lala)"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-[#0d0d0d] text-xs text-white placeholder-white/20 pl-8 pr-2.5 py-2 rounded border border-white/10 focus:outline-none focus:border-green-500 font-medium font-sans"
              maxLength={20}
            />
          </div>
          {/* Comment text area */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Boundary check or commentary! Comment here..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full bg-[#0d0d0d] text-xs text-white placeholder-white/20 px-3 py-2 rounded border border-white/10 focus:outline-none focus:border-green-500 font-medium font-sans"
              maxLength={150}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !commentText.trim()}
            className="bg-green-600 hover:bg-green-500 text-white px-3.5 py-2 rounded text-xs font-black cursor-pointer transition flex items-center gap-1.5 disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5 text-white" />
            POST
          </button>
        </div>
      </form>

      {/* Comment history stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0d0d0d] scrollbar-none">
        {comments && comments.length > 0 ? (
          comments.map((c) => {
            const isSystem = c.user === 'System';
            const isOrganizer = c.user === 'SK Sherrani';
            return (
              <div 
                key={c.id} 
                className={`p-3 rounded border text-xs leading-relaxed transition ${
                  isOrganizer
                    ? 'bg-green-600/10 border-green-500/20 text-white'
                    : isSystem
                    ? 'bg-black border-dashed border-white/15 text-yellow-500 font-mono'
                    : 'bg-black border-white/5 text-white/80'
                }`}
              >
                <div className="flex justify-between items-center mb-1 font-mono">
                  <span className={`font-black uppercase tracking-tight text-[10px] ${
                    isOrganizer ? 'text-green-400' : isSystem ? 'text-white/40' : 'text-white/70'
                  }`}>
                    {isOrganizer && "📢 "} {c.user}
                  </span>
                  <span className="text-[9px] text-white/30 font-light">{c.timestamp}</span>
                </div>
                <p className="whitespace-pre-line text-xs font-sans tracking-tight">{c.text}</p>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/30">
            <MessageSquareCode className="w-8 h-8 text-white/10 mb-2 animate-pulse" />
            <p className="text-xs font-semibold">Arena comments is standby. Post an update lala!</p>
          </div>
        )}
      </div>
    </div>
  );
}
