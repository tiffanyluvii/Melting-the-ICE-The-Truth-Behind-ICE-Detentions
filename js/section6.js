
// hist bins
const HIST_BINS = [
    { label: "1–3",    lo: 1,   hi: 3   },
    { label: "4–10",   lo: 4,   hi: 10  },
    { label: "11–30",  lo: 11,  hi: 30  },
    { label: "31–90",  lo: 31,  hi: 90  },
    { label: "91–180", lo: 91,  hi: 180 },
    { label: "181–365",lo: 181, hi: 365 },
    { label: "365+",   lo: 366, hi: Infinity }
];

// Ttargeted nations
const TOP_COUNTRIES = [
    "MEXICO", "GUATEMALA", "HONDURAS", "VENEZUELA",
    "EL SALVADOR", "ECUADOR", "COLOMBIA", "NICARAGUA",
    "CUBA", "INDIA"
];

const STEPS_6 = [
    {
        key: "histogram",
        title: "Some detentions are short — but most stretch on for months.",
        subtitle: "Only one in ten people held by ICE is released or deported within three days. Tens of thousands of people spend more than three months in detention, without a criminal conviction, awaiting civil immigration proceedings."
    },
    {
        key: "gender",
        title: "Men and women face similar detention lengths.",
        subtitle: "Even though men make up a larger portion of the detained population, both genders experience similar average detention lengths - an alarming 40+ days."
    },
    {
        key: "ethnicity",
        title: "Where you're from shapes how long you wait.",
        subtitle: "Cubans and Indians face dramatically longer average stays - often nearly three months - while Mexican nationals are typically processed and deported within a month. This gap reflects differences in asylum claim rates, flight-risk assessments, and diplomatic repatriation agreements."
    }
];

// data agg

function parseStayDays(row) {
    try {
        const inStr  = (row.stay_book_in_date_time  ?? "").replace(" UTC", "");
        const outStr = (row.stay_book_out_date_time ?? "").replace(" UTC", "");
        if (!inStr || !outStr) return null;
        const days = (new Date(outStr) - new Date(inStr)) / 86_400_000;
        return days >= 0 ? Math.round(days) : null;
    } catch {
        return null;
    }
}

export function aggregateSection6Data(rows) {
    const staysWithDays = [];

    rows.forEach(row => {
        const days = parseStayDays(row);
        if (days === null) return;
        staysWithDays.push({
            days,
            gender:  (row.gender ?? "").trim() || "Unknown",
            country: (row.citizenship_country ?? "").trim()
        });
    });

    if (staysWithDays.length === 0) return null;

    // 1. Histogram
    const histogram = HIST_BINS.map(b => ({
        bin:   b.label,
        lo:    b.lo,
        hi:    b.hi,
        count: staysWithDays.filter(s => s.days >= b.lo && s.days <= b.hi).length
    }));

    // 2. Gender averages
    const genderMap = d3.rollup(
        staysWithDays.filter(s => s.gender === "Male" || s.gender === "Female"),
        v => ({ avgDays: d3.mean(v, d => d.days), n: v.length }),
        s => s.gender
    );

    const gender = ["Male", "Female"]
        .filter(g => genderMap.has(g))
        .map(g => ({
            group:   g,
            avgDays: +genderMap.get(g).avgDays.toFixed(1),
            n:       genderMap.get(g).n
        }));

    // 3. Country averages (top countries only, sorted by avg desc)
    const countryMap = d3.rollup(
        staysWithDays.filter(s => TOP_COUNTRIES.includes(s.country)),
        v => ({ avgDays: d3.mean(v, d => d.days), n: v.length }),
        s => s.country
    );

    const ethnicity = TOP_COUNTRIES
        .filter(c => countryMap.has(c))
        .map(c => ({
            group:    c.charAt(0) + c.slice(1).toLowerCase(),
            groupRaw: c,
            avgDays:  +countryMap.get(c).avgDays.toFixed(1),
            n:        countryMap.get(c).n
        }))
        .sort((a, b) => b.avgDays - a.avgDays);

    // Overall average (across all valid stays)
    const overallAvg = +(d3.mean(staysWithDays, d => d.days).toFixed(1));

    return { histogram, gender, ethnicity, overallAvg, total: staysWithDays.length };
}

