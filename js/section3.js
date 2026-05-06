export function runSection3(trumpData, worldGeoJson) {
    const section = d3.select("#section-3");
    if (section.empty() || !Array.isArray(trumpData) || trumpData.length === 0 || !worldGeoJson?.features) {
        return;
    }

    const structure = buildSection3Markup(section);
    const normalizedFeatures = worldGeoJson.features.map(feature => ({
        ...feature,
        properties: {
            ...feature.properties,
            __normName: normalizeCountryName(feature.properties?.name ?? "")
        }
    }));

    const geo = {
        type: "FeatureCollection",
        features: normalizedFeatures
    };

    const monthKeys = buildMonthKeys(new Date("2025-02-01"), new Date("2026-03-01"));
    if (monthKeys.length === 0) {
        return;
    }

    const baseMonthKey = monthKeys[0];
    const formatMonthLabel = d3.timeFormat("%b %Y");
    const countryLookup = buildCountryLookup(geo.features);
    const normToDisplay = buildNormToDisplayName(geo.features);
    const byMonthBirth = summarizeCountryCountsByMonth(trumpData, "birth_country", monthKeys, countryLookup);
    const byMonthCitizenship = summarizeCountryCountsByMonth(trumpData, "citizenship_country", monthKeys, countryLookup);
    const mismatchByMonth = summarizeMismatchFlowsByMonth(trumpData, monthKeys, countryLookup);

    syncNarrative(structure.copyHost);

    const width = 1080;
    const height = 700;
    const mapMargin = { top: 120, right: 24, bottom: 30, left: 24 };
    const innerWidth = width - mapMargin.left - mapMargin.right;
    const innerHeight = height - mapMargin.top - mapMargin.bottom;

    structure.chartHost.selectAll("svg").remove();

    const tooltipHost = structure.tooltipHost;
    tooltipHost.selectAll("*").remove();
    const tooltip = tooltipHost.append("div").attr("class", "section3-tooltip");
    const formatCount = d3.format(",");

    function displayCountry(norm) {
        if (!norm || norm === "__unknown") {
            return "Unknown";
        }
        return normToDisplay.get(norm) ?? titleCaseNorm(norm);
    }

    function hideTooltip() {
        tooltip.style("opacity", 0);
    }

    function positionTooltip(event) {
        const bounds = structure.chartHost.node()?.getBoundingClientRect();
        if (!bounds) {
            return;
        }
        tooltip
            .style("opacity", 1)
            .style("left", `${event.clientX - bounds.left + 14}px`)
            .style("top", `${event.clientY - bounds.top + 14}px`);
    }

    const svg = structure.chartHost
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr("aria-label", "Scroll-driven world map of detainee birth country, citizenship country, and mismatch routes to departure country.");

    const projection = d3.geoNaturalEarth1();
    projection.fitExtent(
        [
            [mapMargin.left, mapMargin.top],
            [mapMargin.left + innerWidth, mapMargin.top + innerHeight]
        ],
        geo
    );

    const path = d3.geoPath(projection);
    const centroids = new Map(
        geo.features.map(feature => {
            const centroid = path.centroid(feature);
            return [feature.properties.__normName, centroid];
        })
    );

    const title = svg.append("text")
        .attr("class", "section3-title")
        .attr("x", mapMargin.left)
        .attr("y", 44);

    const subtitle = svg.append("text")
        .attr("class", "section3-subtitle")
        .attr("x", mapMargin.left)
        .attr("y", 82);

    const uiGroup = svg.append("g")
        .attr("class", "section3-ui")
        .attr("transform", `translate(${mapMargin.left}, 94)`);

    const yearValue = uiGroup.append("text")
        .attr("class", "section3-year-value")
        .attr("x", 0)
        .attr("y", 22)
        .text(formatMonthLabel(new Date(`${baseMonthKey}-01T00:00:00`)));

    const sliderHost = structure.controlsHost.selectAll(".section3-slider-shell")
        .data([null])
        .join("div")
        .attr("class", "section3-slider-shell");

    sliderHost.selectAll("*").remove();

    sliderHost.append("label")
        .attr("class", "section3-slider-label")
        .attr("for", "section3-year-slider")
        .text("Slide through different dates");

    const slider = sliderHost.append("input")
        .attr("id", "section3-year-slider")
        .attr("class", "section3-slider")
        .attr("type", "range")
        .attr("min", 0)
        .attr("max", monthKeys.length - 1)
        .attr("step", 1)
        .property("value", 0);

    const sliderValue = sliderHost.append("div")
        .attr("class", "section3-slider-value")
        .text(formatMonthLabel(new Date(`${baseMonthKey}-01T00:00:00`)));

    const mapLayer = svg.append("g").attr("class", "section3-map-layer");
    const flowLayer = svg.append("g").attr("class", "section3-flow-layer");

    const countries = mapLayer.selectAll(".section3-country")
        .data(geo.features)
        .enter()
        .append("path")
        .attr("class", "section3-country")
        .attr("d", path);

    countries
        .on("mouseenter mousemove", function (event, d) {
            if (activeStep === 2) {
                return;
            }
            const currentMonthKey = monthKeys[activeYearIndex];
            const map = activeStep === 0
                ? byMonthBirth.get(currentMonthKey) ?? new Map()
                : byMonthCitizenship.get(currentMonthKey) ?? new Map();
            const norm = d.properties.__normName;
            const count = map.get(norm) ?? 0;
            const name = displayCountry(norm);
            tooltip.html(`
                <strong>${escapeHtml(name)}</strong>
                <span>${formatCount(count)} detainee${count === 1 ? "" : "s"}</span>
            `);
            positionTooltip(event);
        })
        .on("mouseleave", hideTooltip);

    const maxHeatCount = d3.max([
        d3.max(Array.from(byMonthBirth.values()), v => d3.max(v.values())),
        d3.max(Array.from(byMonthCitizenship.values()), v => d3.max(v.values()))
    ]) ?? 0;

    const heatInputScale = d3.scaleSqrt()
        .domain([0, Math.max(1, maxHeatCount)])
        .range([0, 1]);

    const heatInterpolator = d3.interpolateRgbBasis(["#f4d7cc", "#e69a82", "#d65b45", "#be2c2c"]);

    const legend = svg.append("g")
        .attr("class", "section3-legend")
        .attr("transform", `translate(${width - 315}, ${height - 54})`);

    const legendId = "section3-heat-gradient";
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", legendId)
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

    gradient.selectAll("stop")
        .data(d3.range(0, 1.01, 0.1))
        .enter()
        .append("stop")
        .attr("offset", d => `${d * 100}%`)
        .attr("stop-color", d => heatInterpolator(d));

    legend.append("text")
        .attr("class", "section3-legend-label")
        .attr("x", 0)
        .attr("y", -8)
        .text("Heat scale (detainee count)");

    legend.append("rect")
        .attr("class", "section3-legend-bar")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 240)
        .attr("height", 12)
        .attr("rx", 6)
        .attr("ry", 6)
        .attr("fill", `url(#${legendId})`);

    const legendScale = d3.scaleLinear()
        .domain([0, Math.max(1, maxHeatCount)])
        .range([0, 240]);

    const legendAxis = d3.axisBottom(legendScale)
        .tickValues([0, Math.round(maxHeatCount * 0.15), Math.round(maxHeatCount * 0.45), Math.round(maxHeatCount * 0.75), Math.max(1, Math.round(maxHeatCount))])
        .tickFormat(d3.format(","));

    legend.append("g")
        .attr("class", "section3-legend-axis")
        .attr("transform", "translate(0,12)")
        .call(legendAxis);

    const flowWidthScale = d3.scaleSqrt()
        .domain([1, d3.max(Array.from(mismatchByMonth.values()), flows => d3.max(flows, d => d.count)) ?? 1])
        .range([0.7, 4.8]);

    const stepConfig = [
        {
            title: "Where are detainees originally from?",
            metric: "birth",
            showFlows: false
        },
        {
            title: "How does citizenship-based geography compare?",
            metric: "citizenship",
            showFlows: false
        },
        {
            title: "Where do nationality and departure diverge?",
            metric: "citizenship",
            showFlows: true
        }
    ];

    const stepNodes = structure.copyHost.selectAll("[data-section3-step]").nodes();
    let activeStep = 0;
    let activeYearIndex = 0;
    let prevStepForTooltip = 0;

    function update() {
        const currentMonthKey = monthKeys[activeYearIndex];
        const currentMonthDate = new Date(`${currentMonthKey}-01T00:00:00`);
        const step = stepConfig[activeStep];
        yearValue.text(formatMonthLabel(currentMonthDate));
        sliderValue.text(formatMonthLabel(currentMonthDate));

        title.text(step.title);
        wrapSvgText(title, 760, 1.12);
        wrapSvgText(subtitle, 760, 1.25);

        const activeMap = step.metric === "birth"
            ? byMonthBirth.get(currentMonthKey) ?? new Map()
            : byMonthCitizenship.get(currentMonthKey) ?? new Map();

        countries
            .transition()
            .duration(650)
            .ease(d3.easeCubicInOut)
            .attr("fill", d => {
                const count = activeMap.get(d.properties.__normName) ?? 0;
                return count > 0 ? heatInterpolator(heatInputScale(count)) : "#efefeb";
            });

        const flowData = step.showFlows ? (mismatchByMonth.get(currentMonthKey) ?? []) : [];

        const flowJoin = flowLayer.selectAll("g.section3-flow-group")
            .data(flowData, d => `${d.from}->${d.to}`);

        flowJoin.exit()
            .transition()
            .duration(260)
            .style("opacity", 0)
            .remove();

        const flowEnter = flowJoin.enter()
            .append("g")
            .attr("class", "section3-flow-group");

        flowEnter.append("path")
            .attr("class", "section3-flow")
            .attr("fill", "none")
            .attr("stroke-linecap", "round")
            .attr("pointer-events", "none")
            .attr("d", d => buildArcPath(centroids.get(d.from), centroids.get(d.to)))
            .style("opacity", 0);

        flowEnter.append("path")
            .attr("class", "section3-flow-hit")
            .attr("fill", "none")
            .attr("stroke", "rgba(0,0,0,0.01)")
            .attr("stroke-width", 16)
            .attr("stroke-linecap", "round")
            .attr("d", d => buildArcPath(centroids.get(d.from), centroids.get(d.to)))
            .style("opacity", 0);

        const flowMerged = flowEnter.merge(flowJoin);

        flowMerged.select(".section3-flow")
            .transition()
            .duration(700)
            .ease(d3.easeCubicInOut)
            .attr("stroke-width", d => flowWidthScale(d.count))
            .attr("d", d => buildArcPath(centroids.get(d.from), centroids.get(d.to)))
            .style("opacity", step.showFlows ? 0.72 : 0);

        flowMerged.select(".section3-flow-hit")
            .on("mouseenter mousemove", function (event, d) {
                if (!step.showFlows) {
                    return;
                }
                const cit = escapeHtml(displayCountry(d.from));
                const dep = escapeHtml(displayCountry(d.to));
                const rows = d.birthBreakdown ?? [];
                let birthLine;
                if (rows.length === 0) {
                    birthLine = "Unknown";
                } else if (rows.length === 1 && rows[0].n === d.count) {
                    birthLine = escapeHtml(displayCountry(rows[0].birth));
                } else if (rows.length <= 4) {
                    birthLine = rows.map(({ birth, n }) =>
                        `${escapeHtml(displayCountry(birth))} (${formatCount(n)})`
                    ).join(", ");
                } else {
                    birthLine = `${rows.slice(0, 3).map(({ birth, n }) =>
                        `${escapeHtml(displayCountry(birth))} (${formatCount(n)})`
                    ).join(", ")} … +${rows.length - 3} more`;
                }
                tooltip.html(`
                    <strong>Route · ${formatCount(d.count)} detainee${d.count === 1 ? "" : "s"}</strong>
                    <span><b>Birth:</b> ${birthLine}</span>
                    <span><b>Citizenship:</b> ${cit}</span>
                    <span><b>Departure:</b> ${dep}</span>
                `);
                positionTooltip(event);
            })
            .on("mouseleave", hideTooltip)
            .transition()
            .duration(700)
            .ease(d3.easeCubicInOut)
            .attr("d", d => buildArcPath(centroids.get(d.from), centroids.get(d.to)))
            .style("opacity", step.showFlows ? 1 : 0)
            .style("pointer-events", step.showFlows ? "stroke" : "none")
            .style("cursor", step.showFlows ? "crosshair" : "default");

        if (activeStep !== prevStepForTooltip) {
            hideTooltip();
            prevStepForTooltip = activeStep;
        }

        structure.copyHost.selectAll("[data-section3-step]")
            .classed("is-active", (_, i) => i === activeStep);
    }

    function applySliderValue(value) {
        const nextIndex = Math.max(0, Math.min(monthKeys.length - 1, Number(value)));
        activeYearIndex = Number.isFinite(nextIndex) ? nextIndex : 0;
        slider.property("value", activeYearIndex);
        update();
    }

    slider.on("input", function () {
        applySliderValue(this.value);
    });

    slider.on("change", function () {
        applySliderValue(this.value);
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            }
            const index = Number(entry.target.getAttribute("data-section3-step"));
            if (!Number.isNaN(index)) {
                activeStep = index;
                update();
            }
        });
    }, { threshold: 0.55 });

    stepNodes.forEach(node => observer.observe(node));
    update();
}

