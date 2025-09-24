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
        <div className="min-h-screen flex flex-col text-white bg-gradient-to-b from-[#03263d] to-[#00121e] w-full">
            <Navbar activePage={activePage} setActivePage={setActivePage} />

            <div className={`${['Depth Profiles', 'Home'].includes(activePage) ? 'flex-1 relative overflow-y-auto p-4 bg-white/10 rounded-2xl backdrop-blur-md mx-4 md:mx-6 mt-4' : 'flex-1 relative overflow-hidden mx-0 md:mx-0 mt-4'}`}>
                {activePage === 'Depth Profiles' && <Dashboard />}
                {activePage === 'Home' && <Home setActivePage={setActivePage} setChatOpen={setChatOpen} />}
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