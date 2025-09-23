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

    // Optional geospatial context for MCP-style grounding
    const [lat, setLat] = useState("");
    const [lon, setLon] = useState("");
    const [rangeDeg, setRangeDeg] = useState("");
    const hasContext = Number.isFinite(parseFloat(lat)) && Number.isFinite(parseFloat(lon)) && Number.isFinite(parseFloat(rangeDeg));

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
            const endpoint = hasContext ? 'http://localhost:3000/ai/chat_context' : 'http://localhost:3000/ai/chat';
            const payload = hasContext
                ? { messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })), lat: parseFloat(lat), lon: parseFloat(lon), rangeDeg: parseFloat(rangeDeg) }
                : { messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })) };
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
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
                        {/* Optional Context Controls */}
                        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Lat"
                                value={lat}
                                onChange={(e) => setLat(e.target.value)}
                                className="px-2 py-1 rounded bg-[#061523] border border-white/10 focus:outline-none focus:border-cyan-400/50"
                            />
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Lon"
                                value={lon}
                                onChange={(e) => setLon(e.target.value)}
                                className="px-2 py-1 rounded bg-[#061523] border border-white/10 focus:outline-none focus:border-cyan-400/50"
                            />
                            <input
                                type="number"
                                step="0.1"
                                placeholder="Range°"
                                value={rangeDeg}
                                onChange={(e) => setRangeDeg(e.target.value)}
                                className="px-2 py-1 rounded bg-[#061523] border border-white/10 focus:outline-none focus:border-cyan-400/50"
                            />
                            {hasContext && (
                                <div className="col-span-3 text-white/60">Using context near lat {parseFloat(lat).toFixed(2)}, lon {parseFloat(lon).toFixed(2)} within ±{parseFloat(rangeDeg)}°</div>
                            )}
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