// entry point
export function runSection6(rows) {
    const section = d3.select("#section-6");
    if (section.empty() || !Array.isArray(rows) || rows.length === 0) return;

    const data = aggregateSection6Data(rows);
    if (!data) return;

    const rootStyles = getComputedStyle(d3.select(":root").node());
    const palette = {
        red:    rootStyles.getPropertyValue("--main-red").trim()    || "#be2c2c",
        blue:   rootStyles.getPropertyValue("--main-blue").trim()   || "#5b85aa",
        yellow: rootStyles.getPropertyValue("--main-yellow").trim() || "#d4b146",
    };

    const structure = buildSection6Structure(section);
    syncSection6Narrative(structure.copyHost, STEPS_6);
    renderSection6Charts(structure.chartHost, data, palette);
}

function renderSection6Charts(chartHost, data, palette) {
    chartHost.selectAll("*").remove();

    const width  = 960;
    const height = 680;
    const margin = { top: 175, right: 68, bottom: 90, left: 92 };
    const iW = width  - margin.left - margin.right;
    const iH = height - margin.top  - margin.bottom;
    const duration = 900;

    const svg = chartHost
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr("aria-label", "Three-step detention length visualization.");

    // SVG title + subtitle (multi-line wrapped)
    const titleText = svg.append("text")
        .attr("class", "section6-title")
        .attr("x", margin.left)
        .attr("y", 42);

    const subtitleText = svg.append("text")
        .attr("class", "section6-subtitle")
        .attr("x", margin.left)
        .attr("y", 86);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const yAxisG  = chart.append("g").attr("class", "section6-y-axis");
    const xAxisG  = chart.append("g").attr("class", "section6-x-axis")
        .attr("transform", `translate(0,${iH})`);
    const gridG   = chart.append("g").attr("class", "section6-grid");
    const barsG   = chart.append("g").attr("class", "section6-bars");
    const labelsG = chart.append("g").attr("class", "section6-value-labels");
    const annotG  = chart.append("g").attr("class", "section6-annotations");

    const xLabel = chart.append("text")
        .attr("class", "section6-axis-label")
        .attr("x", iW / 2)
        .attr("y", iH + 62)
        .attr("text-anchor", "middle");

    const yLabel = chart.append("text")
        .attr("class", "section6-axis-label")
        .attr("id", "section6-y-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -iH / 2)
        .attr("y", -68)
        .attr("text-anchor", "middle");

    function styleAxis(axisG) {
        axisG.select(".domain").remove();
        axisG.selectAll(".tick text")
            .style("font-family", '"Noticia Text", serif')
            .style("font-size", "11px")
            .style("fill", "#5a5a54");
    }

    function drawGridLeft(yScale) {
        gridG.selectAll("*").remove();
        gridG.call(d3.axisLeft(yScale).ticks(5).tickSize(-iW).tickFormat(""));
        gridG.select(".domain").remove();
        gridG.selectAll(".tick line")
            .attr("stroke", "rgba(31,31,27,0.08)")
            .attr("stroke-dasharray", "3,3");
    }

    function drawGridBottom(xScale) {
        gridG.selectAll("*").remove();
        gridG.call(d3.axisBottom(xScale).ticks(6).tickSize(iH).tickFormat(""))
            .attr("transform", "translate(0,0)");
        gridG.select(".domain").remove();
        gridG.selectAll(".tick line")
            .attr("stroke", "rgba(31,31,27,0.08)")
            .attr("stroke-dasharray", "3,3");
    }

    function drawAvgLine(xPos) {
        annotG.selectAll(".section6-avg-line, .section6-avg-label").remove();
        annotG.append("line")
            .attr("class", "section6-avg-line")
            .attr("x1", xPos).attr("x2", xPos)
            .attr("y1", 0).attr("y2", iH)
            .attr("stroke", palette.red)
            .attr("stroke-width", 1.8)
            .attr("stroke-dasharray", "5,4")
            .style("opacity", 0)
            .transition().duration(duration / 2).style("opacity", 0.7);

        annotG.append("text")
            .attr("class", "section6-avg-label")
            .attr("x", xPos + 6)
            .attr("y", 14)
            .attr("fill", palette.red)
            .style("font-size", "11px")
            .style("font-weight", "700")
            .style("font-family", '"Noticia Text", serif')
            .style("opacity", 0)
            .text(`avg ${data.overallAvg}d`)
            .transition().duration(duration / 2).style("opacity", 1);
    }

    function renderHistogram(t) {
        const hist = data.histogram;
        const colorScale = d3.scaleLinear()
            .domain([0, hist.length - 1])
            .range([palette.blue, palette.red]);

        const x = d3.scaleBand()
            .domain(hist.map(d => d.bin))
            .range([0, iW])
            .padding(0.14);

        const y = d3.scaleLinear()
            .domain([0, d3.max(hist, d => d.count) * 1.12])
            .range([iH, 0]);

        xAxisG.transition(t).call(d3.axisBottom(x).tickSize(0));
        styleAxis(xAxisG);
        yAxisG.transition(t).call(
            d3.axisLeft(y).ticks(5)
                .tickFormat(d => d >= 1000 ? `${(d / 1000).toFixed(0)}k` : d)
        );
        styleAxis(yAxisG);
        drawGridLeft(y);

        xLabel.transition(t).text("Days in Detention");
        yLabel.transition(t).text("Number of People");

        // bars
        const bars = barsG.selectAll(".section6-bar").data(hist, d => d.bin);
        bars.exit().transition(t).attr("height", 0).attr("y", iH).remove();
        bars.enter().append("rect")
            .attr("class", "section6-bar")
            .attr("x", d => x(d.bin) ?? 0)
            .attr("width", x.bandwidth())
            .attr("y", iH).attr("height", 0)
            .attr("rx", 5).attr("ry", 5)
            .merge(bars)
            .transition(t)
            .attr("x", d => x(d.bin) ?? 0)
            .attr("width", x.bandwidth())
            .attr("y", d => y(d.count))
            .attr("height", d => iH - y(d.count))
            .attr("fill", (_, i) => colorScale(i))
            .attr("opacity", 0.85);

        // value labels
        const vlbls = labelsG.selectAll(".section6-bar-label").data(hist, d => d.bin);
        vlbls.exit().transition(t).style("opacity", 0).remove();
        vlbls.enter().append("text")
            .attr("class", "section6-bar-label")
            .style("opacity", 0)
            .merge(vlbls)
            .transition(t)
            .attr("x", d => (x(d.bin) ?? 0) + x.bandwidth() / 2)
            .attr("y", d => y(d.count) - 6)
            .attr("text-anchor", "middle")
            .style("font-size", "11px").style("font-weight", "700")
            .style("font-family", '"Noticia Text", serif')
            .style("fill", "#2f271c").style("opacity", 1)
            .text(d => d.count >= 1000 ? `${(d.count / 1000).toFixed(0)}k` : d.count);

        labelsG.selectAll(".section6-n-label").transition(t).style("opacity", 0).remove();
        annotG.selectAll("*").remove();
    }

    function renderGender(t) {
        const gd = data.gender;
        const xMax = Math.ceil(d3.max(gd, d => d.avgDays) * 1.4 / 10) * 10;

        const x = d3.scaleLinear().domain([0, xMax]).range([0, iW]);
        const y = d3.scaleBand()
            .domain(gd.map(d => d.group))
            .range([iH * 0.2, iH * 0.72])
            .padding(0.35);

        xAxisG.transition(t).call(d3.axisBottom(x).ticks(6).tickFormat(d => `${d}d`));
        styleAxis(xAxisG);
        yAxisG.transition(t).call(d3.axisLeft(y).tickSize(0));
        styleAxis(yAxisG);
        yAxisG.selectAll(".tick text")
            .style("font-size", "14px")
            .style("font-weight", "700")
            .style("fill", "#2f271c")
            .attr("x", -10);
        drawGridBottom(x);

        xLabel.transition(t).text("Average Days in Detention");
        yLabel.transition(t).text("");

        const GENDER_COLORS = { "Male": palette.blue, "Female": palette.red };

        const bars = barsG.selectAll(".section6-bar").data(gd, d => d.group);
        bars.exit().transition(t).attr("width", 0).remove();
        bars.enter().append("rect")
            .attr("class", "section6-bar")
            .attr("y", d => y(d.group) ?? 0)
            .attr("height", y.bandwidth())
            .attr("x", 0).attr("width", 0)
            .attr("rx", 6).attr("ry", 6)
            .merge(bars)
            .transition(t)
            .attr("y", d => y(d.group) ?? 0)
            .attr("height", y.bandwidth())
            .attr("width", d => x(d.avgDays))
            .attr("fill", d => GENDER_COLORS[d.group] ?? palette.blue)
            .attr("opacity", 0.88);

        // avg-days labels
        const vlbls = labelsG.selectAll(".section6-bar-label").data(gd, d => d.group);
        vlbls.exit().transition(t).style("opacity", 0).remove();
        vlbls.enter().append("text")
            .attr("class", "section6-bar-label")
            .style("opacity", 0)
            .merge(vlbls).transition(t)
            .attr("x", d => x(d.avgDays) + 10)
            .attr("y", d => (y(d.group) ?? 0) + y.bandwidth() / 2 + 5)
            .style("font-size", "15px").style("font-weight", "700")
            .style("font-family", '"Noticia Text", serif')
            .style("fill", d => GENDER_COLORS[d.group] ?? palette.blue)
            .style("opacity", 1)
            .text(d => `${d.avgDays} days avg`);

        // n= sub-labels
        const nlbls = labelsG.selectAll(".section6-n-label").data(gd, d => d.group);
        nlbls.exit().transition(t).style("opacity", 0).remove();
        nlbls.enter().append("text")
            .attr("class", "section6-n-label")
            .style("opacity", 0)
            .merge(nlbls).transition(t)
            .attr("x", d => x(d.avgDays) + 10)
            .attr("y", d => (y(d.group) ?? 0) + y.bandwidth() / 2 + 22)
            .style("font-size", "11px")
            .style("font-family", '"Noticia Text", serif')
            .style("fill", "#7a7a70").style("opacity", 1)
            .text(d => `n = ${d3.format(",")(d.n)}`);

        drawAvgLine(x(data.overallAvg));
    }

    function renderEthnicity(t) {
        const ed = data.ethnicity; // sorted by avgDays desc
        const xMax = Math.ceil(d3.max(ed, d => d.avgDays) * 1.25 / 10) * 10;

        const x = d3.scaleLinear().domain([0, xMax]).range([0, iW]);
        const y = d3.scaleBand()
            .domain(ed.map(d => d.group))
            .range([0, iH])
            .padding(0.22);

        xAxisG.transition(t).call(d3.axisBottom(x).ticks(6).tickFormat(d => `${d}d`));
        styleAxis(xAxisG);
        yAxisG.transition(t).call(d3.axisLeft(y).tickSize(0));
        styleAxis(yAxisG);
        yAxisG.selectAll(".tick text")
            .style("font-size", "12px").style("font-weight", "600")
            .style("fill", "#2f271c").attr("x", -10);
        drawGridBottom(x);

        xLabel.transition(t).text("Average Days in Detention");
        yLabel.transition(t).text("");

        const colorScale = d3.scaleSequential()
            .domain([d3.min(ed, d => d.avgDays), d3.max(ed, d => d.avgDays)])
            .interpolator(d3.interpolateRgb(palette.yellow, palette.red));

        const bars = barsG.selectAll(".section6-bar").data(ed, d => d.group);
        bars.exit().transition(t).attr("width", 0).remove();
        bars.enter().append("rect")
            .attr("class", "section6-bar")
            .attr("y", d => y(d.group) ?? 0)
            .attr("height", y.bandwidth())
            .attr("x", 0).attr("width", 0)
            .attr("rx", 5).attr("ry", 5)
            .merge(bars)
            .transition(t)
            .attr("y", d => y(d.group) ?? 0)
            .attr("height", y.bandwidth())
            .attr("width", d => x(d.avgDays))
            .attr("fill", d => colorScale(d.avgDays))
            .attr("opacity", 0.88);

        const vlbls = labelsG.selectAll(".section6-bar-label").data(ed, d => d.group);
        vlbls.exit().transition(t).style("opacity", 0).remove();
        vlbls.enter().append("text")
            .attr("class", "section6-bar-label")
            .style("opacity", 0)
            .merge(vlbls).transition(t)
            .attr("x", d => x(d.avgDays) + 8)
            .attr("y", d => (y(d.group) ?? 0) + y.bandwidth() / 2 + 5)
            .style("font-size", "12px").style("font-weight", "700")
            .style("font-family", '"Noticia Text", serif')
            .style("fill", d => colorScale(d.avgDays))
            .style("opacity", 1)
            .text(d => `${d.avgDays}d`);

        labelsG.selectAll(".section6-n-label").transition(t).style("opacity", 0).remove();
        drawAvgLine(x(data.overallAvg));
    }

    function updateChart(stepIndex) {
        const step = STEPS_6[stepIndex];
        const t = svg.transition().duration(duration).ease(d3.easeCubicInOut);

        titleText.text(step.title);
        subtitleText.text(step.subtitle);
        wrapSvgText6(titleText, 700, 1.15);
        wrapSvgText6(subtitleText, 700, 1.35);

        if (stepIndex === 0) renderHistogram(t);
        else if (stepIndex === 1) renderGender(t);
        else renderEthnicity(t);

        d3.selectAll("[data-section6-step]")
            .classed("is-active", (_, i) => i === stepIndex);
    }

    const stepNodes = d3.selectAll("[data-section6-step]").nodes();
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const idx = Number(entry.target.getAttribute("data-section6-step"));
            if (!Number.isNaN(idx)) updateChart(idx);
        });
    }, { root: null, threshold: 0.55 });

    stepNodes.forEach(node => observer.observe(node));
    updateChart(0);
}

