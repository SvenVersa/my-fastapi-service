const API_URL = "https://my-fastapi-service-beta.vercel.app";


// DOM Elements
const comicStage = document.getElementById("comic-stage");
const searchInput = document.getElementById("search-input");
const resetBtn = document.getElementById("reset-btn");
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const pageIndicator = document.getElementById("page-indicator");
const pageFlipper = document.getElementById("page-flipper");
const viewModeBtn = document.getElementById("view-mode-btn");
const tabBtns = document.querySelectorAll(".tab-btn");
const modal = document.getElementById("detail-modal");
const modalBody = document.getElementById("modal-body");
const closeModalBtn = document.getElementById("close-modal");

// State
let rawCatalog = [];
let filteredHeroes = [];
let currentPage = 1;
const HEROES_PER_PAGE = 5;
let isStripMode = false;

// Panel Shapes & Sound FX stamps
const panelShapes = ["panel-large", "panel-tall", "panel-wide", "panel-half", "panel-third"];
const sfxWords = ["POW!", "WHAM!", "KAPOW!", "BAM!", "ZAP!", "BOOM!", "SMACK!"];

// Audio Engine (Web Audio API)
const AudioFX = {
    ctx: null,
    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    },
    playFlip() {
        try {
            this.init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        } catch (e) {}
    },
    playPunch() {
        try {
            this.init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(20, now + 0.2);
            gain.gain.setValueAtTime(0.7, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        } catch (e) {}
    }
};

// 1. Fetch Heroes Archive
async function initComic() {
    try {
        const response = await fetch(`${API_URL}/heroes`);
        rawCatalog = await response.json();
        filteredHeroes = rawCatalog;
        renderReader();
    } catch (err) {
        comicStage.innerHTML = `
            <div class="narrative-box" style="background:#ffcdd2; color:#b71c1c; text-align:center;">
                💥 TRANSMISSION FAILED: ${err.message}
            </div>
        `;
    }
}

// 2. Render Page or Strip Mode (With Transition Wrapper)
function renderReader(animateTransition = false) {
    if (animateTransition && !isStripMode) {
        comicStage.classList.add("page-turning");
        setTimeout(() => {
            executeRender();
            comicStage.classList.remove("page-turning");
        }, 300); // Wait for fadeOutLeft animation to finish
    } else {
        executeRender();
    }
}

function executeRender() {
    if (!filteredHeroes.length) {
        comicStage.innerHTML = `
            <div class="narrative-box splash-load" style="background:var(--comic-white);">
                💥 NO HEROES MATCHED THIS SCRIPT! TRY ANOTHER SEARCH!
            </div>
        `;
        pageFlipper.style.display = "none";
        return;
    }

    if (isStripMode) {
        pageFlipper.style.display = "none";
        renderStripMode();
    } else {
        pageFlipper.style.display = "flex";
        renderPageMode();
    }
}

// 3. Render Page Mode (Staggered Panel Pop-Ins)
function renderPageMode() {
    const totalPages = Math.ceil(filteredHeroes.length / HEROES_PER_PAGE);
    if (currentPage > totalPages) currentPage = 1;

    const startIdx = (currentPage - 1) * HEROES_PER_PAGE;
    const pageHeroes = filteredHeroes.slice(startIdx, startIdx + HEROES_PER_PAGE);

    pageIndicator.innerText = `PAGE ${currentPage} OF ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    let panelHTML = `<div class="comic-panel-layout">`;

    pageHeroes.forEach((hero, index) => {
        const shape = panelShapes[index % panelShapes.length];
        const sfx = sfxWords[index % sfxWords.length];
        const fallbackImg = `https://via.placeholder.com/450x350/ff2525/fffdf0?text=${encodeURIComponent(hero.alias)}`;

        // Dynamic animation-delay creates the sequential reading effect
        const delay = index * 0.15; 

        panelHTML += `
            <article class="comic-panel ${shape}" style="animation-delay: ${delay}s;" onclick="openDossier(${hero.id})">
                <img src="${hero.image}" alt="${hero.alias}" class="panel-img" onerror="this.onerror=null; this.src='${fallbackImg}';">
                <div class="panel-caption-box">PANEL #${hero.id < 10 ? '0' + hero.id : hero.id} // ${hero.origin_era}</div>
                <div class="panel-sfx-stamp">${sfx}</div>
                <div class="panel-speech-balloon">
                    <div class="balloon-title">${hero.alias}</div>
                    <div class="balloon-sub">ID: ${hero.civilian_name}</div>
                </div>
            </article>
        `;
    });

    panelHTML += `</div>`;
    comicStage.innerHTML = panelHTML;
}

