import React, { useEffect, useMemo, useRef, useState } from 'react';
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

        // Hover interaction: focus circle and tooltip text
        const focus = svg.append('g')
            .style('display', 'none');
        focus.append('circle')
            .attr('r', 4)
            .attr('fill', color)
            .attr('stroke', 'white')
            .attr('stroke-width', 1.5);
        const focusText = focus.append('text')
            .attr('x', 8)
            .attr('dy', '-0.7em')
            .attr('fill', '#cfe8ff')
            .style('font-size', '10px');

        const bisect = d3.bisector(d => d.x).center;
        function moved(event) {
            const [mx] = d3.pointer(event);
            const dx = x.invert(mx);
            const i = bisect(data, dx);
            const d = data[Math.max(0, Math.min(data.length - 1, i))];
            const px = x(d.x);
            const py = y(d.y);
            focus.attr('transform', `translate(${px},${py})`);
            focusText.text(`${d.x.toFixed(2)}, ${d.y.toFixed(2)}`)
                .attr('transform', `translate(0,0)`);
        }

        svg.append('rect')
            .attr('fill', 'transparent')
            .attr('pointer-events', 'all')
            .attr('x', margin.left)
            .attr('y', margin.top)
            .attr('width', width - margin.left - margin.right)
            .attr('height', height - margin.top - margin.bottom)
            .on('mouseenter', () => focus.style('display', null))
            .on('mousemove', moved)
            .on('mouseleave', () => focus.style('display', 'none'));
    }, [data]);

    return (
        <div className="card p-4">
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <svg ref={svgRef} width={300} height={200}></svg>
        </div>
    );
}

function Dashboard() {
    const [allRecords, setAllRecords] = useState([]); // unfiltered baseline
    const [records, setRecords] = useState([]); // currently displayed
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // User inputs for filtering
    const [lat, setLat] = useState(0);
    const [lon, setLon] = useState(0);
    const [rangeDeg, setRangeDeg] = useState(''); // radius in degrees (great-circle); empty means no filter

    // Initial load: everything
    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const res = await fetch('http://localhost:3000/everything');
                const data = await res.json();
                const arr = Array.isArray(data) ? data : [];
                setAllRecords(arr);
                setRecords(arr);
            } catch (e) {
                setError(e.message || 'Failed to load');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    // When filters are finite, fetch from backend /profiles; else show baseline
    useEffect(() => {
        const rangeNum = typeof rangeDeg === 'string' ? parseFloat(rangeDeg) : rangeDeg;
        const hasFinite = Number.isFinite(lat) && Number.isFinite(lon) && Number.isFinite(rangeNum);
        if (!hasFinite) {
            setRecords(allRecords);
            return;
        }
        let aborted = false;
        async function fetchProfiles() {
            try {
                setLoading(true);
                const url = new URL('http://localhost:3000/profiles');
                url.searchParams.set('lat', String(lat));
                url.searchParams.set('lon', String(lon));
                url.searchParams.set('rangeDeg', String(rangeNum));
                const res = await fetch(url.toString());
                const data = await res.json();
                if (!aborted) setRecords(Array.isArray(data) ? data : []);
            } catch (e) {
                if (!aborted) setError(e.message || 'Failed to load filtered data');
            } finally {
                if (!aborted) setLoading(false);
            }
        }
        fetchProfiles();
        return () => { aborted = true; };
    }, [lat, lon, rangeDeg, allRecords]);

    // Angular (great-circle) distance in degrees between two lat/lon points
    function angularDistanceDeg(lat1, lon1, lat2, lon2) {
        const toRad = (d) => (d * Math.PI) / 180;
        const toDeg = (r) => (r * 180) / Math.PI;
        const φ1 = toRad(lat1);
        const φ2 = toRad(lat2);
        const Δλ = toRad(lon2 - lon1);
        const cosd = Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        // numerical safety
        const d = Math.acos(Math.min(1, Math.max(-1, cosd)));
        return toDeg(d);
    }

    // No client-side distance filter anymore; use records as-is
    const filtered = records;

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

    // Build series from filtered data: x = depth, y = metric
    function buildSeries(metricKey) {
        const pts = filtered
            .map(r => ({
                x: Number(r.depth),
                y: Number(r[metricKey])
            }))
            .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
        // Sort by depth ascending
        pts.sort((a, b) => a.x - b.x);
        return pts;
    }

    const tempData = useMemo(() => buildSeries('temperature'), [filtered]);
    const salData = useMemo(() => buildSeries('salinity'), [filtered]);
    const oxyData = useMemo(() => buildSeries('oxygen'), [filtered]);

    // Debug sizes (visible in browser console)
    useEffect(() => {
        // eslint-disable-next-line no-console
        console.log('Series sizes -> temp:', tempData.length, 'sal:', salData.length, 'oxy:', oxyData.length, 'filtered:', filtered.length);
    }, [tempData, salData, oxyData, filtered]);

    return (
        <div className="p-6 space-y-6">
            {/* Filters */}
            <div className="card p-4 flex flex-col gap-3">
                <h3 className="text-lg font-semibold">Filter by Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                        <label className="text-white/70 text-sm">Latitude</label>
                        <input
                            type="number"
                            step="0.01"
                            value={lat}
                            onChange={(e) => setLat(parseFloat(e.target.value))}
                            className="mt-1 w-full px-3 py-2 rounded-lg bg-[#061523] border border-white/10 focus:outline-none focus:border-cyan-400/50"
                        />
                    </div>
                    <div>
                        <label className="text-white/70 text-sm">Longitude</label>
                        <input
                            type="number"
                            step="0.01"
                            value={lon}
                            onChange={(e) => setLon(parseFloat(e.target.value))}
                            className="mt-1 w-full px-3 py-2 rounded-lg bg-[#061523] border border-white/10 focus:outline-none focus:border-cyan-400/50"
                        />
                    </div>
                    <div>
                        <label className="text-white/70 text-sm">Range (degrees)</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="Leave empty for no filter"
                            value={rangeDeg}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === '') setRangeDeg('');
                                else setRangeDeg(parseFloat(v));
                            }}
                            className="mt-1 w-full px-3 py-2 rounded-lg bg-[#061523] border border-white/10 focus:outline-none focus:border-cyan-400/50"
                        />
                    </div>
                    <div className="flex items-end">
                        <div className="text-white/70">
                            Matching records: <span className="text-cyan-300 font-semibold">{filtered.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Records" value={total || 0} unit="" />
                <StatCard label="Avg Temp" value={avgTemp.toFixed(2)} unit="°C" />
                <StatCard label="Avg Salinity" value={avgSal.toFixed(2)} unit=" PSU" />
                <StatCard label="Max Depth" value={maxDepth.toFixed(0)} unit=" km" />
            </div>

            {error && <div className="card p-4 text-red-300">Error: {error}</div>}
            {loading && <div className="card p-4">Loading live data...</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tempData.length > 0 ? (
                    <LineChart title="Temperature vs Depth" data={tempData} color="cyan" />
                ) : (
                    <div className="card p-4 flex items-center justify-center min-h-[220px]">No data for Temperature</div>
                )}
                {salData.length > 0 ? (
                    <LineChart title="Salinity vs Depth" data={salData} color="orange" />
                ) : (
                    <div className="card p-4 flex items-center justify-center min-h-[220px]">No data for Salinity</div>
                )}
                {oxyData.length > 0 ? (
                    <LineChart title="Oxygen vs Depth" data={oxyData} color="lime" />
                ) : (
                    <div className="card p-4 flex items-center justify-center min-h-[220px]">No data for Oxygen</div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
