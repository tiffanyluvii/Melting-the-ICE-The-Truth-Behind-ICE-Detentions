export function runSection2(biden_data, trump_data, main_red, main_blue){

    const width = 1000;
    const height = 500;
    const chartWidth = 800;
    const chartHeight = 300;

    const detention_scale_svg = d3.select('#detention-scale-vis').append("svg").attr("width", width).attr("height", height);
    const scale_g = detention_scale_svg.append("g").attr("transform", "translate(100,50)").attr("width", chartWidth).attr("height", chartHeight);

    const startCutoff = new Date("2025-01-01")
    const biden_filtered = biden_data.filter(d => d.date <= startCutoff)

    const biden_detention_map = d3.rollups(
        biden_filtered,
        v=>v.length,
        d=>d3.timeMonth(d.date)
        ).map(
        (([date, count]) => ({
            date,
            count
        }))
        ).sort((a,b) => a.date - b.date)

    console.log(biden_detention_map)

    const endCutoff = new Date("2026-03-01")
    const trump_filtered = trump_data.filter(d => d.date >= startCutoff && d.date <= endCutoff)

    const trump_detention_map = d3.rollups(
        trump_filtered,
        v=>v.length,
        d=>d3.timeMonth(d.date)
        ).map(
        (([date, count]) => ({
            date, 
            count
        }))
        ).sort((a,b) => a.date - b.date);

    console.log(trump_detention_map)

    const combined_x_extent = d3.extent([
        ...biden_detention_map.map(d => d.date),
        ...trump_detention_map.map(d => d.date)
        ]);

    const combined_y_max = d3.max([
        d3.max(biden_detention_map, d => d.count),
        d3.max(trump_detention_map, d => d.count)
        ]);

    const x_scale = d3.scaleTime()
        .domain(combined_x_extent)
        .range([0, chartWidth]);

    const y_scale = d3.scaleLinear()
        .domain([0, combined_y_max])
        .range([chartHeight, 0]);

    const biden_line = d3.line()
        .x(d=>x_scale(d.date))
        .y(d=>y_scale(d.count));
    
    scale_g.append("path")
        .datum(biden_detention_map)
        .attr("fill", "none")
        .attr("stroke", main_blue)
        .attr("stroke-width", 2)
        .attr("d", biden_line);

    const trump_line = d3.line()
        .x(d=>x_scale(d.date))
        .y(d=>y_scale(d.count));

    scale_g.append("path")
        .datum(trump_detention_map)
        .attr("fill", "none")
        .attr("stroke", main_red)
        .attr("stroke-width", 2)
        .attr("d", trump_line);


    const scale_x_axis = d3.axisBottom(x_scale)
    scale_g.append('g')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(scale_x_axis);

    const scale_y_axis = d3.axisLeft(y_scale).ticks(10)
    scale_g.append('g')
        .attr('class', 'y-axis')
        .call(scale_y_axis);

    scale_g.append("text").attr('class', 'axis-label')
        .attr('x', chartWidth / 2 + 20)
        .attr('y', chartHeight + 40)
        .style('text-anchor', 'middle')
        .style("font", "noticia")
        .text('Years');

    scale_g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -60)
        .style('text-anchor', 'middle')
        .style("font", "noticia")
        .text('ICE Administrative Arrests');

    // legend
    const legendWidth = 100;
    const legendHeight = 100;

    const legendData = [
        { label: "Biden: 2020-2024", color: main_blue },
        { label: "Trump: 2024-2028", color: main_red }
        ];

    const legend = detention_scale_svg.append("g")
        .attr("transform", "translate(800,0)");

    legend.selectAll("rect")
        .data(legendData)
        .enter()
        .append("rect")
        .attr("y", (d, i) => i * 20)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", d => d.color);

    legend.selectAll("text")
        .data(legendData)
        .enter()
        .append("text")
        .attr("x", 18)
        .attr("y", (d, i) => i * 20 + 10)
        .text(d => d.label)
        .style("font-size", "12px")
        .style("font", "noticia")
        .attr("alignment-baseline", "middle");   
}