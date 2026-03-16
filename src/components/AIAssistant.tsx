'use client';

import { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Loader2,
  Send,
  Wand2,
  LayoutGrid,
  FileText,
} from 'lucide-react';

interface AIAssistantProps {
  projectId: string;
}

const quickActions = [
  { id: 'style', label: 'Suggest Styles', icon: Wand2, prompt: 'Suggest design styles for this building' },
  { id: 'layout', label: 'Optimize Layout', icon: LayoutGrid, prompt: 'Suggest layout optimizations' },
  { id: 'listing', label: 'Generate Listing', icon: FileText, prompt: 'Generate a marketing listing description' },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant({ projectId }: AIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, message: text }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network error. Please check your connection.' }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-2xl shadow-primary-500/30 flex items-center justify-center hover:scale-105 transition-transform"
      >
        <Sparkles className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-96 max-h-[70vh] flex flex-col rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-400" />
          <span className="font-semibold text-sm">AI Design Assistant</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-white text-sm"
        >
          Minimize
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <Sparkles className="w-8 h-8 text-primary-400 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-4">
              How can I help with your building design?
            </p>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => sendMessage(action.prompt)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-sm text-gray-300 hover:border-primary-500/30 hover:bg-gray-800 transition-colors text-left"
                >
                  <action.icon className="w-4 h-4 text-primary-400 shrink-0" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-800 text-gray-200'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-xl bg-gray-800 text-gray-400 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 spinner" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-3">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about design, layout, materials..."
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-500 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
