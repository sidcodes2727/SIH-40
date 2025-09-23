import React from "react";
import { LayoutDashboard, Home, Thermometer, Droplets, Gauge } from "lucide-react";

function Navbar({ activePage, setActivePage }) {
    const navItems = [
        { name: "Dashboard", icon: <LayoutDashboard size={18} /> },
        { name: "Home", icon: <Home size={18} /> },
        { name: "Temperature", icon: <Thermometer size={18} /> },
        { name: "Salinity", icon: <Droplets size={18} /> },
        { name: "Pressure", icon: <Gauge size={18} /> },
    ];

    return (
        <div className="w-64 glass p-5 flex flex-col gap-5 rounded-r-2xl">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 shadow-md" />
                <h1 className="text-2xl font-bold text-cyan-300 tracking-wide">OceanViz</h1>
            </div>
            <div className="h-px bg-white/10" />
            <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => setActivePage(item.name)}
                        className={`group flex items-center gap-3 text-left px-3 py-2 rounded-xl transition border border-transparent ${
                            activePage === item.name
                                ? "bg-gradient-to-r from-cyan-600/60 to-blue-700/50 text-white border-cyan-500/40 shadow-lg"
                                : "hover:bg-white/5 hover:border-white/10 text-white/90"
                        }`}
                    >
                        <span className="text-cyan-300 group-hover:text-cyan-200">{item.icon}</span>
                        <span>{item.name}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}

export default Navbar;