function buildSection3Markup(section) {
    let layout = section.select("[data-section3-layout]");
    if (layout.empty()) {
        layout = section.append("div")
            .attr("class", "section3-layout")
            .attr("data-section3-layout", "");

        layout.append("div")
            .attr("class", "section3-copy")
            .attr("data-section3-copy", "");

        const vis = layout.append("div")
            .attr("class", "section3-vis");

        vis.append("div")
            .attr("class", "section3-controls")
            .attr("data-section3-controls", "");

        const chartWrap = vis.append("div")
            .attr("class", "section3-chart-wrap")
            .attr("data-section3-chart", "");

        chartWrap.append("div")
            .attr("class", "section3-tooltip-host")
            .attr("data-section3-tooltip", "");
    }

    const chartWrap = section.select("[data-section3-chart]");
    if (!chartWrap.empty() && chartWrap.select("[data-section3-tooltip]").empty()) {
        chartWrap.insert("div", ":first-child")
            .attr("class", "section3-tooltip-host")
            .attr("data-section3-tooltip", "");
    }

    return {
        copyHost: section.select("[data-section3-copy]"),
        chartHost: section.select("[data-section3-chart]"),
        controlsHost: section.select("[data-section3-controls]"),
        tooltipHost: section.select("[data-section3-tooltip]")
    };
}