// 4. Render Strip Mode
function renderStripMode() {
    let stripHTML = `<div class="comic-strip-layout">`;

    filteredHeroes.forEach((hero, index) => {
        const fallbackImg = `https://via.placeholder.com/800x400/ff2525/fffdf0?text=${encodeURIComponent(hero.alias)}`;
        const delay = (index < 10) ? index * 0.1 : 0; // Only delay the first few to prevent huge loads

        stripHTML += `
            <article class="strip-panel" style="animation-delay: ${delay}s;" onclick="openDossier(${hero.id})">
                <div class="narrative-box" style="margin-bottom: 0.75rem;">
                    <strong>CHAPTER RECORD #${hero.id}:</strong> ${hero.alias.toUpperCase()} &bull; ERA ${hero.origin_era}
                </div>
                <div class="strip-img-frame">
                    <img src="${hero.image}" alt="${hero.alias}" onerror="this.onerror=null; this.src='${fallbackImg}';">
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="font-family:'Bangers', cursive; font-size:2.2rem; color:var(--comic-red);">${hero.alias}</h3>
                        <p style="font-weight:700;">TRUE IDENTITY: ${hero.civilian_name}</p>
                    </div>
                    <button class="action-btn">CLICK TO INSPECT SPLASH ▶</button>
                </div>
            </article>
        `;
    });

    stripHTML += `</div>`;
    comicStage.innerHTML = stripHTML;
}

