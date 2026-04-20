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

// window.addEventListener("scroll", () => {
//   const section = document.getElementById("image-scroll");
//   const rect = section.getBoundingClientRect();

//   // Calculate progress: 0 when top is at 0, 1 when bottom reaches 0
//   // rect.top is negative when the top of the section is above the viewport
//   const totalScrollableHeight = section.offsetHeight - window.innerHeight;
//   const scrollProgress = -rect.top / totalScrollableHeight;

//   // Clamp progress between 0 and 1 so it doesn't trigger early or late
//   const progress = Math.max(0, Math.min(1, scrollProgress));

//   // Trigger your images based on that progress
//   if (progress > 0.05) showImage(1);
//   if (progress > 0.15) showImage(2);
//   if (progress > 0.25) showImage(3);
//   if (progress > 0.35) showImage(4);
//   if (progress > 0.50) showImage(5);
//   if (progress > 0.65) showImage(6);
// });

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
        }, 30000);
  }
});

function runAnimation(){
  Object.keys(images).forEach((key, i) => {
      const id = Number(key);
      setTimeout(() => {
          showImage(id)
      }, i * 5000);
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
