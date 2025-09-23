import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

function TemperatureGraph({ data, title, color }) {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || data.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = 800;
        const height = 400;
        const margin = { top: 40, right: 40, bottom: 60, left: 80 };

        const x = d3
            .scaleLinear()
            .domain(d3.extent(data, (d) => d.x))
            .range([margin.left, width - margin.right]);
        
        const y = d3
            .scaleLinear()
            .domain(d3.extent(data, (d) => d.y))
            .nice()
            .range([height - margin.bottom, margin.top]);

        const line = d3
            .line()
            .x((d) => x(d.x))
            .y((d) => y(d.y))
            .curve(d3.curveMonotoneX);

        // Add grid lines
        svg.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x)
                .tickSize(-height + margin.top + margin.bottom)
                .tickFormat('')
            )
            .style('stroke-dasharray', '3,3')
            .style('opacity', 0.3);

        svg.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y)
                .tickSize(-width + margin.left + margin.right)
                .tickFormat('')
            )
            .style('stroke-dasharray', '3,3')
            .style('opacity', 0.3);

        // Add axes dark theme
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

        // Add axis labels
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left)
            .attr('x', 0 - (height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .style('fill', '#ffffff')
            .text('Temperature (°C)');

        svg.append('text')
            .attr('transform', `translate(${width / 2}, ${height - 10})`)
            .style('text-anchor', 'middle')
            .style('fill', '#ffffff')
            .text('Depth (m)');

        // Add the line
        svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 3)
            .attr('d', line);

        // Add dots
        svg.selectAll('.dot')
            .data(data)
            .enter().append('circle')
            .attr('class', 'dot')
            .attr('cx', d => x(d.x))
            .attr('cy', d => y(d.y))
            .attr('r', 4)
            .attr('fill', color)
            .on('mouseover', function(event, d) {
                // Tooltip on hover
                const tooltip = d3.select('body').append('div')
                    .attr('class', 'tooltip')
                    .style('position', 'absolute')
                    .style('background', 'rgba(0,0,0,0.8)')
                    .style('color', 'white')
                    .style('padding', '8px')
                    .style('border-radius', '4px')
                    .style('pointer-events', 'none')
                    .style('opacity', 0);

                tooltip.transition().duration(200).style('opacity', 1);
                tooltip.html(`Depth: ${d.x}m<br/>Temperature: ${d.y.toFixed(2)}°C`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                d3.selectAll('.tooltip').remove();
            });

    }, [data, color]);

    return (
        <div className="card p-6">
            <h2 className="text-2xl font-bold mb-4 text-center text-cyan-300">{title}</h2>
            <svg ref={svgRef} width={800} height={400}></svg>
        </div>
    );
}

function Temperature() {
    const [temperatureData, setTemperatureData] = useState([]);

    useEffect(() => {
        // Generate sample temperature data - replace with actual API call
        const sampleData = Array.from({ length: 50 }, (_, i) => ({
            x: i * 2, // depth in meters
            y: 25 - (i * 0.3) + Math.random() * 3 - 1.5, // temperature decreases with depth
        }));
        setTemperatureData(sampleData);
    }, []);

    return (
        <div className="p-6 flex flex-col items-center">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-cyan-300 mb-2">Ocean Temperature Analysis</h1>
                <p className="text-white/70 text-center">Temperature variation with ocean depth</p>
            </div>
            
            <TemperatureGraph
                title="Temperature vs Depth Profile"
                data={temperatureData}
                color="#00ffff"
            />
            
            <div className="mt-6 card p-4 max-w-4xl">
                <h3 className="text-lg font-semibold text-cyan-300 mb-2">Key Insights:</h3>
                <ul className="text-white/75 space-y-1">
                    <li>• Temperature generally decreases with increasing depth</li>
                    <li>• Surface waters are warmer due to solar heating</li>
                    <li>• Thermocline layer shows rapid temperature change</li>
                    <li>• Deep ocean temperatures remain relatively stable</li>
                </ul>
            </div>
        </div>
    );
}

export default Temperature;
