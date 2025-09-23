import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

function LineChart({ data, title, color }) {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || data.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = 300;
        const height = 200;
        const margin = { top: 20, right: 20, bottom: 30, left: 40 };

        const x = d3
            .scaleLinear()
            .domain(d3.extent(data, (d) => d.x))
            .range([margin.left, width - margin.right]);
        const y = d3
            .scaleLinear()
            .domain([0, d3.max(data, (d) => d.y)])
            .nice()
            .range([height - margin.bottom, margin.top]);

        const line = d3
            .line()
            .x((d) => x(d.x))
            .y((d) => y(d.y));

        const xAxis = svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x));
        xAxis.selectAll('text').attr('fill', '#8ba1b7');
        xAxis.selectAll('line').attr('stroke', 'rgba(139,161,183,0.4)');
        xAxis.selectAll('path').attr('stroke', 'rgba(139,161,183,0.4)');

        const yAxis = svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y));
        yAxis.selectAll('text').attr('fill', '#8ba1b7');
        yAxis.selectAll('line').attr('stroke', 'rgba(139,161,183,0.35)');
        yAxis.selectAll('path').attr('stroke', 'rgba(139,161,183,0.35)');

        svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 2)
            .attr('d', line);
    }, [data]);

    return (
        <div className="card p-4">
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <svg ref={svgRef} width={300} height={200}></svg>
        </div>
    );
}

function Dashboard() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const res = await fetch('http://localhost:3000/everything');
                const data = await res.json();
                setRecords(Array.isArray(data) ? data : []);
            } catch (e) {
                setError(e.message || 'Failed to load');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const total = records.length;
    const avgTemp = records.reduce((s, r) => s + (Number(r.temperature) || 0), 0) / (total || 1);
    const avgSal = records.reduce((s, r) => s + (Number(r.salinity) || 0), 0) / (total || 1);
    const maxDepth = records.reduce((m, r) => Math.max(m, Number(r.depth) || 0), 0);
    const uniqueLocations = new Set(records.map(r => `${r.latitude?.toFixed?.(2)},${r.longitude?.toFixed?.(2)}`)).size;

    function StatCard({ label, value, unit, glowFrom = 'from-cyan-400', glowTo = 'to-blue-600' }) {
        return (
            <div className={`relative overflow-hidden rounded-2xl p-5 card`}> 
                <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${glowFrom} ${glowTo}`} />
                <div className="relative">
                    <p className="text-white/70 text-sm">{label}</p>
                    <p className="text-3xl font-extrabold tracking-wide mt-1">{value}<span className="text-white/60 text-lg ml-1">{unit}</span></p>
                </div>
            </div>
        );
    }

    const tempData = Array.from({ length: 20 }, (_, i) => ({
        x: i * 5,
        y: (Math.random() * 6) + 18,
    }));

    const salData = Array.from({ length: 20 }, (_, i) => ({
        x: i * 5,
        y: (Math.random() * 8) + 30,
    }));

    const presData = Array.from({ length: 20 }, (_, i) => ({
        x: i * 5,
        y: Math.random() * 1000,
    }));

    return (
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Records" value={total || 0} unit="" />
                <StatCard label="Avg Temp" value={avgTemp.toFixed(2)} unit="°C" />
                <StatCard label="Avg Salinity" value={avgSal.toFixed(2)} unit=" PSU" />
                <StatCard label="Max Depth" value={maxDepth.toFixed(0)} unit=" km" />
            </div>

            {error && <div className="card p-4 text-red-300">Error: {error}</div>}
            {loading && <div className="card p-4">Loading live data...</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <LineChart
                title="Temperature vs Depth"
                data={tempData}
                color="cyan"
            />
            <LineChart
                title="Salinity vs Depth"
                data={salData}
                color="orange"
            />
            <LineChart title="Pressure vs Depth" data={presData} color="lime" />
            </div>
        </div>
    );
}

export default Dashboard;
