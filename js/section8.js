const STAT_SUMMARY = [
    {
        number: "40,219",
        label: "Peak arrests under Trump",
        detail: "34% higher than Biden's peak"
    },
    {
        number: "1000s",
        label: "Deported elsewhere",
        detail: "Many cases involve people sent to countries they aren't from and don't have citizenship in"
    },
    {
        number: "14.7%",
        label: "Arrests directly to detention",
        detail: "From near-0 under Biden, to surging under Trump"
    },
    {
        number: "54.4%",
        label: "Removed or deported",
        detail: "1/3 still in the system"
    },
    {
        number: "44 days",
        label: "Average detention length",
        detail: "The typical detention stay lasts nearly two months"
    },
    {
        number: "<2%",
        label: "Labeled high-risk yearly",
        detail: "Terrorist, suspected gang member, or serious criminal"
    }
];

export function runSection8() {
    const section = d3.select("#section-8");
    if (section.empty()) {
        return;
    }

    const structure = buildSection8Markup(section);
    renderStatCards(structure.grid);
}

export function renderStatCards(grid) {
    grid.selectAll("*").remove();

    const cards = grid.selectAll(".section8-stat-card")
        .data(STAT_SUMMARY)
        .enter()
        .append("article")
        .attr("class", "section8-stat-card")
        .style("opacity", 0)
        .style("transform", "translateY(22px)");

    cards.append("p")
        .attr("class", "section8-stat-number")
        .text(d => d.number);

    cards.append("h3")
        .attr("class", "section8-stat-label")
        .text(d => d.label);

    cards.append("p")
        .attr("class", "section8-stat-detail")
        .text(d => d.detail);

    const sectionNode = d3.select("#section-8").node();
    const reveal = () => {
        cards
            .transition()
            .delay((_, index) => index * 110)
            .duration(650)
            .ease(d3.easeCubicOut)
            .style("opacity", 1)
            .style("transform", "translateY(0)");
    };

    if (!sectionNode || !("IntersectionObserver" in window)) {
        reveal();
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            }

            reveal();
            observer.disconnect();
        });
    }, {
        root: null,
        threshold: 0.25
    });

    observer.observe(sectionNode);
}

export function updateStatCardsOnScroll() {
    // Kept as a stable module API, but Section 8 now reveals all recap cards together.
}

function buildSection8Markup(section) {
    let intro = section.select("[data-section8-intro]");
    if (intro.empty()) {
        intro = section.append("p")
            .attr("class", "section8-intro")
            .attr("data-section8-intro", "");
    }

    intro.text("Altogether, the data points to a system that targets and hurts more people than ever before.");

    let grid = section.select("[data-section8-grid]");
    if (grid.empty()) {
        grid = section.append("div")
            .attr("class", "section8-stat-grid")
            .attr("data-section8-grid", "");
    }

    let conclusion = section.select("[data-section8-conclusion]");
    if (conclusion.empty()) {
        conclusion = section.append("p")
            .attr("class", "section8-conclusion")
            .attr("data-section8-conclusion", "");
    }

    conclusion.text("The takeaway: enforcement is surging, outcomes are worsening, and people are being targeted for all the wrong reasons.");

    return { grid };
}
