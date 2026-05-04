export function runSection7(allData) {
    const section = d3.select("#section-7");
    if (section.empty() || !Array.isArray(allData) || allData.length === 0) {
        return;
    }

    const yearlyData = summarizeByYear(allData);
    if (yearlyData.length === 0) {
        return;
    }

    const rootStyles = getComputedStyle(d3.select(":root").node());
    const palette = {
        // terror: rootStyles.getPropertyValue("--main-red").trim() || "#be2c2c",
        terror: rootStyles.getPropertyValue("--main-red").trim(),
        gang: "#dd7c21",
        felon: "#d3a316",
        crime: "#8b8b86",
        noFlags: "#2e8b57"
    };

    const averageCrimeMissing = d3.mean(yearlyData, d => d.crimeMissingPct) ?? 0;
    const steps = [
        {
            key: "terrorPct",
            color: palette.terror,
            yMax: 2,
            title: "Are detainees primarily linked to national security threats?",
            subtitle: "The terrorism flag barely appears in the detention records.",
            annotation: "Almost none of the yearly bars even approach 1%.",
            emphasis: "solid"
        },
        {
            key: "gangPct",
            color: palette.terror,
            yMax: 4,
            title: "If not terrorism, what about gang-related risk?",
            subtitle: "Gang suspicion is larger, but it still remains a small slice.",
            annotation: "Even at its highest point, the share stays close to 2%.",
            emphasis: "solid"
        },
        {
            key: "felonPct",
            color: palette.terror,
            yMax: 6,
            title: "What about serious criminal history?",
            subtitle: "Using the felon field, the bars grow, but they still do not dominate.",
            annotation: "This is the first noticeable jump, yet it remains a small minority.",
            emphasis: "solid"
        },
        {
            key: "crimePct",
            color: palette.crime,
            yMax: 40,
            title: "Even under a broader crime measure, the story stays incomplete.",
            subtitle: "The broader crime classification rises, but the field is heavily missing.",
            annotation: `Crime classification is missing for about ${Math.round(averageCrimeMissing)}% of entries.`,
            emphasis: "uncertain"
        },
        {
            key: "noFlagsPct",
            color: palette.noFlags,
            yMax: 100,
            title: "Most detainees have no recorded criminal or security flags.",
            subtitle: "After peeling back each assumption, the largest group is the residual with no recorded flags.",
            annotation: "This is the majority group in every year shown.",
            emphasis: "solid"
        }
    ];

    const structure = buildSection7Markup(section);
    syncNarrative(structure.copyHost, steps);
    structure.chartHost.selectAll("*").remove();

    const width = 980;
    const height = 700;
    const margin = { top: 190, right: 60, bottom: 80, left: 90 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = structure.chartHost
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr("aria-label", "Animated bar chart showing the yearly share of ICE detainees across five recorded risk categories.");

    const title = svg.append("text")
        .attr("class", "section7-title")
        .attr("x", margin.left)
        .attr("y", 42);

    const subtitle = svg.append("text")
        .attr("class", "section7-subtitle")
        .attr("x", margin.left)
        .attr("y", 100);

    const annotationGroup = svg.append("g")
        .attr("class", "section7-annotation")
        .attr("transform", `translate(${margin.left}, 138)`);

    annotationGroup.append("rect")
        .attr("width", 400)
        .attr("height", 36)
        .attr("rx", 18)
        .attr("ry", 18);

    const annotation = annotationGroup.append("text")
        .attr("x", 20)
        .attr("y", 23);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand()
        .domain(yearlyData.map(d => d.year))
        .range([0, innerWidth])
        .padding(0.24);

    const yScale = d3.scaleLinear()
        .domain([0, steps[0].yMax])
        .range([innerHeight, 0]);

    const grid = chart.append("g")
        .attr("class", "section7-grid");

    const yAxisGroup = chart.append("g")
        .attr("class", "section7-y-axis");

    const xAxisGroup = chart.append("g")
        .attr("class", "section7-x-axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickSize(0));

    xAxisGroup.select(".domain").remove();

    chart.append("text")
        .attr("class", "section7-axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 54)
        .attr("text-anchor", "middle")
        .text("Year");

    chart.append("text")
        .attr("class", "section7-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -58)
        .attr("text-anchor", "middle")
        .text("Share of detainees");

    const bars = chart.selectAll(".section7-bar")
        .data(yearlyData)
        .enter()
        .append("rect")
        .attr("class", "section7-bar")
        .attr("x", d => xScale(d.year))
        .attr("width", xScale.bandwidth())
        .attr("y", innerHeight)
        .attr("height", 0)
        .attr("rx", 10)
        .attr("ry", 10);

    const labels = chart.selectAll(".section7-value")
        .data(yearlyData)
        .enter()
        .append("text")
        .attr("class", "section7-value")
        .attr("x", d => (xScale(d.year) ?? 0) + xScale.bandwidth() / 2)
        .attr("y", innerHeight - 8)
        .attr("text-anchor", "middle")
        .style("opacity", 0);

    const stepNodes = structure.copyHost.selectAll("[data-section7-step]").nodes();
    const duration = 900;

    function updateChart(stepIndex) {
        const step = steps[stepIndex];
        const transition = svg.transition().duration(duration).ease(d3.easeCubicInOut);

        yScale.domain([0, step.yMax]);

        title.text(step.title);
        subtitle.text(step.subtitle);
        annotation.text(step.annotation);
        wrapSvgText(title, 680, 1.15);
        wrapSvgText(subtitle, 680, 1.35);
        wrapSvgText(annotation, 420, 1.25);

        const annotationBox = annotation.node()?.getBBox();
        const annotationWidth = annotationBox ? annotationBox.width + 40 : 440;
        const annotationHeight = annotationBox ? annotationBox.height + 22 : 36;

        annotationGroup.select("rect")
            .transition(transition)
            .attr("width", annotationWidth)
            .attr("height", annotationHeight)
            .attr("y", annotationBox ? annotationBox.y - 11 : 0)
            .attr("fill", d3.color(step.color)?.copy({ opacity: 0.12 }) ?? "rgba(0,0,0,0.08)")
            .attr("stroke", step.color)
            .attr("stroke-dasharray", step.emphasis === "uncertain" ? "8 6" : null);

        const yAxis = d3.axisLeft(yScale)
            .ticks(step.yMax <= 6 ? step.yMax : 5)
            .tickFormat(d => `${d}%`);

        yAxisGroup
            .transition(transition)
            .call(yAxis);

        yAxisGroup.select(".domain").remove();
        yAxisGroup.selectAll(".tick line").remove();

        grid.transition(transition).call(
            d3.axisLeft(yScale)
                .ticks(step.yMax <= 6 ? step.yMax : 5)
                .tickSize(-innerWidth)
                .tickFormat("")
        );

        grid.select(".domain").remove();

        bars
            .transition(transition)
            .attr("y", d => yScale(d[step.key]))
            .attr("height", d => innerHeight - yScale(d[step.key]))
            .attr("fill", step.color)
            .attr("opacity", step.emphasis === "uncertain" ? 0.72 : 0.92)
            .attr("stroke", step.emphasis === "uncertain" ? step.color : "none")
            .attr("stroke-width", step.emphasis === "uncertain" ? 2 : 0)
            .attr("stroke-dasharray", step.emphasis === "uncertain" ? "8 5" : null);

        labels
            .text(d => `${d[step.key].toFixed(1)}%`)
            .transition(transition)
            .attr("y", d => yScale(d[step.key]) - 10)
            .style("fill", step.color)
            .style("opacity", 1);

        structure.copyHost.selectAll("[data-section7-step]")
            .classed("is-active", (_, index) => index === stepIndex);
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            }

            const stepIndex = Number(entry.target.getAttribute("data-section7-step"));
            if (!Number.isNaN(stepIndex)) {
                updateChart(stepIndex);
            }
        });
    }, {
        root: null,
        threshold: 0.55
    });

    stepNodes.forEach(node => observer.observe(node));
    updateChart(0);
}

