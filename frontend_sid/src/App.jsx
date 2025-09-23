import React, { useState } from 'react';
import Navbar from './components/navbar';
import Chatbot from './components/Chatbot';
import Dashboard from './components/Dashboard';
import Map from './components/map';
import MetricMap from './components/MetricMap';

function OceanVizApp() {
    const [chatOpen, setChatOpen] = useState(false);
    const [activePage, setActivePage] = useState('Dashboard');

    return (
        <div className="flex h-screen text-white bg-gradient-to-b from-[#03263d] to-[#00121e]">
            <Navbar activePage={activePage} setActivePage={setActivePage} />

            <div className={`${activePage === 'Dashboard' ? 'flex-1 relative overflow-y-auto p-2 bg-white/10 rounded-2xl backdrop-blur-md' : 'flex-1 relative overflow-hidden'}`}>
                {activePage === 'Dashboard' && <Dashboard />}
                {activePage === 'Home' && <Map />}
                {activePage === 'Salinity' && <MetricMap metric="salinity" />}
                {activePage === 'Temperature' && <MetricMap metric="temperature" />}
                {activePage === 'Pressure' && <MetricMap metric="pressure" />}

                {/* Chatbot Button */}
                <button
                    onClick={() => setChatOpen(!chatOpen)}
                    className="absolute bottom-6 right-6 w-14 h-14 btn-primary rounded-full flex items-center justify-center hover:scale-105 transition"
                >
                    🤖
                </button>
                <Chatbot chatOpen={chatOpen} setChatOpen={setChatOpen} />
            </div>
        </div>
    );
}

export default OceanVizApp;