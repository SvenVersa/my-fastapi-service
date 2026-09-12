const API_URL = "https://my-fastapi-service-beta.vercel.app";

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

// Global State
let rawCatalog = [];
let filteredHeroes = [];
let currentPage = 1;
const HEROES_PER_PAGE = 15; 
let isStripMode = false;

// Routing State
let activePublisher = null;
let activeFaction = null;

// Publisher Hub Base Art
const MULTIVERSE_ART = {
    "Marvel": "comics/marvel_cover.jpg",
    "DC": "comics/dc_cover.jpg",
    "Image": "comics/image_cover.jpg",
    "Dynamite": "comics/dynamite_cover.jpg",
    "Valiant": "comics/valiant_cover.jpg"
};

// Custom Faction Cover Art Map
const FACTION_ART = {
    "Avengers": "comics/avengers_cover.jpg",
    "X-Men": "comics/xmen_cover.jpg",
    "Fantastic Four": "comics/fantasticfour_cover.jpg",
    "Guardians of the Galaxy": "comics/gotg_cover.jpg",
    "Brotherhood": "comics/brotherhood_cover.jpg",  
    "Ultron Hive": "comics/ultronhive_cover.jpg",
    "Independent": "comics/independent_cover.jpg",
    "Justice League": "comics/jl_cover.jpg",
    "Suicide Squad": "comics/suicidesquad_cover.jpg",
    "Legion of Doom": "comics/legionofdoom_cover.jpg",
    "The Boys": "comics/theboys_cover.jpg",
    "The Seven": "comics/theseven_cover.jpg",
    "Payback": "comics/payback_cover.jpg",
    "Global Defense Agency": "comics/gda_cover.jpg",
    "Guardians of the Globe": "comics/gotg_cover.jpg",
    "Coalition of Planets": "comics/coalition_cover.jpg",
    "Viltrum Empire": "comics/viltrum_cover.jpg"
};

const panelShapes = ["panel-large", "panel-tall", "panel-wide", "panel-half", "panel-third"];
const sfxWords = ["POW!", "WHAM!", "KAPOW!", "BAM!", "ZAP!", "BOOM!", "SMACK!"];

// Audio Engine
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
        if (!response.ok) throw new Error("API Route unreachable.");
        rawCatalog = await response.json();
        renderPublishers(); 
    } catch (err) {
        comicStage.innerHTML = `
            <div class="narrative-box splash-load" style="background:#ffcdd2; color:#b71c1c;">
                💥 TRANSMISSION FAILED: ${err.message}
            </div>
        `;
    }
}

// ==================== TIER 1: PUBLISHERS ====================
window.renderPublishers = function() {
    activePublisher = null;
    activeFaction = null;
    
    document.getElementById("breadcrumb-trail").classList.add("hidden");
    document.getElementById("tactical-filters").classList.add("hidden");
    pageFlipper.classList.add("hidden");

    const uniquePublishers = [...new Set(rawCatalog.map(h => h.publisher))];

    let html = `
        <div class="comic-entry-banner">
            <div class="entry-sub">★ SELECT AN UNIVERSE ISSUE TO UNSEAL CLASSIFIED DOSSIERS ★</div>
            <h2 class="entry-headline">CHOOSE YOUR MULTIVERSE DIMENSION</h2>
        </div>
        <div class="comic-rack-grid">
    `;

    const issuePrices = { "Marvel": "$0.75", "DC": "$0.60", "Image": "$1.95", "Dynamite": "$2.99", "Valiant": "$1.50" };
    const issueYears = { "Marvel": "1963", "DC": "1938", "Image": "1992", "Dynamite": "2006", "Valiant": "1992" };

    uniquePublishers.forEach((pub, idx) => {
        const imgUrl = MULTIVERSE_ART[pub] || `https://via.placeholder.com/600x800/101012/fff?text=${pub.toUpperCase()}`;
        const price = issuePrices[pub] || "$1.00";
        const year = issueYears[pub] || "1990";
        const tilt = idx % 2 === 0 ? "-2.5deg" : "2.5deg";

        html += `
            <article class="comic-cover-book" style="--cover-tilt: ${tilt};" onclick="renderFactions('${pub}')">
                <div class="comic-spine"></div>
                <div class="comic-halftone-overlay"></div>

                <div class="cover-header-strip">
                    <span class="cover-price">${price}</span>
                    <span class="cover-issue">ISSUE #01 // EST. ${year}</span>
                    <span class="cover-stamp">DELUXE</span>
                </div>

                <div class="cover-burst-badge">OPEN ISSUE!</div>

                <img src="${imgUrl}" class="cover-art" alt="${pub}">

                <div class="cover-footer">
                    <div class="cover-title">${pub.toUpperCase()}</div>
                    <div class="cover-barcode">
                        <span>||| | |||| ||| |||| |</span>
                    </div>
                </div>
            </article>
        `;
    });

    html += `</div>`;
    comicStage.innerHTML = html;
};

