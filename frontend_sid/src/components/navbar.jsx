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
        <div className="w-64 glass p-5 flex flex-col gap-5 rounded-2xl">
            <div className="flex items-center gap-2">
                
                <h1 className="text-2xl font-bold text-cyan-300 tracking-wide flex items-center"><img src ={logo} className="h-15 w-15 p-2" /> floatCHAT</h1>
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