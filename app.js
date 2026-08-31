/**
 * =========================================================================
 * OMNIVERSE COMIC READER ENGINE
 * =========================================================================
 * Modes:
 *  - Page-by-Page Flip Reader (Paginates heroes into stylized comic pages)
 *  - Continuous Strip Reader (Infinite scroll Webtoon-style format)
 * =========================================================================
 */

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
const HEROES_PER_PAGE = 5; // 5 heroes per comic sheet page
let isStripMode = false;   // false = Page Reader, true = Continuous Strip

// Comic Panel Rhythm Templates
const panelShapes = ["panel-large", "panel-tall", "panel-wide", "panel-half", "panel-third"];
const sfxWords = ["POW!", "WHAM!", "KAPOW!", "BAM!", "ZAP!", "BOOM!"];

// Audio Synthesizer
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
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.12);
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
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
            gain.gain.setValueAtTime(0.6, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        } catch (e) {}
    }
};

// 1. Initialize Archive Data
async function initComic() {
    try {
        const response = await fetch(`${API_URL}/heroes`);
        rawCatalog = await response.json();
        
        // Exclude secret easter egg from default view
        filteredHeroes = rawCatalog.filter(h => h.id !== 0);
        renderReader();
    } catch (err) {
        comicStage.innerHTML = `
            <div class="narrative-box" style="background:#ffcdd2; color:#b71c1c; text-align:center;">
                💥 ISSUE PRINTING HALTED: ${err.message}
            </div>
        `;
    }
}

// 2. Main Reader Renderer
function renderReader() {
    if (!filteredHeroes.length) {
        comicStage.innerHTML = `
            <div class="narrative-box splash-load">
                💥 ZERO HEROES MATCHED THIS SCRIPT! TRY ANOTHER SEARCH!
            </div>
        `;
        pageFlipper.style.display = "none";
        return;
    }

    if (isStripMode) {
        // Continuous Webtoon-Style Vertical Strip
        pageFlipper.style.display = "none";
        renderStripMode();
    } else {
        // Interactive Page-by-Page Comic Issue
        pageFlipper.style.display = "flex";
        renderPageMode();
    }
}

// 3. Render Page-by-Page Sheet
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
        const fallbackImg = `https://via.placeholder.com/450x350/ffe600/101012?text=${encodeURIComponent(hero.alias)}`;

        panelHTML += `
            <article class="comic-panel ${shape}" onclick="openDossier(${hero.id})">
                <img src="${hero.image}" alt="${hero.alias}" class="panel-img" onerror="this.onerror=null; this.src='${fallbackImg}';">
                <div class="panel-caption-box">PANEL #${hero.id < 10 ? '0' + hero.id : hero.id} // ${hero.origin_era}</div>
                <div class="panel-sfx-stamp">${sfx}</div>
                <div class="panel-speech-balloon">
                    <div class="balloon-title">${hero.alias}</div>
                    <div class="balloon-sub">ID: ${hero.civilian_name || hero.civilian_identity}</div>
                </div>
            </article>
        `;
    });

    panelHTML += `</div>`;
    comicStage.innerHTML = panelHTML;
}

// 4. Render Vertical Webtoon Strip Mode
function renderStripMode() {
    let stripHTML = `<div class="comic-strip-layout">`;

    filteredHeroes.forEach(hero => {
        const fallbackImg = `https://via.placeholder.com/800x400/ffe600/101012?text=${encodeURIComponent(hero.alias)}`;
        stripHTML += `
            <article class="strip-panel" onclick="openDossier(${hero.id})">
                <div class="narrative-box" style="margin-bottom: 0.75rem;">
                    <strong>CHAPTER RECORD #${hero.id}:</strong> ${hero.alias.toUpperCase()} &bull; ERA ${hero.origin_era}
                </div>
                <div class="strip-img-frame">
                    <img src="${hero.image}" alt="${hero.alias}" onerror="this.onerror=null; this.src='${fallbackImg}';">
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="font-family:'Bangers', cursive; font-size:2rem; color:var(--comic-red);">${hero.alias}</h3>
                        <p style="font-weight:700;">TRUE IDENTITY: ${hero.civilian_name || hero.civilian_identity}</p>
                    </div>
                    <button class="action-btn">CLICK TO INSPECT SPLASH ▶</button>
                </div>
            </article>
        `;
    });

    stripHTML += `</div>`;
    comicStage.innerHTML = stripHTML;
}

