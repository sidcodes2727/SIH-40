import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

function Chatbot({ chatOpen, setChatOpen }) {
    return (
        <AnimatePresence>
            {chatOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="absolute bottom-24 right-6 w-96 h-96 glass rounded-2xl shadow-2xl border border-cyan-500/40"
                >
                    <div className="p-4 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold">OceanViz Assistant</h3>
                            <button
                                className="text-white hover:bg-white/10 p-1 rounded"
                                onClick={() => setChatOpen(false)}
                            >
                                <X />
                            </button>
                        </div>
                        <div className="card rounded-xl p-3 grow overflow-y-auto text-sm mb-3">
                            <p><strong>You:</strong> Show me temperature anomalies in the South Pacific.</p>
                            <p className="mt-2"><strong>Bot:</strong> I found 27 ARGO floats reporting anomalies. Would you like to see them on the map?</p>
                        </div>
                        <div className="mt-2 flex">
                            <input
                                type="text"
                                placeholder="Ask about oceanographic data..."
                                className="flex-1 px-3 py-2 rounded-l-xl bg-[#061523] border border-white/10 placeholder:text-white/60 focus:outline-none focus:border-cyan-400/50"
                            />
                            <button className="rounded-r-xl btn-primary px-4">Send</button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default Chatbot;