function buildSection6Structure(section) {
    let layout = section.select("[data-section6-layout]");
    if (layout.empty()) {
        layout = section.append("div")
            .attr("class", "section6-layout")
            .attr("data-section6-layout", "");

        layout.append("div")
            .attr("class", "section6-copy")
            .attr("data-section6-copy", "");

        layout.append("div")
            .attr("class", "section6-vis")
            .append("div")
            .attr("class", "section6-chart-wrap")
            .attr("data-section6-chart", "");
    }
    return {
        layout,
        copyHost:  section.select("[data-section6-copy]"),
        chartHost: section.select("[data-section6-chart]")
    };
}

function syncSection6Narrative(copyHost, steps) {
    const articles = copyHost.selectAll(".section6-step")
        .data(steps, d => d.key);
    articles.exit().remove();

    const entered = articles.enter()
        .append("article")
        .attr("class", "section6-step")
        .attr("data-section6-step", (_, i) => i);
    entered.append("h3");
    entered.append("p").attr("class", "section6-body");

    const merged = entered.merge(articles)
        .attr("data-section6-step", (_, i) => i);
    merged.select("h3").text(d => d.title);
    merged.select(".section6-body").text(d => d.subtitle);
}

function wrapSvgText6(selection, maxWidth, lineHeight = 1.2) {
    selection.each(function () {
        const text   = d3.select(this);
        const words  = (text.text() || "").split(/\s+/).filter(Boolean);
        const x      = text.attr("x") || 0;
        const y      = Number(text.attr("y") || 0);
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