function syncNarrative(copyHost) {
    const steps = [
        {
            kicker: "Step 1",
            title: "Birth Country Heat Map",
            body: "We first begin with the following map that depicts the number of detainees born in a specific country."
        },
        {
            kicker: "Step 2",
            title: "Citizenship Heat Map",
            body: "As you keep scrolling, the same yearly slider now updates to show the citizenship geography for each detainee."
        },
        {
            kicker: "Step 3",
            title: "Citizenship to Departure Paths",
            body: "Each line shows a person who was deported to a country that does not match either their birth country or citizenship country. Ideally, the detainee shouldn't be deported to an unfamiliar country."
        }
    ];

    const articles = copyHost.selectAll(".section3-step")
        .data(steps);

    articles.exit().remove();

    const entered = articles.enter()
        .append("article")
        .attr("class", "section3-step")
        .attr("data-section3-step", (_, i) => i);

    entered.append("p").attr("class", "section3-kicker");
    entered.append("h3");
    entered.append("p").attr("class", "section3-body");

    const merged = entered.merge(articles)
        .attr("data-section3-step", (_, i) => i);

    merged.select("h3").text(d => d.title);
    merged.select(".section3-body").text(d => d.body);
}

function summarizeCountryCountsByMonth(rows, field, monthKeys, countryLookup) {
    const byMonth = new Map(monthKeys.map(key => [key, new Map()]));

    rows.forEach(row => {
        const monthKey = resolveMonthKey(row);
        if (!monthKey || !byMonth.has(monthKey)) {
            return;
        }
        const name = resolveCountryName(row[field], countryLookup);
        if (!name) {
            return;
        }
        const map = byMonth.get(monthKey);
        map.set(name, (map.get(name) ?? 0) + 1);
    });

    return byMonth;
}

