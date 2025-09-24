import React from "react";
import { LayoutDashboard, Home, Map, Thermometer, Droplets, Gauge, ChartNoAxesCombined } from "lucide-react";
import logo from '../assets/logo.png';


function Navbar({ activePage, setActivePage }) {
    const navItems = [
        { name: "Home", icon: <Home size={18} /> },
        { name: "Depth Profiles", icon: <ChartNoAxesCombined size={18} /> },
        { name: "Argo Floats", icon: <Map size={18} /> },
        { name: "Temperature", icon: <Thermometer size={18} /> },
        { name: "Salinity", icon: <Droplets size={18} /> },
        { name: "Pressure", icon: <Gauge size={18} /> },
    ];

    return (
        <header className="w-full glass px-4 py-3 md:px-6 sticky top-0 z-20 rounded-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 min-w-0">
                    <h1 className="text-xl md:text-2xl font-bold text-cyan-300 tracking-wide flex items-center gap-2">
                        <img src={logo} className="h-8 w-8 md:h-10 md:w-10 rounded" alt="logo" />
                        <span className="truncate">floatCHAT</span>
                    </h1>
                </div>
                <nav className="flex items-center gap-2 overflow-x-auto py-1">
                    {navItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => setActivePage(item.name)}
                            className={`whitespace-nowrap group flex items-center gap-2 px-3 py-2 rounded-xl transition border border-transparent ${
                                activePage === item.name
                                    ? 'bg-gradient-to-r from-cyan-600/60 to-blue-700/50 text-white border-cyan-500/40 shadow-lg'
                                    : 'hover:bg-white/5 hover:border-white/10 text-white/90'
                            }`}
                            title={item.name}
                        >
                            <span className="text-cyan-300 group-hover:text-cyan-200">{item.icon}</span>
                            <span className="text-sm md:text-base">{item.name}</span>
                        </button>
                    ))}
                </nav>
            </div>
        </header>
    );
}

export default Navbar;