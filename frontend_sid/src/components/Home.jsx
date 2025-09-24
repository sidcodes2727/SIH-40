import React from 'react';
import { MapPin, Waves, BarChart3 } from 'lucide-react';

export default function Home({ setActivePage }) {
  return (
    <div className="flex-1 p-8 overflow-hidden">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text">
            Welcome to floatCHAT
          </h1>
          <p className="text-xl text-white/80 mb-8 leading-relaxed">
            Explore the depths of our oceans through interactive data visualization. 
            Discover temperature patterns, salinity levels, and pressure variations across the globe.
          </p>
          
          {/* Map Button */}
          <button
            onClick={() => setActivePage('Argo Floats')}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <MapPin size={24} />
            Explore Ocean Map
          </button>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Waves size={24} className="text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Ocean Depth</h3>
            </div>
            <p className="text-white/70 leading-relaxed">
              Visualize ocean depth measurements across different regions. Our interactive map shows 
              depth variations with color-coded markers for easy interpretation.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <BarChart3 size={24} className="text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Data Analytics</h3>
            </div>
            <p className="text-white/70 leading-relaxed">
              Access comprehensive analytics dashboard with real-time data processing. 
              Monitor trends and patterns in ocean temperature, salinity, and pressure.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <MapPin size={24} className="text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Global Coverage</h3>
            </div>
            <p className="text-white/70 leading-relaxed">
              Explore oceanographic data from around the world. Our platform provides 
              comprehensive coverage of major ocean regions and water bodies.
            </p>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
          <h2 className="text-3xl font-bold text-white mb-6">About Ocean Data Visualization</h2>
          <div className="space-y-4 text-white/80 leading-relaxed">
            <p>
              Ocean data visualization plays a crucial role in understanding marine ecosystems, 
              climate patterns, and environmental changes. Our platform combines cutting-edge 
              technology with comprehensive datasets to provide insights into ocean conditions.
            </p>
            <p>
              Through interactive maps and real-time data analysis, researchers, scientists, 
              and ocean enthusiasts can explore temperature variations, salinity distributions, 
              and pressure measurements across different depths and geographical locations.
            </p>
            <p>
              The data presented here helps in monitoring ocean health, predicting weather patterns, 
              and understanding the impact of climate change on marine environments. Join us in 
              exploring the fascinating world beneath the waves.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