// ==================== TIER 2: FACTIONS ====================
window.renderFactions = function(publisher) {
    activePublisher = publisher;
    activeFaction = null;
    AudioFX.playPunch();
    
    document.getElementById("breadcrumb-trail").classList.remove("hidden");
    document.getElementById("tactical-filters").classList.add("hidden");
    pageFlipper.classList.add("hidden");
    
    const crumbPub = document.getElementById("crumb-publisher");
    crumbPub.innerText = publisher.toUpperCase();
    crumbPub.classList.remove("hidden");
    crumbPub.classList.add("active-crumb");
    crumbPub.setAttribute("onclick", `renderFactions('${publisher}')`);
    document.getElementById("crumb-faction").classList.add("hidden");

    const publisherHeroes = rawCatalog.filter(h => h.publisher === publisher);
    const uniqueFactions = [...new Set(publisherHeroes.map(h => h.affiliation))];

    let html = `
        <div class="comic-entry-banner faction-mode">
            <div class="entry-sub" style="color:var(--comic-white);">★ SELECT A SQUAD TO INITIATE PROTOCOL ★</div>
            <h2 class="entry-headline" style="color:var(--comic-white); text-shadow: 3px 3px 0 var(--ink-black);">${publisher.toUpperCase()} FACTIONS</h2>
        </div>
        <div class="comic-rack-grid">
    `;

    uniqueFactions.forEach((faction, idx) => {
        const imgUrl = FACTION_ART[faction] || `comics/${faction.toLowerCase().replace(/\s+/g, '')}.jpg`;
        const tilt = idx % 2 === 0 ? "2.5deg" : "-2.5deg";
        
        html += `
            <article class="comic-cover-book" style="--cover-tilt: ${tilt};" onclick="routeToRoster('${publisher}', '${faction.replace(/'/g, "\\'")}')">
                <div class="comic-spine"></div>
                <div class="comic-halftone-overlay"></div>

                <div class="cover-header-strip">
                    <span class="cover-price">CLASSIFIED</span>
                    <span class="cover-issue">TEAM DOSSIER</span>
                    <span class="cover-stamp">TOP SECRET</span>
                </div>

                <div class="cover-burst-badge" style="transform: rotate(-10deg);">INSPECT!</div>

                <img src="${imgUrl}" class="cover-art" alt="${faction}" onerror="this.onerror=null; this.src='https://via.placeholder.com/400x600/101012/fff?text=${encodeURIComponent(faction.toUpperCase())}';">

                <div class="cover-footer">
                    <div class="cover-title">${faction.toUpperCase()}</div>
                    <div class="cover-barcode">
                        <span>||| | |||| ||| |||| |</span>
                    </div>
                </div>
            </article>
        `;
    });

    html += `</div>`;
    comicStage.innerHTML = html;
};

// ==================== TIER 3: ROSTER ====================
window.routeToRoster = function(publisher, faction) {
    activePublisher = publisher;
    activeFaction = faction;
    AudioFX.playPunch();

    document.getElementById("tactical-filters").classList.remove("hidden");
    
    const crumbPub = document.getElementById("crumb-publisher");
    crumbPub.classList.remove("active-crumb");
    
    const crumbFac = document.getElementById("crumb-faction");
    crumbFac.innerText = faction.toUpperCase();
    crumbFac.classList.remove("hidden");
    crumbFac.classList.add("active-crumb");

    filteredHeroes = rawCatalog.filter(h => h.publisher === publisher && h.affiliation === faction);
    
    currentPage = 1;
    searchInput.value = "";
    tabBtns.forEach(t => t.classList.remove("active"));
    document.querySelector('.tab-btn[data-key="ALL"]').classList.add("active");

    renderReader(); 
};

// 2. Render Coordinator
function renderReader(direction = null) {
    if (!filteredHeroes.length) {
        comicStage.innerHTML = `<div class="narrative-box splash-load">💥 NO HEROES MATCHED THIS SCRIPT!</div>`;
        pageFlipper.classList.add("hidden");
        return;
    }

    if (isStripMode) {
        pageFlipper.classList.add("hidden");
        renderStripMode();
    } else {
        pageFlipper.classList.remove("hidden");
        if (direction) {
            const animClass = direction === 'next' ? 'page-turning-next' : 'page-turning-prev';
            comicStage.classList.add(animClass);
            setTimeout(() => {
                renderPageMode();
                comicStage.classList.remove(animClass);
            }, 400); 
        } else {
            renderPageMode();
        }
    }
}

