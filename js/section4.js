const APPREHENSION_DATA = {
    top5: [
        "Non-Custodial",
        "CAP Local",
        "Custodial",
        "Located",
        "CAP Federal"
    ],
    overall: {
        "Non-Custodial": 38.82,
        "CAP Local": 22.76,
        "Custodial": 14.68,
        "Located": 6.06,
        "CAP Federal": 5.14
    },
    byYear: {
        "2022": { "Non-Custodial": 53.12, "CAP Local": 22.11, "Custodial": 0.00, "Located": 4.27, "CAP Federal": 5.19 },
        "2023": { "Non-Custodial": 40.63, "CAP Local": 28.32, "Custodial": 0.00, "Located": 4.98, "CAP Federal": 8.49 },
        "2024": { "Non-Custodial": 17.38, "CAP Local": 45.51, "Custodial": 0.01, "Located": 7.46, "CAP Federal": 10.86 },
        "2025": { "Non-Custodial": 40.47, "CAP Local": 17.82, "Custodial": 22.93, "Located": 7.85, "CAP Federal": 2.78 },
        "2026": { "Non-Custodial": 50.04, "CAP Local": 0.00,  "Custodial": 40.06, "Located": 0.00, "CAP Federal": 0.00 }
    }
};

export function runSection4() {
    const section = d3.select("#section-4");
    if (section.empty()) return;

    const rootStyles = getComputedStyle(d3.select(":root").node());
    const palette = {
        red:    rootStyles.getPropertyValue("--main-red").trim()  || "#be2c2c",
        blue:   rootStyles.getPropertyValue("--main-blue").trim() || "#5b85aa",
        yellow: rootStyles.getPropertyValue("--main-yellow").trim()|| "#d4b146",
        green:  "#2e8b57",
        slate:  "#8b8b86"
    };

    const METHOD_COLORS = {
        "Non-Custodial": palette.red,
        "CAP Local": palette.blue,
        "Custodial": palette.yellow,
        "Located": palette.green,
        "CAP Federal": palette.slate
    };

    const steps = [
        {
            key: "apprehensionBar",
            title: "How does ICE actually make an arrest?",
            subtitle: "The top 5 methods of apprehension account for over 85% of all arrests. These are Non-Custodial Arrest (street-level arrests without detention), CAP Local Incarceration (using local jails as holding facilities), Custodial Arrest (arrests leading directly to detention), Located (cases where the individual was already in custody for another reason), and CAP Federal Incarceration (using federal prisons)."
        },
        {
            key: "apprehensionLine",
            title: "A major shift in strategy.",
            subtitle: "In 2024, CAP Local Incarceration briefly became the dominant method, suggesting ICE leaned on jails as a pipeline. Then in 2025–2026, Custodial Arrest surged from near-zero to 40% of arrests as the Trump administration escalated direct enforcement. Non-Custodial arrests remain high, signaling continued street-level operations."
        }
    ];

    const structure = buildSection4Structure(section);
    syncNarrative(structure.copyHost, steps);
    const width   = 980;
    const height  = 700;
    const margin  = { top: 180, right: 60, bottom: 90, left: 90 };
    const iW = width  - margin.left - margin.right;
    const iH = height - margin.top  - margin.bottom;

    structure.chartHost.selectAll("*").remove();

    const svg = structure.chartHost
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr("aria-label", "Two-step chart: horizontal bar chart of top ICE apprehension methods, then a multi-line chart showing how those methods have shifted year-over-year.");

    const titleText = svg.append("text")
        .attr("class", "section4-title")
        .attr("x", margin.left)
        .attr("y", 42);

    const subtitleText = svg.append("text")
        .attr("class", "section4-subtitle")
        .attr("x", margin.left)
        .attr("y", 86);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const yAxisG = chart.append("g").attr("class", "section4-y-axis");
    const xAxisG = chart.append("g").attr("class", "section4-x-axis")
        .attr("transform", `translate(0,${iH})`);
    const gridG  = chart.append("g").attr("class", "section4-grid");
    const barsG  = chart.append("g").attr("class", "section4-bars");
    const linesG = chart.append("g").attr("class", "section4-lines");
    const dotsG  = chart.append("g").attr("class", "section4-dots");
    const labelsG = chart.append("g").attr("class", "section4-value-labels");

    chart.append("text")
        .attr("class", "section4-axis-label")
        .attr("x", iW / 2)
        .attr("y", iH + 60)
        .attr("text-anchor", "middle")
        .attr("id", "section4-x-axis-label");

    chart.append("text")
        .attr("class", "section4-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -iH / 2)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .text("% Share of Arrests");

    const legendG = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${height - 18})`)
        .attr("class", "section4-legend");

    const methods = APPREHENSION_DATA.top5;
    const overallArr = methods.map(m => ({ method: m, pct: APPREHENSION_DATA.overall[m] }))
        .sort((a, b) => b.pct - a.pct);

    const years = Object.keys(APPREHENSION_DATA.byYear).sort();
    const lineData = methods.map(m => ({
        method: m,
        values: years.map(y => ({ year: y, pct: APPREHENSION_DATA.byYear[y][m] }))
    }));

    const xBarMax = 55;
    const xBar = d3.scaleLinear().domain([0, xBarMax]).range([0, iW]);
    const yBar = d3.scaleBand()
        .domain(overallArr.map(d => d.method))
        .range([0, iH])
        .padding(0.28);

    const xLine = d3.scaleBand()
        .domain(years)
        .range([0, iW])
        .padding(0.1);
    const xLinePt = y => (xLine(y) ?? 0) + xLine.bandwidth() / 2;
    const yLine = d3.scaleLinear().domain([0, 60]).range([iH, 0]);

    const duration = 950;

    function renderBarChart(t) {
        // axes
        xAxisG.transition(t)
            .call(d3.axisBottom(xBar).ticks(6).tickFormat(d => `${d}%`));
        xAxisG.select(".domain").remove();

        yAxisG.transition(t)
            .call(d3.axisLeft(yBar).tickSize(0));
        yAxisG.select(".domain").remove();
        yAxisG.selectAll(".tick text")
            .attr("x", -10)
            .style("text-anchor", "end")
            .style("font-family", "\"Noticia Text\", serif")
            .style("font-size", "10px")
            .style("fill", "#5a5a54");

        gridG.selectAll("*").remove();
        gridG.transition(t).call(
            d3.axisBottom(xBar).ticks(6).tickSize(iH).tickFormat("")
        ).attr("transform", "translate(0,0)");
        gridG.select(".domain").remove();

        d3.select("#section4-x-axis-label").text("Share of all arrests (2020–2026)");

        // bars
        linesG.selectAll("*").transition(t).style("opacity", 0).remove();
        dotsG.selectAll("*").transition(t).style("opacity", 0).remove();
        labelsG.selectAll(".section4-line-label").transition(t).style("opacity", 0).remove();

        const bars = barsG.selectAll(".section4-bar")
            .data(overallArr, d => d.method);

        bars.exit().transition(t).attr("width", 0).remove();

        const entered = bars.enter()
            .append("rect")
            .attr("class", "section4-bar")
            .attr("y", d => yBar(d.method) ?? 0)
            .attr("height", yBar.bandwidth())
            .attr("x", 0)
            .attr("width", 0)
            .attr("rx", 8).attr("ry", 8)
            .attr("fill", d => METHOD_COLORS[d.method])
            .attr("opacity", 0.9);

        entered.merge(bars)
            .transition(t)
            .attr("y", d => yBar(d.method) ?? 0)
            .attr("height", yBar.bandwidth())
            .attr("width", d => xBar(d.pct))
            .attr("fill", d => METHOD_COLORS[d.method])
            .attr("opacity", 0.9);

        // value labels
        const lbls = labelsG.selectAll(".section4-bar-label")
            .data(overallArr, d => d.method);

        lbls.exit().transition(t).style("opacity", 0).remove();

        lbls.enter().append("text")
            .attr("class", "section4-bar-label section4-value")
            .attr("y", d => (yBar(d.method) ?? 0) + yBar.bandwidth() / 2 + 5)
            .attr("x", 4)
            .style("opacity", 0)
            .style("fill", "#fff")
            .style("font-size", "13px")
            .style("font-weight", "700")
            .style("font-family", "\"Noticia Text\", serif")
            .merge(lbls)
            .transition(t)
            .attr("x", d => xBar(d.pct) - 8)
            .attr("y", d => (yBar(d.method) ?? 0) + yBar.bandwidth() / 2 + 5)
            .style("text-anchor", "end")
            .style("opacity", 1)
            .text(d => `${d.pct.toFixed(1)}%`);


        legendG.selectAll("*").remove();
    }

    function renderLineChart(t) {
        // clear bars
        barsG.selectAll(".section4-bar").transition(t).attr("width", 0).remove();
        labelsG.selectAll(".section4-bar-label").transition(t).style("opacity", 0).remove();

        // axes
        xAxisG.transition(t)
            .call(d3.axisBottom(xLine).tickSize(0));
        xAxisG.select(".domain").remove();
        xAxisG.selectAll(".tick text")
            .style("font-family", "\"Noticia Text\", serif")
            .style("font-size", "13px")
            .style("fill", "#5a5a54");

        yAxisG.transition(t)
            .call(d3.axisLeft(yLine).ticks(6).tickFormat(d => `${d}%`));
        yAxisG.select(".domain").remove();
        yAxisG.selectAll(".tick line").remove();

        gridG.selectAll("*").remove();
        gridG.transition(t).call(
            d3.axisLeft(yLine).ticks(6).tickSize(-iW).tickFormat("")
        ).attr("transform", "translate(0,0)");
        gridG.select(".domain").remove();

        d3.select("#section4-x-axis-label").text("Year");

        const lineGen = d3.line()
            .x(d => xLinePt(d.year))
            .y(d => yLine(d.pct))
            .curve(d3.curveCatmullRom.alpha(0.5));

        // lines
        const lines = linesG.selectAll(".section4-line")
            .data(lineData, d => d.method);

        lines.exit().transition(t).style("opacity", 0).remove();

        lines.enter()
            .append("path")
            .attr("class", "section4-line")
            .attr("fill", "none")
            .attr("stroke-width", 2.8)
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .style("opacity", 0)
            .merge(lines)
            .transition(t)
            .attr("stroke", d => METHOD_COLORS[d.method])
            .attr("d", d => lineGen(d.values))
            .style("opacity", 0.9);

        // dots
        const allDots = lineData.flatMap(series =>
            series.values
                .filter(v => v.pct > 0)
                .map(v => ({ method: series.method, year: v.year, pct: v.pct }))
        );

        const dots = dotsG.selectAll(".section4-dot")
            .data(allDots, d => `${d.method}-${d.year}`);

        dots.exit().transition(t).style("opacity", 0).remove();

        dots.enter()
            .append("circle")
            .attr("class", "section4-dot")
            .attr("r", 5)
            .style("opacity", 0)
            .merge(dots)
            .transition(t)
            .attr("cx", d => xLinePt(d.year))
            .attr("cy", d => yLine(d.pct))
            .attr("fill", d => METHOD_COLORS[d.method])
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.8)
            .style("opacity", 1);

        const endLabels = labelsG.selectAll(".section4-line-label")
            .data(lineData, d => d.method);

        endLabels.exit().transition(t).style("opacity", 0).remove();

        endLabels.enter()
            .append("text")
            .attr("class", "section4-line-label section4-value")
            .style("font-size", "12px")
            .style("font-weight", "700")
            .style("font-family", "\"Noticia Text\", serif")
            .style("opacity", 0)
            .merge(endLabels)
            .transition(t)
            .attr("x", () => xLinePt(years[years.length - 1]) + 8)
            .attr("y", d => {
                const last = d.values[d.values.length - 1];
                return yLine(last.pct) + 4;
            })
            .style("fill", d => METHOD_COLORS[d.method])
            .style("opacity", d => {
                const last = d.values[d.values.length - 1];
                return last.pct > 0 ? 1 : 0;
            })
            .text(d => {
                const last = d.values[d.values.length - 1];
                return last.pct > 0 ? `${last.pct.toFixed(1)}%` : "";
            });

        // legend
        legendG.selectAll("*").remove();
        let lx = 0;
        methods.forEach(m => {
            const g = legendG.append("g").attr("transform", `translate(${lx}, 0)`);
            g.append("rect")
                .attr("width", 12).attr("height", 12).attr("y", -11).attr("rx", 2)
                .attr("fill", METHOD_COLORS[m]);
            const label = g.append("text")
                .attr("x", 16).attr("y", 0)
                .style("font-size", "11px")
                .style("font-family", "\"Noticia Text\", serif")
                .style("fill", "#5a5a54")
                .text(m);
            lx += (label.node()?.getComputedTextLength() ?? 100) + 36;
        });
    }

    function updateChart(stepIndex) {
        const step = steps[stepIndex];
        const t = svg.transition().duration(duration).ease(d3.easeCubicInOut);

        titleText.text(step.title);
        subtitleText.text(step.subtitle);
        wrapSvgText(titleText, 680, 1.15);
        wrapSvgText(subtitleText, 680, 1.35);

        if (stepIndex === 0) {
            renderBarChart(t);
        } else {
            renderLineChart(t);
        }

        structure.copyHost.selectAll("[data-section4-step]")
            .classed("is-active", (_, i) => i === stepIndex);
    }

    const stepNodes = structure.copyHost.selectAll("[data-section4-step]").nodes();

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const idx = Number(entry.target.getAttribute("data-section4-step"));
            if (!Number.isNaN(idx)) updateChart(idx);
        });
    }, { root: null, threshold: 0.55 });

    stepNodes.forEach(node => observer.observe(node));
    updateChart(0);
}


function buildSection4Structure(section) {
    let layout = section.select("[data-section4-layout]");
    if (layout.empty()) {
        layout = section.append("div")
            .attr("class", "section4-layout")
            .attr("data-section4-layout", "");

        layout.append("div")
            .attr("class", "section4-copy")
            .attr("data-section4-copy", "");

        layout.append("div")
            .attr("class", "section4-vis")
            .append("div")
            .attr("class", "section4-chart-wrap")
            .attr("data-section4-chart", "");
    }

    return {
        layout,
        copyHost:  section.select("[data-section4-copy]"),
        chartHost: section.select("[data-section4-chart]")
    };
}

function syncNarrative(copyHost, steps) {
    const articles = copyHost.selectAll(".section4-step")
        .data(steps, d => d.key);

    articles.exit().remove();

    const entered = articles.enter()
        .append("article")
        .attr("class", "section4-step")
        .attr("data-section4-step", (_, i) => i);
    entered.append("h3");
    entered.append("p").attr("class", "section4-body");

    const merged = entered.merge(articles)
        .attr("data-section4-step", (_, i) => i);

    merged.select("h3").text(d => d.title);
    merged.select(".section4-body").text(d => d.subtitle);
}

function wrapSvgText(selection, maxWidth, lineHeight = 1.2) {
    selection.each(function () {
        const text  = d3.select(this);
        const words = (text.text() || "").split(/\s+/).filter(Boolean);
        const x     = text.attr("x") || 0;
        const y     = Number(text.attr("y") || 0);
        const anchor = text.attr("text-anchor") || "start";

        text.text("");
        let line = [], lineNumber = 0;
        let tspan = text.append("tspan")
            .attr("x", x).attr("y", y)
            .attr("text-anchor", anchor)
            .attr("dy", "0em");

        words.forEach(word => {
            line.push(word);
            tspan.text(line.join(" "));
            if ((tspan.node()?.getComputedTextLength() ?? 0) > maxWidth && line.length > 1) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                lineNumber++;
                tspan = text.append("tspan")
                    .attr("x", x).attr("y", y)
                    .attr("text-anchor", anchor)
                    .attr("dy", `${lineNumber * lineHeight}em`)
                    .text(word);
            }
        });
    });
}