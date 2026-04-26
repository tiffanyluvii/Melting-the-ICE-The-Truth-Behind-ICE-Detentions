let interval;
let wordsActive = true;

export function showWords(){
    const section = document.querySelector("#section-1");

    function startWordFlow(speed) {
        clearInterval(interval);

        interval = setInterval(() => {
            addWord();
            removeOldWord();
        }, speed);
    }

    window.addEventListener("scroll", () => {
        if (!wordsActive) return;

        const progress = getSectionProgress(section);
        const speed = 300 - (250 * progress);
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
    const randomRotate = -18 + Math.random() * 36;
    const randomScale = 0.9 + Math.random() * 0.65;
    const randomHueShift = -12 + Math.random() * 24;
    wordEl.style.transform = `rotate(${randomRotate}deg) scale(${randomScale})`;
    wordEl.style.filter = `hue-rotate(${randomHueShift}deg)`;

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
        const keys = Object.keys(images);
        

        keys.forEach((key, i) => {
            const id = Number(key);

            setTimeout(() => {
                showImage(id);

                if (i === keys.length - 1) {
                    const lastImage = images[id];

                    const onFadeInComplete = (e) => {
                        if (e.propertyName === "opacity") {
                            lastImage.removeEventListener("transitionend", onFadeInComplete);

                            setTimeout(() => {
                                const section = document.getElementById("image-animation");
                                section.classList.add("transitioning-to-plea");
                                removeImages(images);
                                clearInterval(interval);
                                wordsActive = false;
                                fadeOutWords();
                                setTimeout(() => {
                                    section.classList.remove("transitioning-to-plea");
                                    const pleaEl = showPlea();
                                    playPlea(pleaEl);
                                }, 1000);
                            }, 2000);
                        }
                    };

                    lastImage.addEventListener("transitionend", onFadeInComplete);
                }

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
    }, {threshold: 0.6
    });

    observer.observe(section)
}

function removeImages(images){

    Object.values(images).forEach(image => {
        if (image) {
            image.style.transition = "opacity 1s";
            image.style.opacity = 0;
        }
    });

    const section = document.getElementById("image-animation");
    section.replaceChildren();
}

function removeWords(){
    const words = document.querySelectorAll(".floating-word");
    for (let i = 0; i < words.length; i++){
        words[i].remove();
    }
}

function fadeOutWords(){
    const words = document.querySelectorAll(".floating-word");
    words.forEach((word) => {
        word.style.transition = "opacity 0.7s ease";
        word.style.opacity = "0";
    });

    setTimeout(() => {
        removeWords();
    }, 750);
}

function showPlea(){
    const section = document.getElementById("image-animation");
    const pleaEl = document.createElement("div");
    pleaEl.className = "plea"
    pleaEl.innerHTML = "<strong>Translation:</strong><br>";
    
    pleaEl.style.opacity = "0";

    section.appendChild(pleaEl)

    requestAnimationFrame(() => {
        pleaEl.style.opacity = "1";
    });

    return pleaEl;
}

function playPlea(pleaEl){
    const pleaAudio = new Audio('./audio/kid_pleaing_audio.mp3');
    const cues = [
        { at: 0.35, text: "No, please, please." },
        { at: 2.2, text: "No, I don't want to." },
        { at: 4.35, text: "Please, please, please." },
        { at: 6.55, text: "No, I don't want to." },
        { at: 8.45, text: "No, mommy." }
    ];

    let cueIndex = 0;

    function updateCaption() {
        while (cueIndex < cues.length && pleaAudio.currentTime >= cues[cueIndex].at) {
            pleaEl.innerHTML = `<strong>Translation:</strong><br>${cues[cueIndex].text}`;
            cueIndex += 1;
        }
    }

    pleaAudio.addEventListener("timeupdate", updateCaption);
    pleaAudio.addEventListener("ended", () => {
        pleaAudio.removeEventListener("timeupdate", updateCaption);
    });

    const unlockEvents = ["click", "keydown", "touchstart", "pointerdown"];
    let hasStarted = false;

    function removeUnlockListeners() {
        unlockEvents.forEach((eventName) => {
            window.removeEventListener(eventName, handleUnlock);
        });
    }

    function handleUnlock() {
        if (hasStarted) return;

        pleaAudio.play()
            .then(() => {
                hasStarted = true;
                removeUnlockListeners();
            })
            .catch(() => {
                // Keep listeners active and retry on the next interaction.
            });
    }

    pleaAudio.play()
        .then(() => {
            hasStarted = true;
        })
        .catch(() => {
            unlockEvents.forEach((eventName) => {
                window.addEventListener(eventName, handleUnlock, { once: true, passive: true });
            });
        });
}