// 3. Render Page Mode
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

        panelHTML += `
            <article class="comic-panel ${shape}" onclick="openDossier(${hero.id})">
                <img src="${hero.image}" alt="${hero.alias}" class="panel-img" onerror="this.onerror=null; this.src='${fallbackImg}';">
                <div class="panel-caption-box">PANEL #${hero.id < 10 ? '0' + hero.id : hero.id} // ${hero.origin_era}</div>
                <div class="panel-trivia"><strong>DID YOU KNOW?</strong> ${hero.fun_fact || "No trivia available."}</div>
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
    activateScrollPhysics();
}

// 4. Render Strip Mode
function renderStripMode() {
    let stripHTML = `<div class="comic-strip-layout">`;
    filteredHeroes.forEach((hero, index) => {
        const fallbackImg = `https://via.placeholder.com/800x400/ff2525/fffdf0?text=${encodeURIComponent(hero.alias)}`;
        stripHTML += `
            <article class="strip-panel" onclick="openDossier(${hero.id})">
                <div class="narrative-box" style="margin-bottom: 0.75rem;">
                    <strong>RECORD #${hero.id}:</strong> ${hero.alias.toUpperCase()} &bull; ERA ${hero.origin_era}
                </div>
                <div class="strip-img-frame">
                    <img src="${hero.image}" alt="${hero.alias}" onerror="this.onerror=null; this.src='${fallbackImg}';">
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="font-family:'Bangers', cursive; font-size:2.2rem; color:var(--comic-red);">${hero.alias}</h3>
                        <p style="font-weight:700;">TRUE IDENTITY: ${hero.civilian_name}</p>
                    </div>
                    <button class="action-btn">INSPECT SPLASH ▶</button>
                </div>
            </article>
        `;
    });
    stripHTML += `</div>`;
    comicStage.innerHTML = stripHTML;
    activateScrollPhysics();
}

// 5. Open Modal
window.openDossier = function(id) {
    AudioFX.playPunch();
    const hero = rawCatalog.find(h => h.id === id);
    if (!hero) return;

    modalBody.innerHTML = `
        <div style="border-bottom: 4px solid var(--ink-black); padding-bottom: 1rem; margin-bottom: 1.5rem; position: relative;">
            <div style="position:absolute; top:-10px; right:10px; font-family:'Bangers', cursive; color:#e30022; border:4px solid #e30022; padding:0.2rem 0.5rem; transform:rotate(12deg); font-size:1.5rem;">TOP SECRET</div>
            <h2 style="font-family:'Bangers', cursive; font-size:3.8rem; color:var(--comic-red); line-height:0.95;">DOSSIER #${hero.id < 10 ? '0' + hero.id : hero.id}</h2>
        </div>
        <div style="width:100%; height:320px; border:5px solid var(--ink-black); box-shadow:8px 8px 0px var(--ink-black); margin-bottom:1.8rem; overflow:hidden;">
            <img src="${hero.image}" alt="${hero.alias}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='https://via.placeholder.com/650x300/ff2525/fffdf0?text=CLASSIFIED';">
        </div>
        <div class="comic-dossier-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:1.25rem; font-size:1.2rem;">
            <div class="narrative-box" style="background:#ffffff;"><strong>01. ALIAS:</strong> ${hero.alias}</div>
            <div class="narrative-box" style="background:#ffffff;"><strong>02. TRUE IDENTITY:</strong> ${hero.civilian_name}</div>
            <div class="narrative-box" style="background:#fff9c4;"><strong>03. DEBUT ERA:</strong> ${hero.origin_era}</div>
            <div class="narrative-box" style="background:#fff9c4;"><strong>04. GENETIC ORIGIN:</strong> ${hero.species_or_origin}</div>
            <div class="narrative-box" style="background:#e1f5fe;"><strong>05. CLASSIFICATION:</strong> ${hero.classification}</div>
            <div class="narrative-box" style="background:#ffcdd2; color:#b71c1c;"><strong>06. THREAT LEVEL:</strong> ${hero.threat_level}</div>
            <div class="narrative-box" style="background:#ffffff;"><strong>07. AFFILIATION:</strong> ${hero.affiliation}</div>
            <div class="narrative-box" style="background:#ffffff;"><strong>08. BASE OF OP:</strong> ${hero.base_of_operations}</div>
            <div class="narrative-box" style="background:#fffde7; grid-column: span 2;"><strong>09. SUPERPOWERS:</strong> ${hero.primary_powers}</div>
            <div class="narrative-box" style="background:#ffebee; color:#b71c1c; grid-column: span 2;"><strong>10. VULNERABILITY:</strong> ${hero.tactical_vulnerability}</div>
            <div class="narrative-box" style="background:#ffffff; grid-column: span 2;"><strong>11. SIGNATURE GEAR:</strong> ${hero.signature_gear}</div>
            <div class="narrative-box" style="background:#ffffff; grid-column: span 2;"><strong>12. COMBAT DOCTRINE:</strong> ${hero.tactical_profile}</div>
            <div class="narrative-box" style="background:#f3e5f5; grid-column: span 2;"><strong>13. PSYCHE:</strong> ${hero.psychological_dossier}</div>
            <div class="narrative-box" style="background:#ffebee; color:#b71c1c; grid-column: span 2;"><strong>14. ARCH-NEMESIS:</strong> ${hero.primary_adversary}</div>
        </div>
    `;
    
    modal.classList.remove("hidden");
};