// 5. Open Full 14-Feature Centerfold Dossier (Modal)
window.openDossier = function(id) {
    AudioFX.playPunch();
    const hero = rawCatalog.find(h => h.id === id);
    if (!hero) return;

    modalBody.innerHTML = `
        <div style="border-bottom: 4px solid var(--ink-black); padding-bottom: 1rem; margin-bottom: 1.5rem; position: relative;">
            <div class="stamp-top-secret" style="position:absolute; top:-10px; right:10px; font-family:'Bangers', cursive; color:#e30022; border:4px solid #e30022; padding:0.2rem 0.5rem; transform:rotate(12deg); font-size:1.5rem; box-shadow: 2px 2px 0px #121212;">TOP SECRET</div>
            
            <h2 style="font-family:'Bangers', cursive; font-size:3.8rem; color:var(--comic-red); line-height:0.95; text-shadow: 2px 2px 0px var(--ink-black);">
                DOSSIER #${hero.id < 10 ? '0' + hero.id : hero.id}
            </h2>
        </div>

        <div style="width:100%; height:320px; border:5px solid var(--ink-black); box-shadow:8px 8px 0px var(--ink-black); margin-bottom:1.8rem; overflow:hidden;">
            <img src="${hero.image}" alt="${hero.alias}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='https://via.placeholder.com/650x300/ff2525/fffdf0?text=CLASSIFIED';">
        </div>

        <!-- 14 DISTINCT LORE CHARACTERISTIC BOXES -->
        <div class="comic-dossier-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:1.25rem; font-size:1.2rem;">
            <div class="narrative-box" style="background:#ffffff;"><strong>01. ALIAS:</strong> ${hero.alias}</div>
            <div class="narrative-box" style="background:#ffffff;"><strong>02. TRUE IDENTITY:</strong> ${hero.civilian_name}</div>
            
            <div class="narrative-box" style="background:#fff9c4;"><strong>03. DEBUT ERA:</strong> ${hero.origin_era}</div>
            <div class="narrative-box" style="background:#fff9c4;"><strong>04. GENETIC ORIGIN:</strong> ${hero.species_or_origin}</div>
            
            <div class="narrative-box" style="background:#e1f5fe;"><strong>05. CLASSIFICATION:</strong> ${hero.classification}</div>
            <div class="narrative-box" style="background:#ffcdd2; color:#b71c1c;"><strong>06. THREAT LEVEL:</strong> ${hero.threat_level}</div>
            
            <div class="narrative-box" style="background:#ffffff;"><strong>07. AFFILIATION:</strong> ${hero.affiliation}</div>
            <div class="narrative-box" style="background:#ffffff;"><strong>08. BASE OF OPERATIONS:</strong> ${hero.base_of_operations}</div>
            
            <div class="narrative-box" style="background:#fffde7; grid-column: span 2;"><strong>09. SUPERPOWERS:</strong> ${hero.primary_powers}</div>
            <div class="narrative-box" style="background:#ffebee; color:#b71c1c; grid-column: span 2;"><strong>10. VULNERABILITY:</strong> ${hero.tactical_vulnerability}</div>
            
            <div class="narrative-box" style="background:#ffffff; grid-column: span 2;"><strong>11. SIGNATURE GEAR:</strong> ${hero.signature_gear}</div>
            <div class="narrative-box" style="background:#ffffff; grid-column: span 2;"><strong>12. COMBAT DOCTRINE:</strong> ${hero.tactical_profile}</div>
            
            <div class="narrative-box" style="background:#f3e5f5; grid-column: span 2;"><strong>13. PSYCHOLOGICAL PROFILE:</strong> ${hero.psychological_dossier}</div>
            <div class="narrative-box" style="background:#ffebee; color:#b71c1c; grid-column: span 2;"><strong>14. ARCH-NEMESIS:</strong> ${hero.primary_adversary}</div>
        </div>
    `;

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Prevent background scrolling
};

// 6. Pagination & Mode Toggles
prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        AudioFX.playFlip();
        currentPage--;
        renderReader(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
});

nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredHeroes.length / HEROES_PER_PAGE);
    if (currentPage < totalPages) {
        AudioFX.playFlip();
        currentPage++;
        renderReader(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
});

viewModeBtn.addEventListener("click", () => {
    AudioFX.playFlip();
    isStripMode = !isStripMode;
    viewModeBtn.innerText = isStripMode ? "📖 SWITCH TO PAGE-BY-PAGE READER" : "📜 SWITCH TO CONTINUOUS STRIP";
    renderReader(true);
});

// Search and Filter Listeners
searchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    
    filteredHeroes = rawCatalog.filter(h => 
        Object.values(h).some(v => String(v).toLowerCase().includes(q))
    );

    currentPage = 1;
    renderReader();
});

tabBtns.forEach(tab => {
    tab.addEventListener("click", () => {
        AudioFX.playFlip();
        tabBtns.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        
        const filter = tab.dataset.filter;
        searchInput.value = "";

        if (filter === "ALL") {
            filteredHeroes = rawCatalog;
        } else {
            filteredHeroes = rawCatalog.filter(h => 
                h.affiliation.toUpperCase().includes(filter)
            );
        }

        currentPage = 1;
        renderReader();
    });
});

resetBtn.addEventListener("click", () => {
    searchInput.value = "";
    tabBtns.forEach(t => t.classList.remove("active"));
    document.querySelector('.tab-btn[data-filter="ALL"]').classList.add("active");
    filteredHeroes = rawCatalog;
    currentPage = 1;
    renderReader();
});

// Close Modal
function closeDossier() {
    AudioFX.playFlip();
    modal.classList.add("hidden");
    document.body.style.overflow = "auto";
}

closeModalBtn.addEventListener("click", closeDossier);
window.addEventListener("click", (e) => { if (e.target === modal) closeDossier(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDossier(); });

// Boot
document.addEventListener("DOMContentLoaded", initComic);