// 5. Open Full Centerfold Dossier (Modal)
window.openDossier = function(id) {
    AudioFX.playPunch();
    const hero = rawCatalog.find(h => h.id === id);
    if (!hero) return;

    modalBody.innerHTML = `
        <div style="border-bottom: 4px solid var(--ink-black); padding-bottom: 1rem; margin-bottom: 1.5rem;">
            <div class="narrative-box" style="display:inline-block; margin-bottom: 0.5rem;">
                ★ CENTERFOLD SPLASH DOSSIER #${hero.id} ★
            </div>
            <h2 style="font-family:'Bangers', cursive; font-size:3.5rem; color:var(--comic-red); line-height:0.95;">
                ${hero.alias}
            </h2>
            <p style="font-size:1.2rem; font-weight:700; color:#333;">
                CIVILIAN IDENTITY: <span style="color:var(--comic-blue);">${hero.civilian_name || hero.civilian_identity}</span> &bull; DEBUT: ${hero.origin_era}
            </p>
        </div>

        <div style="width:100%; height:280px; border:4px solid var(--ink-black); box-shadow:6px 6px 0px var(--ink-black); margin-bottom:1.5rem; overflow:hidden;">
            <img src="${hero.image}" alt="${hero.alias}" style="width:100%; height:100%; object-fit:cover;">
        </div>

        <div style="display:grid; gap:0.85rem; font-size:1.05rem;">
            <div class="narrative-box" style="background:#fff9c4;"><strong>⚡ POWER CLASS:</strong> ${hero.classification}</div>
            <div class="narrative-box" style="background:#ffcdd2;"><strong>💥 THREAT LEVEL:</strong> ${hero.threat_level}</div>
            <div class="narrative-box" style="background:#e1f5fe;"><strong>🦸‍♂️ SQUAD / TEAM:</strong> ${hero.affiliation}</div>
            <div class="narrative-box" style="background:#fff;"><strong>📍 BASE OF OPERATIONS:</strong> ${hero.base_of_operations}</div>
            <div class="narrative-box" style="background:#fffde7;"><strong>🔥 SUPERPOWERS:</strong> ${hero.primary_powers}</div>
            <div class="narrative-box" style="background:#ffebee; color:#b71c1c;"><strong>⚠️ VULNERABILITY:</strong> ${hero.tactical_vulnerability}</div>
            <div class="narrative-box" style="background:#fff;"><strong>🛡️ GEAR & ARTIFACTS:</strong> ${hero.signature_gear}</div>
            <div class="narrative-box" style="background:#fff;"><strong>⚔️ COMBAT DOCTRINE:</strong> ${hero.tactical_profile}</div>
            <div class="narrative-box" style="background:#f3e5f5;"><strong>🧠 PSYCHOLOGICAL PROFILE:</strong> ${hero.psychological_dossier}</div>
        </div>
    `;

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
};

// 6. Navigation & Reading Mode Toggles
prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        AudioFX.playFlip();
        currentPage--;
        renderReader();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
});

nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredHeroes.length / HEROES_PER_PAGE);
    if (currentPage < totalPages) {
        AudioFX.playFlip();
        currentPage++;
        renderReader();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
});

viewModeBtn.addEventListener("click", () => {
    AudioFX.playFlip();
    isStripMode = !isStripMode;
    viewModeBtn.innerText = isStripMode ? "📖 SWITCH TO PAGE-BY-PAGE READER" : "📜 SWITCH TO CONTINUOUS STRIP";
    renderReader();
});

// Search and Filter Listeners
searchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    
    // Easter Egg keywords
    const easterEggKeys = ["maki", "kolorcoaster", "dilaw", "namumula", "turning green", "itim na ulap"];
    if (easterEggKeys.some(k => q === k)) {
        const easterEgg = rawCatalog.find(h => h.id === 0);
        if (easterEgg) {
            filteredHeroes = [easterEgg];
            currentPage = 1;
            renderReader();
            return;
        }
    }

    filteredHeroes = rawCatalog
        .filter(h => h.id !== 0)
        .filter(h => Object.values(h).some(v => String(v).toLowerCase().includes(q)));

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
            filteredHeroes = rawCatalog.filter(h => h.id !== 0);
        } else if (filter === "GLOBAL") {
            filteredHeroes = rawCatalog.filter(h => 
                h.id !== 0 && 
                !h.affiliation.includes("Avengers") && 
                !h.affiliation.includes("Justice League") && 
                !h.affiliation.includes("X-Men")
            );
        } else {
            filteredHeroes = rawCatalog.filter(h => 
                h.id !== 0 && 
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
    filteredHeroes = rawCatalog.filter(h => h.id !== 0);
    currentPage = 1;
    renderReader();
});

// Close Modal
function closeDossier() {
    modal.classList.add("hidden");
    document.body.style.overflow = "auto";
}

closeModalBtn.addEventListener("click", closeDossier);
window.addEventListener("click", (e) => { if (e.target === modal) closeDossier(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDossier(); });

// Boot
document.addEventListener("DOMContentLoaded", initComic);