// 6. Pagination & Mode Toggles
prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) { AudioFX.playFlip(); currentPage--; renderReader('prev'); window.scrollTo({ top: 0, behavior: "smooth" }); }
});

nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredHeroes.length / HEROES_PER_PAGE);
    if (currentPage < totalPages) { AudioFX.playFlip(); currentPage++; renderReader('next'); window.scrollTo({ top: 0, behavior: "smooth" }); }
});

viewModeBtn.addEventListener("click", () => {
    AudioFX.playFlip();
    isStripMode = !isStripMode;
    viewModeBtn.innerText = isStripMode ? "📖 SWITCH TO PAGE-BY-PAGE READER" : "📜 SWITCH TO CONTINUOUS STRIP";
    if (activePublisher && activeFaction) renderReader();
});

// 7. Contextual Search & Filters
searchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    const baseRoster = rawCatalog.filter(h => h.publisher === activePublisher && h.affiliation === activeFaction);
    
    filteredHeroes = baseRoster.filter(h => Object.values(h).some(v => String(v).toLowerCase().includes(q)));
    currentPage = 1;
    renderReader();
});

tabBtns.forEach(tab => {
    tab.addEventListener("click", () => {
        AudioFX.playFlip();
        tabBtns.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        
        const filterKey = tab.dataset.key;
        const filterVal = tab.dataset.val;
        searchInput.value = ""; 

        const baseRoster = rawCatalog.filter(h => h.publisher === activePublisher && h.affiliation === activeFaction);

        if (filterKey === "ALL") {
            filteredHeroes = baseRoster;
        } else {
            filteredHeroes = baseRoster.filter(hero => hero[filterKey] && hero[filterKey].toLowerCase() === filterVal.toLowerCase());
        }
        currentPage = 1;
        renderReader();
    });
});

resetBtn.addEventListener("click", () => {
    searchInput.value = "";
    tabBtns.forEach(t => t.classList.remove("active"));
    document.querySelector('.tab-btn[data-key="ALL"]').classList.add("active");
    
    filteredHeroes = rawCatalog.filter(h => h.publisher === activePublisher && h.affiliation === activeFaction);
    currentPage = 1;
    renderReader();
});

// Modal Closers - Free scrolling restored
function closeDossier() { AudioFX.playFlip(); modal.classList.add("hidden"); }
closeModalBtn.addEventListener("click", closeDossier);
window.addEventListener("click", (e) => { if (e.target === modal) closeDossier(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDossier(); });

// ==================== VIEWPORT PHYSICS ENGINE ====================
function activateScrollPhysics() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = "panelSmash 0.5s cubic-bezier(0.25, 1.5, 0.5, 1) forwards";
                document.body.classList.remove('camera-shake');
                void document.body.offsetWidth; 
                document.body.classList.add('camera-shake');
                AudioFX.playPunch();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.comic-panel, .strip-panel').forEach(panel => { observer.observe(panel); });
}

// ==================== ARCADE TICKER ====================
const tickerText = document.getElementById("arcade-ticker-text");
let tipInterval;
const comicTrivia = [
    "Wolverine was originally intended to be an actual mutated wolverine cub, not a human mutant!",
    "Superman couldn't originally fly in 1938! He could only 'leap tall buildings in a single bound.'",
    "Venom's iconic black suit design was bought by Marvel from a fan contest for just $220.",
    "In the Marvel/DC crossover, Batman actually managed to defeat the Hulk using knock-out gas.",
    "The Teenage Mutant Ninja Turtles once had an official crossover with Archie Comics' Archie Andrews."
];

function startArcadeTicker() {
    if (tipInterval) clearInterval(tipInterval);
    const cycleTip = () => {
        const randomTip = comicTrivia[Math.floor(Math.random() * comicTrivia.length)];
        tickerText.style.opacity = 0;
        setTimeout(() => { tickerText.innerText = randomTip; tickerText.style.opacity = 1; }, 300); 
    };
    setTimeout(cycleTip, 1500); 
    tipInterval = setInterval(cycleTip, 8000);
}

document.addEventListener("DOMContentLoaded", () => {
    initComic();
    startArcadeTicker();
});