function summarizeMismatchFlowsByMonth(rows, monthKeys, countryLookup) {
    const byMonth = new Map(monthKeys.map(key => [key, new Map()]));

    rows.forEach(row => {
        const monthKey = resolveMonthKey(row);
        const flowMonth = monthKey ? byMonth.get(monthKey) : null;
        if (!flowMonth) {
            return;
        }

        const birth = resolveCountryName(row.birth_country, countryLookup);
        const citizenship = resolveCountryName(row.citizenship_country, countryLookup);
        const departure = resolveCountryName(row.departure_country, countryLookup);

        if (!citizenship || !departure || citizenship === departure) {
            return;
        }

        const arcKey = `${citizenship}|${departure}`;
        const birthKey = birth ?? "__unknown";
        if (!flowMonth.has(arcKey)) {
            flowMonth.set(arcKey, { count: 0, birthCounts: new Map() });
        }
        const agg = flowMonth.get(arcKey);
        agg.count += 1;
        agg.birthCounts.set(birthKey, (agg.birthCounts.get(birthKey) ?? 0) + 1);
    });

    const result = new Map();
    byMonth.forEach((flowMap, monthKey) => {
        result.set(
            monthKey,
            Array.from(flowMap, ([key, agg]) => {
                const [from, to] = key.split("|");
                const birthBreakdown = Array.from(agg.birthCounts.entries())
                    .map(([birth, n]) => ({ birth, n }))
                    .sort((a, b) => b.n - a.n);
                return { from, to, count: agg.count, birthBreakdown };
            }).sort((a, b) => b.count - a.count).slice(0, 140)
        );
    });
    return result;
}