function summarizeByYear(rows) {
    const grouped = d3.group(
        rows.filter(d => d.year !== undefined && d.year !== null && `${d.year}`.trim() !== ""),
        d => `${d.year}`.trim()
    );

    return Array.from(grouped, ([year, values]) => {
        const total = values.length || 1;
        const terrorCount = values.filter(d => normalizeFlag(d.known_terrorist_yes_no)).length;
        const gangCount = values.filter(d => normalizeFlag(d.suspected_gang_yes_no)).length;
        const felonCount = values.filter(d => isFelonFlag(d.felon)).length;
        const crimeCount = values.filter(d => isCrimeFlag(d.msc_crime_class)).length;
        const crimeMissingCount = values.filter(d => `${d.msc_crime_class ?? ""}`.trim() === "").length;
        const noFlagsCount = values.filter(d => {
            const crimeValue = `${d.msc_crime_class ?? ""}`.trim();
            return !normalizeFlag(d.known_terrorist_yes_no)
                && !normalizeFlag(d.suspected_gang_yes_no)
                && !isFelonFlag(d.felon)
                && (crimeValue === "" || crimeValue === "Not Applicable");
        }).length;

        return {
            year,
            terrorPct: (terrorCount / total) * 100,
            gangPct: (gangCount / total) * 100,
            felonPct: (felonCount / total) * 100,
            crimePct: (crimeCount / total) * 100,
            crimeMissingPct: (crimeMissingCount / total) * 100,
            noFlagsPct: (noFlagsCount / total) * 100
        };
    }).sort((a, b) => Number(a.year) - Number(b.year));
}

