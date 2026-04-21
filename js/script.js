// Load the CSVs and other important attributes
const parseDate = d3.timeParse("%Y-%m-%d")
const biden_data = await d3.csv("./data/detention-stays_filtered_biden_cleaned.csv", d => ({
  ...d,
  date: parseDate(d.date)
}))

const trump_data = await d3.csv("./data/detention-stays_filtered_trump_cleaned.csv", d => ({
  ...d,
  date: parseDate(d.date)
}))

const root = document.documentElement
const styles = getComputedStyle(root)
const main_red = styles.getPropertyValue('--main-red')

// Section 1: Overview

// hateful content collage
const animated = false

const images = {
    1: document.getElementById("tweet-1"),
    2: document.getElementById("tweet-2"),
    3: document.getElementById("transcript-1"),
    4: document.getElementById("transcript-2"),
    5: document.getElementById("ig"),
    6: document.getElementById("news")
};

function showImage(id) {
  const img = images[id];
  if (!img) return;

  img.style.opacity = 1;

  if (id != 1) images[id - 1].style.opacity = 0.5;
}

const section = document.getElementById("image-animation");
let locked = false
let hasRun = false

window.addEventListener("scroll", () => {
  const rect = section.getBoundingClientRect();

  if (rect.top <= 0 && !locked) { 
      document.body.classList.add("no-scroll");

        locked = true
        // simulate animation time
        setTimeout(() => {
            document.body.classList.remove("no-scroll");
        }, 3000);
  }
});

function runAnimation(){
  Object.keys(images).forEach((key, i) => {
      const id = Number(key);
      setTimeout(() => {
          showImage(id)
      }, i * 500);
    });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !hasRun) {
      hasRun = true;
      runAnimation();
    }
  });
}, {threshold: 1
});

observer.observe(section)


// Section 2: Scale of Detention Between Presidency

const width = 800;
const height = 300;
const chartWidth = 350;
const chartHeight = 250;

const detention_scale_svg = d3.select('#detention-scale-vis').append("svg").attr("width", width).attr("height", height);
const biden_scale_g = detention_scale_svg.append("g").attr("transform", "translate(40,20)");
const trump_scale_g = detention_scale_svg.append("g").attr("transform", "translate(440,20)");

const biden_detention_map = d3.rollups(
  biden_data,
  v=>v.length,
  d=>d3.timeMonth(d.date)
).map(
  (([date, count]) => ({
    date,
    count
  }))
).sort((a,b) => a.date - b.date)

const biden_x_scale = d3.scaleTime().domain(d3.extent(biden_detention_map, d=>d.date)).range([0, chartWidth]);
const biden_y_scale = d3.scaleLinear().domain([0,d3.max(biden_detention_map, d=>d.count)]).range([chartHeight, 0]);
const biden_line = d3.line()
  .x(d=>biden_x_scale(d.date))
  .y(d=>biden_y_scale(d.count));

biden_scale_g.append("path")
  .datum(biden_detention_map)
  .attr("fill", "none")
  .attr("stroke", main_red)
  .attr("stroke-width", 2)
  .attr("d", biden_line);

const trump_detention_map = d3.rollups(
  trump_data,
  v=>v.length,
  d=>d3.timeMonth(d.date)
).map(
  (([date, count]) => ({
    date, 
    count
  }))
).sort((a,b) => a.date - b.date);

console.log(trump_detention_map)

const trump_x_scale = d3.scaleTime().domain(d3.extent(trump_detention_map, d=>d.date)).range([0, chartWidth]);
const trump_y_scale = d3.scaleLinear().domain([0, d3.max(trump_detention_map, d=>d.count)]).range([chartHeight, 0]);
const trump_line = d3.line()
  .x(d=>trump_x_scale(d.date))
  .y(d=>trump_y_scale(d.count));

trump_scale_g.append("path")
  .datum(trump_detention_map)
  .attr("fill", "none")
  .attr("stroke", main_red)
  .attr("stroke-width", 2)
  .attr("d", trump_line);
