export function runSection5(rows) {
    const section = d3.select("#section-5");
    if (section.empty() || !Array.isArray(rows) || rows.length === 0) {
        return;
    }

    const outcomeData = aggregateCaseStatusOutcomes(rows);
    if (outcomeData.length === 0) {
        return;
    }

    const structure = buildSection5Markup(section);
    const steps = buildNarrativeSteps();
    syncNarrative(structure.copyHost, steps);
    renderDonutChart(structure.chartHost, structure.tooltipHost, outcomeData, steps);
}

const OUTCOME_ORDER = [
    "Removed / Deported",
    "Voluntary Departure",
    "Relief Granted / Allowed to Stay",
    "Case Terminated / Dropped",
    "Still Active / In System",
    "Other"
];

const OUTCOME_COLORS = new Map([
    ["Removed / Deported", "#be2c2c"],
    ["Voluntary Departure", "#d4b146"],
    ["Relief Granted / Allowed to Stay", "#2e8b57"],
    ["Case Terminated / Dropped", "#5b85aa"],
    ["Still Active / In System", "#7c5ea8"],
    ["Other", "#8b8b86"]
]);

// Maps raw case_status values into readable outcome groups for the story.
export function mapCaseStatusToOutcome(rawStatus) {
    const status = `${rawStatus ?? ""}`.trim();

    switch (status) {
        case "5-Title 50 Expulsion":
        case "6-Deported/Removed - Deportability":
        case "8-Excluded/Deported/Removed":
        case "8-Excluded/Removed - Inadmissibility":
            return "Removed / Deported";

        case "3-Voluntary Departure Confirmed":
        case "9-VR Witnessed":
            return "Voluntary Departure";

        case "B-Relief Granted":
        case "L-Legalization - Permanent Residence Granted":
        case "Z-SAW - Permanent Residence Granted":
            return "Relief Granted / Allowed to Stay";

        case "A-Proceedings Terminated":
        case "E-Charging Document Canceled by ICE":
        case "0-Withdrawal Permitted - I-275 Issued":
            return "Case Terminated / Dropped";

        case "ACTIVE":
            return "Still Active / In System";

        case "7-Died":
        default:
            return "Other";
    }
}

// Aggregates detention stays into outcome counts and percentages.
export function aggregateCaseStatusOutcomes(rows) {
    const counts = new Map(OUTCOME_ORDER.map(label => [label, 0]));

    rows.forEach(row => {
        const outcome = mapCaseStatusToOutcome(row.case_status);
        counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
    });

    const total = d3.sum(Array.from(counts.values()));
    if (!total) {
        return [];
    }

    return OUTCOME_ORDER.map(label => ({
        label,
        count: counts.get(label) ?? 0,
        percent: ((counts.get(label) ?? 0) / total) * 100,
        color: OUTCOME_COLORS.get(label) ?? "#8b8b86"
    }));
}