function resolveMonthKey(row) {
    if (row.date instanceof Date && !Number.isNaN(row.date.getTime())) {
        return `${row.date.getUTCFullYear()}-${String(row.date.getUTCMonth() + 1).padStart(2, "0")}`;
    }

    const year = Number(`${row.year ?? ""}`.trim());
    const month = Number(`${row.month ?? ""}`.trim());
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        return null;
    }
    return `${year}-${String(month).padStart(2, "0")}`;
}

function buildMonthKeys(startDate, endDate) {
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
        return [];
    }

    const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
    const stop = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
    const keys = [];

    while (cursor <= stop) {
        keys.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return keys;
}

function buildCountryLookup(features) {
    const map = new Map();
    features.forEach(feature => {
        const key = feature.properties.__normName;
        if (key) {
            map.set(key, feature.properties.__normName);
        }
    });
    return map;
}

function buildNormToDisplayName(features) {
    const map = new Map();
    features.forEach(feature => {
        const key = feature.properties.__normName;
        const label = feature.properties?.name ?? key;
        if (key) {
            map.set(key, label);
        }
    });
    return map;
}

function titleCaseNorm(norm) {
    return String(norm || "")
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function resolveCountryName(raw, countryLookup) {
    const normalized = normalizeCountryName(raw ?? "");
    if (!normalized) {
        return null;
    }

    const alias = COUNTRY_ALIASES.get(normalized) ?? normalized;
    return countryLookup.has(alias) ? alias : null;
}

function normalizeCountryName(value) {
    return `${value ?? ""}`
        .trim()
        .toLowerCase()
        .replace(/\./g, "")
        .replace(/\s+/g, " ");
}

function buildArcPath(from, to) {
    if (!Array.isArray(from) || !Array.isArray(to)) {
        return "";
    }
    const [x1, y1] = from;
    const [x2, y2] = to;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dr = Math.sqrt(dx * dx + dy * dy) * 1.05;
    return `M${x1},${y1}A${dr},${dr} 0 0,1 ${x2},${y2}`;
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

const COUNTRY_ALIASES = new Map([
    ["united states", "united states of america"],
    ["usa", "united states of america"],
    ["us", "united states of america"],
    ["ivory coast", "cote d'ivoire"],
    ["cote divoire", "cote d'ivoire"],
    ["democratic republic of the congo", "democratic republic of the congo"],
    ["dr congo", "democratic republic of the congo"],
    ["republic of the congo", "republic of the congo"],
    ["czech republic", "czechia"],
    ["syrian arab republic", "syria"],
    ["russian federation", "russia"],
    ["venezuela (bolivarian republic of)", "venezuela"],
    ["iran (islamic republic of)", "iran"],
    ["lao peoples democratic republic", "laos"],
    ["viet nam", "vietnam"],
    ["korea, republic of", "south korea"],
    ["korea, democratic peoples republic of", "north korea"],
    ["bosnia and herzegovina", "bosnia and herz."],
    ["tanzania, united republic of", "tanzania"],
    ["moldova, republic of", "moldova"],
    ["bolivia (plurinational state of)", "bolivia"],
    ["brunei darussalam", "brunei"],
    ["eswatini", "swaziland"],
    ["north macedonia", "macedonia"],
    ["myanmar", "myanmar"],
    ["cape verde", "cabo verde"],
    ["timor-leste", "east timor"]
]);
