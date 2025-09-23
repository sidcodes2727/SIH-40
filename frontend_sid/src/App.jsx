import React, { useState } from 'react';
import Navbar from './components/navbar';
import Chatbot from './components/Chatbot';
import Dashboard from './components/Dashboard';
import Home from './components/Home';
import OceanMap from './components/OceanMap';
import MetricMap from './components/MetricMap';

function OceanVizApp() {
    const [chatOpen, setChatOpen] = useState(false);
    const [activePage, setActivePage] = useState('Home');

    return (
        <div className="flex min-h-screen text-white bg-gradient-to-b from-[#03263d] to-[#00121e] w-full">
            <Navbar activePage={activePage} setActivePage={setActivePage} />

            <div className={`${['Depth Profiles', 'Home'].includes(activePage) ? 'flex-1 relative overflow-y-auto p-2 bg-white/10 rounded-2xl backdrop-blur-md' : 'flex-1 relative overflow-hidden'}`}>
                {activePage === 'Depth Profiles' && <Dashboard />}
                {activePage === 'Home' && <Home setActivePage={setActivePage} />}
                {activePage === 'Argo Floats' && <OceanMap setActivePage={setActivePage} />}
                {activePage === 'Salinity' && <MetricMap metric="salinity" />}
                {activePage === 'Temperature' && <MetricMap metric="temperature" />}
                {activePage === 'Pressure' && <MetricMap metric="pressure" />}
            </div>
            {/* Chatbot Button - fixed to viewport */}
            <button
                onClick={() => setChatOpen(!chatOpen)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 btn-primary rounded-full flex items-center justify-center hover:scale-105 transition"
            >
                🤖
            </button>
            <Chatbot chatOpen={chatOpen} setChatOpen={setChatOpen} />
        </div>
    );
}

export default OceanVizApp;