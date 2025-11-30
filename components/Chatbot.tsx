import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';
import { sendMessageToChat } from '../services/geminiService';
import { CloseIcon, SendIcon } from './icons';

interface ChatbotProps {
  onClose: () => void;
}

const ChatMessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div 
                className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${
                    isUser 
                    ? 'bg-cyan-500 text-white rounded-br-none' 
                    : 'bg-gray-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-bl-none'
                }`}
            >
                {message.text}
            </div>
        </div>
    );
};


export const Chatbot: React.FC<ChatbotProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! How can I help you with your fitness journey today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === '' || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendMessageToChat(userMessage.text);
      const modelMessage: ChatMessage = { role: 'model', text: responseText };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMessage: ChatMessage = { role: 'model', text: 'Sorry, I encountered an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[calc(100%-3rem)] sm:w-96 h-[70vh] max-h-[700px] flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-2xl ring-1 ring-gray-200 dark:ring-white/10 animate-fade-in-up">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
            <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">AI Fitness Coach</h3>
                <p className="text-xs text-green-500">● Online</p>
            </div>
            <button 
                onClick={onClose} 
                className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"
                aria-label="Close chat"
            >
                <CloseIcon className="w-5 h-5" />
            </button>
        </header>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg, index) => (
                <ChatMessageBubble key={index} message={msg} />
            ))}
            {isLoading && (
                 <div className="flex justify-start">
                    <div className="max-w-xs px-4 py-2 rounded-2xl bg-gray-200 dark:bg-slate-700 rounded-bl-none">
                        <div className="flex items-center space-x-2">
                           <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75"></span>
                           <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></span>
                           <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-300"></span>
                        </div>
                    </div>
                 </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center bg-gray-100 dark:bg-slate-700 rounded-full px-2">
                <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything..."
                    className="flex-1 w-full p-2 bg-transparent border-none focus:ring-0 text-slate-800 dark:text-white placeholder-slate-400"
                    disabled={isLoading}
                />
                <button 
                    type="submit" 
                    className="p-2 rounded-full text-white bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    disabled={isLoading || input.trim() === ''}
                    aria-label="Send message"
                >
                    <SendIcon className="w-5 h-5" />
                </button>
            </div>
        </form>
    </div>
  );
};