// Renders the interactive donut and connects hover + scroll reveal behavior.
function renderDonutChart(chartHost, tooltipHost, outcomeData, steps) {
    chartHost.selectAll("*").remove();
    tooltipHost.selectAll("*").remove();

    const width = 900;
    const height = 820;
    const radius = 230;
    const innerRadius = 132;
    const formatCount = d3.format(",");
    const formatPct = d => `${d.toFixed(1)}%`;

    const svg = chartHost
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr("aria-label", "Interactive donut chart showing ICE detention case outcomes by share of detention stays.");

    svg.append("text")
        .attr("class", "section5-title")
        .attr("x", width / 2)
        .attr("y", 54)
        .attr("text-anchor", "middle")
        .text("Case Outcomes After ICE Detention");

    svg.append("text")
        .attr("class", "section5-subtitle")
        .attr("x", width / 2)
        .attr("y", 88)
        .attr("text-anchor", "middle")
        .text("Each arc is a share of all detention stays in the records.");

    const chart = svg.append("g")
        .attr("transform", `translate(${width / 2},350)`);

    const pie = d3.pie()
        .sort(null)
        .value(d => d.count);

    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(radius)
        .padAngle(0.012)
        .cornerRadius(5);

    const hoverArc = d3.arc()
        .innerRadius(innerRadius - 3)
        .outerRadius(radius + 12)
        .padAngle(0.012)
        .cornerRadius(6);

    const arcs = pie(outcomeData);

    // Neutral track keeps the full population visible before every outcome is revealed.
    chart.append("circle")
        .attr("r", (innerRadius + radius) / 2)
        .attr("fill", "none")
        .attr("stroke", "rgba(47, 39, 28, 0.12)")
        .attr("stroke-width", radius - innerRadius);

    const slices = chart.selectAll(".section5-slice")
        .data(arcs, d => d.data.label)
        .enter()
        .append("path")
        .attr("class", "section5-slice")
        .attr("fill", d => d.data.color)
        .attr("stroke", "#f0efef")
        .attr("stroke-width", 2)
        .attr("d", d => arc({ ...d, endAngle: d.startAngle }))
        .style("opacity", 0)
        .each(function (d) {
            this._current = { ...d, endAngle: d.startAngle };
        });

    const center = chart.append("g")
        .attr("class", "section5-center");

    center.append("text")
        .attr("class", "section5-center-label")
        .attr("text-anchor", "middle")
        .attr("y", -14)
        .text("All Detention Stays");

    center.append("text")
        .attr("class", "section5-center-value")
        .attr("text-anchor", "middle")
        .attr("y", 34)
        .text(formatCount(d3.sum(outcomeData, d => d.count)));

    const legend = svg.append("g")
        .attr("class", "section5-legend")
        .attr("transform", `translate(${width / 2 - 350},690)`);

    const legendItems = legend.selectAll(".section5-legend-item")
        .data(outcomeData, d => d.label)
        .enter()
        .append("g")
        .attr("class", "section5-legend-item")
        .attr("transform", (_, i) => `translate(${(i % 3) * 250},${Math.floor(i / 3) * 34})`);

    legendItems.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("rx", 3)
        .attr("fill", d => d.color);

    legendItems.append("text")
        .attr("x", 22)
        .attr("y", 12)
        .text(d => d.label);

    const tooltip = tooltipHost.append("div")
        .attr("class", "section5-tooltip");

    slices
        .on("mouseenter", function (event, d) {
            d3.select(this)
                .transition()
                .duration(180)
                .attr("d", hoverArc(d));

            updateCenterText(d.data.label, formatPct(d.data.percent));
            showTooltip(event, d.data);
        })
        .on("mousemove", function (event, d) {
            showTooltip(event, d.data);
        })
        .on("mouseleave", function () {
            d3.select(this)
                .transition()
                .duration(180)
                .attr("d", arc);

            tooltip.style("opacity", 0);
            updateCenterForStep(currentStep);
        });

    let currentStep = 0;

    function updateCenterText(label, value) {
        center.select(".section5-center-label").text(label);
        center.select(".section5-center-value").text(value);
    }

    function updateCenterForStep(stepIndex) {
        const step = steps[stepIndex] ?? steps[0];
        updateCenterText(step.centerLabel, step.centerValue(outcomeData));
    }

    function showTooltip(event, datum) {
        const bounds = chartHost.node().getBoundingClientRect();
        tooltip
            .style("opacity", 1)
            .style("left", `${event.clientX - bounds.left + 14}px`)
            .style("top", `${event.clientY - bounds.top + 14}px`)
            .html(`
                <strong>${datum.label}</strong>
                <span>${formatCount(datum.count)} stays</span>
                <span>${formatPct(datum.percent)} of total</span>
            `);
    }

    // Reveals slices cumulatively as the reader scrolls through the narrative.
    function updateRevealSlices(stepIndex) {
        currentStep = stepIndex;
        const revealThrough = steps[stepIndex]?.revealThrough ?? 0;
        const visibleLabels = new Set(OUTCOME_ORDER.slice(0, revealThrough + 1));

        slices
            .transition()
            .duration(900)
            .ease(d3.easeCubicInOut)
            .style("opacity", d => visibleLabels.has(d.data.label) ? 0.94 : 0)
            .attrTween("d", function (d) {
                const target = visibleLabels.has(d.data.label)
                    ? d
                    : { ...d, endAngle: d.startAngle };
                const interpolate = d3.interpolate(this._current, target);
                this._current = target;
                return t => arc(interpolate(t));
            });

        legendItems
            .transition()
            .duration(450)
            .style("opacity", d => visibleLabels.has(d.label) ? 1 : 0.28);

        d3.selectAll("[data-section5-step]")
            .classed("is-active", (_, index) => index === stepIndex);

        updateCenterForStep(stepIndex);
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            }

            const stepIndex = Number(entry.target.getAttribute("data-section5-step"));
            if (!Number.isNaN(stepIndex)) {
                updateRevealSlices(stepIndex);
            }
        });
    }, {
        threshold: 0.55
    });

    d3.selectAll("[data-section5-step]").nodes().forEach(node => observer.observe(node));
    updateRevealSlices(0);
}

