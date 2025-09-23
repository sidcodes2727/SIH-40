import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

function Chatbot({ chatOpen, setChatOpen }) {
    const [messages, setMessages] = useState([
        { id: 1, role: 'assistant', content: 'Hi! I\'m floatCHAT. Ask me about oceanographic data, ARGO floats, or maps.' }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const listRef = useRef(null);

    useEffect(() => {
        if (!listRef.current) return;
        listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [messages, chatOpen]);

    async function sendMessage() {
        const text = input.trim();
        if (!text || loading) return;
        setError(null);
        setInput("");
        const userMsg = { id: Date.now(), role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3000/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })) })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Failed to get response');
            }
            const reply = (data?.text || '').trim() || 'I\'m not sure how to answer that yet.';
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: reply }]);
        } catch (e) {
            setError(e.message || 'Something went wrong');
            setMessages(prev => [...prev, { id: Date.now() + 2, role: 'assistant', content: 'Sorry, I could not reach the AI service.' }]);
        } finally {
            setLoading(false);
        }
    }

    function onKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    return (
        <AnimatePresence>
            {chatOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-24 right-6 z-50 w-96 h-96 glass rounded-2xl shadow-2xl border border-cyan-500/40"
                >
                    <div className="p-4 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold">floatCHAT Assistant</h3>
                            <button
                                className="text-white hover:bg-white/10 p-1 rounded"
                                onClick={() => setChatOpen(false)}
                            >
                                <X />
                            </button>
                        </div>
                        <div ref={listRef} className="card rounded-xl p-3 grow overflow-y-auto text-sm mb-3 space-y-2">
                            {messages.map(m => (
                                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`${m.role === 'user' ? 'bg-cyan-600/40 border-cyan-400/30' : 'bg-white/10 border-white/10'} border rounded-xl px-3 py-2 max-w-[85%] whitespace-pre-wrap`}>{m.content}</div>
                                </div>
                            ))}
                            {error && (
                                <div className="text-red-300 text-xs">{error}</div>
                            )}
                            {loading && (
                                <div className="text-white/60 text-xs">Thinking…</div>
                            )}
                        </div>
                        <div className="mt-2 flex">
                            <input
                                type="text"
                                placeholder="Ask about oceanographic data..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={onKeyDown}
                                className="flex-1 px-3 py-2 rounded-l-xl bg-[#061523] border border-white/10 placeholder:text-white/60 focus:outline-none focus:border-cyan-400/50"
                            />
                            <button onClick={sendMessage} disabled={loading} className="rounded-r-xl btn-primary px-4 disabled:opacity-60">Send</button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default Chatbot;