function normalizeFlag(value) {
    return `${value ?? ""}`.trim().toUpperCase() === "YES";
}

function isFelonFlag(value) {
    const normalized = `${value ?? ""}`.trim();
    return normalized !== "" && normalized !== "Not an Aggravated Felon";
}

function isCrimeFlag(value) {
    const normalized = `${value ?? ""}`.trim();
    return normalized !== "" && normalized !== "Not Applicable";
}

function buildSection7Markup(section) {
    let layout = section.select("[data-section7-layout]");
    if (layout.empty()) {
        layout = section.append("div")
            .attr("class", "section7-layout")
            .attr("data-section7-layout", "");

        layout.append("div")
            .attr("class", "section7-copy")
            .attr("data-section7-copy", "");

        layout.append("div")
            .attr("class", "section7-vis")
            .append("div")
            .attr("class", "section7-chart-wrap")
            .attr("data-section7-chart", "");
    }

    return {
        layout,
        copyHost: section.select("[data-section7-copy]"),
        chartHost: section.select("[data-section7-chart]")
    };
}

function syncNarrative(copyHost, steps) {
    const articles = copyHost.selectAll(".section7-step")
        .data(steps, d => d.key);

    articles.exit().remove();

    const entered = articles.enter()
        .append("article")
        .attr("class", "section7-step")
        .attr("data-section7-step", (_, index) => index);

    entered.append("h3");

    entered.append("p")
        .attr("class", "section7-body");

    const merged = entered.merge(articles)
        .attr("data-section7-step", (_, index) => index);

    merged.select("h3")
        .text(d => d.title);

    merged.select(".section7-body")
        .text(d => d.subtitle);
}

function wrapSvgText(selection, width, lineHeight = 1.2) {
    selection.each(function () {
        const text = d3.select(this);
        const words = (text.text() || "").split(/\s+/).filter(Boolean);
        const x = text.attr("x") || 0;
        const y = Number(text.attr("y") || 0);
        const textAnchor = text.attr("text-anchor") || "start";

        text.text("");

        let line = [];
        let lineNumber = 0;
        let tspan = text.append("tspan")
            .attr("x", x)
            .attr("y", y)
            .attr("text-anchor", textAnchor)
            .attr("dy", "0em");

        words.forEach(word => {
            line.push(word);
            tspan.text(line.join(" "));

            if (tspan.node()?.getComputedTextLength() > width && line.length > 1) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                lineNumber += 1;
                tspan = text.append("tspan")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("text-anchor", textAnchor)
                    .attr("dy", `${lineNumber * lineHeight}em`)
                    .text(word);
            }
        });
    });
}
