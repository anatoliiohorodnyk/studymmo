'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { useCharacterStore } from '@/stores/characterStore';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  createdAt: string;
}

interface GlobalChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalChat({ isOpen, onClose }: GlobalChatProps) {
  const { character } = useCharacterStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const data = await api.getChatMessages();
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      // Poll for new messages every 5 seconds
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, loadMessages]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Focus input when opened
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const sent = await api.sendChatMessage(newMessage.trim());
      setMessages((prev) => [...prev.slice(-49), sent]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-20 sm:items-center sm:pb-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Chat Panel */}
      <div className="relative w-full max-w-md h-[70vh] max-h-[500px] glass rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">Global Chat</h3>
              <p className="text-xs text-[var(--text-muted)]">{messages.length} messages</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
              <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>No messages yet</p>
              <p className="text-xs">Be the first to say hello!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = character?.username === msg.username;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${isOwn ? 'text-[var(--accent)]' : 'text-cyan-400'}`}>
                      {msg.username}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl ${
                      isOwn
                        ? 'bg-[var(--accent)]/20 text-[var(--text-primary)] rounded-br-sm'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-bl-sm border border-[var(--border)]'
                    }`}
                  >
                    <p className="text-sm break-words">{msg.message}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-[var(--border)] bg-[var(--bg-card)]">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              maxLength={500}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-all"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
