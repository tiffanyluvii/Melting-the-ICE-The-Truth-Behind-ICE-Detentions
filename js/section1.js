export function showWords(){
    const section = document.querySelector("#section-1");
    let interval;

    function startWordFlow(speed) {
        clearInterval(interval);

        interval = setInterval(() => {
            addWord();
            removeOldWord();
        }, speed);
    }

    window.addEventListener("scroll", () => {
        const progress = getSectionProgress(section);

        const speed = 500 - (450 * progress);

        startWordFlow(speed);
    });

}

function addWord(){
    const words = [
        "\"...poisoning the blood of our country\"", 
        "\"enemy\"", 
        "\"They're eating the dogs...They're eating the cats. They're eating the pets...\"", 
        "\"They're taking your jobs\"", 
        "\"Crime, savagery, filth, and scum will DISAPPEAR.\"",
        "\"...blood thirsty criminals\"",
        "\"animals\"",
        "\"stone cold killers\"",
        "\"bad genes\"",
        "\"...removing quickly the most dangerous criminal illegal immigrants in America.\"",
        "\"...criminals, gang members, security threats, visa overstays, public charges...\"",
    ];

    const section = document.querySelector("#section-1");

    const wordEl = document.createElement("span");
    wordEl.className = "floating-word";
    wordEl.textContent = words[Math.floor(Math.random() * words.length)];

    const margin = 10; // percent padding from edges

    wordEl.style.left = (margin + Math.random() * (100 - 2 * margin)) + "%";
    wordEl.style.top  = (margin + Math.random() * (100 - 2 * margin)) + "%";

    section.appendChild(wordEl);

    setTimeout(() => {
        wordEl.style.opacity = "0";
        setTimeout(() => wordEl.remove(), 1000);
    }, 5000);
}

function removeOldWord(){
    const words = document.querySelectorAll(".floating-word");
    if (words.length > 100){
        words[0].remove();
    }
}

function getSectionProgress(section) {
    const rect = section.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    const progress = Math.min(
        Math.max((windowHeight - rect.top) / (windowHeight + rect.height), 0),
        1
    );

    return progress;
}



export function runImagesAndAudio()
{
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
        // removeImages(images)
        }
    });
    }, {threshold: 0.4
    });

    observer.observe(section)
}

function removeImages(images){
    Object.values(images).forEach(image => {
        image.style.opacity = 0;
    });
}