// Updates/reveals slices based on the scroll step by setting revealThrough.
function buildNarrativeSteps() {
    return [
        {
            title: "Detention is often assumed to lead directly to deportation.",
            body: "We begin with the outcome most often imagined when ICE detention is discussed.",
            centerLabel: "Removed / Deported",
            centerValue: data => formatOutcomePercent(data, "Removed / Deported"),
            revealThrough: 0
        },
        {
            title: "Some people leave through voluntary departure.",
            body: "This is still a departure from the United States, but it is recorded differently from removal or deportation.",
            centerLabel: "Voluntary Departure",
            centerValue: data => formatOutcomePercent(data, "Voluntary Departure"),
            revealThrough: 1
        },
        {
            title: "Some receive relief or permission to stay.",
            body: "The records also include outcomes where people are granted relief or permanent residence.",
            centerLabel: "Relief Granted",
            centerValue: data => formatOutcomePercent(data, "Relief Granted / Allowed to Stay"),
            revealThrough: 2
        },
        {
            title: "Some cases are terminated, canceled, or dropped.",
            body: "A detention stay can end with the government withdrawing, canceling, or terminating the case pathway.",
            centerLabel: "Cases Dropped",
            centerValue: data => formatOutcomePercent(data, "Case Terminated / Dropped"),
            revealThrough: 3
        },
        {
            title: "Many people are still active in the system.",
            body: "For these stays, the case is unresolved in the available records rather than finalized as a removal.",
            centerLabel: "Still Active",
            centerValue: data => formatOutcomePercent(data, "Still Active / In System"),
            revealThrough: 4
        },
        {
            title: "Detention does not necessarily mean deportation.",
            body: "ICE detention leads to many different legal outcomes, including unresolved cases.",
            centerLabel: "Multiple Outcomes",
            centerValue: () => "not one path",
            revealThrough: 5
        }
    ];
}

function formatOutcomePercent(data, label) {
    const match = data.find(d => d.label === label);
    return match ? `${match.percent.toFixed(1)}%` : "0.0%";
}

function buildSection5Markup(section) {
    let layout = section.select("[data-section5-layout]");
    if (layout.empty()) {
        layout = section.append("div")
            .attr("class", "section5-layout")
            .attr("data-section5-layout", "");

        layout.append("div")
            .attr("class", "section5-copy")
            .attr("data-section5-copy", "");

        const vis = layout.append("div")
            .attr("class", "section5-vis");

        vis.append("div")
            .attr("class", "section5-chart-wrap")
            .attr("data-section5-chart", "");

        vis.append("div")
            .attr("class", "section5-tooltip-host")
            .attr("data-section5-tooltip", "");
    }

    return {
        copyHost: section.select("[data-section5-copy]"),
        chartHost: section.select("[data-section5-chart]"),
        tooltipHost: section.select("[data-section5-tooltip]")
    };
}

function syncNarrative(copyHost, steps) {
    const articles = copyHost.selectAll(".section5-step")
        .data(steps);

    articles.exit().remove();

    const entered = articles.enter()
        .append("article")
        .attr("class", "section5-step")
        .attr("data-section5-step", (_, index) => index);

    entered.append("h3");

    entered.append("p")
        .attr("class", "section5-body");

    const merged = entered.merge(articles)
        .attr("data-section5-step", (_, index) => index);

    merged.select("h3")
        .text(d => d.title);

    merged.select(".section5-body")
        .text(d => d.body);
}
