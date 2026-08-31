const API_URL = "https://my-fastapi-service-beta.vercel.app";

    // --- State Variables ---
    let rawCatalog = [];
    let filteredHeroes = [];
    let currentPage = 1;
    const itemsPerPage = 8;
    let isStripMode = false;

    // --- DOM Elements ---
    const stage = document.getElementById("comic-stage");
    const searchInput = document.getElementById("search-input");
    const resetBtn = document.getElementById("reset-btn");
    const tabBtns = document.querySelectorAll(".tab-btn");
    const viewModeBtn = document.getElementById("view-mode-btn");
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");
    const pageIndicator = document.getElementById("page-indicator");
    const flipper = document.getElementById("page-flipper");

    const modal = document.getElementById("detail-modal");
    const modalBody = document.getElementById("modal-body");
    const closeModalBtn = document.getElementById("close-modal");

    // --- Dummy Audio Mock (Prevents crashes if you don't have sound files set up) ---
    const AudioFX = {
        playFlip: () => { console.log("*Page turn sound*"); }
    };

    // --- Initialization ---
    async function initArchive() {
        try {
            // Fetches data from your FastAPI backend using the explicit API URL
            const response = await fetch(`${API_URL}/heroes`);
            if (!response.ok) throw new Error("Failed to fetch backend data.");
            
            rawCatalog = await response.json();
            filteredHeroes = [...rawCatalog];
            renderReader();
        } catch (error) {
            stage.innerHTML = `<div class="narrative-box error">🚨 ERROR REPORT: ${error.message}</div>`;
        }
    }

    // --- Render Logic ---
    function renderReader() {
        stage.innerHTML = "";
        
        if (filteredHeroes.length === 0) {
            stage.innerHTML = `<div class="narrative-box">NO METAHUMANS FOUND IN THIS QUADRANT.</div>`;
            flipper.style.display = "none";
            return;
        }

        let itemsToRender = filteredHeroes;

        if (!isStripMode) {
            flipper.style.display = "flex";
            const totalPages = Math.ceil(filteredHeroes.length / itemsPerPage);
            
            // Safety check for empty or out-of-bounds pages
            if (currentPage > totalPages) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;

            pageIndicator.textContent = `PAGE ${currentPage} OF ${totalPages}`;
            prevBtn.disabled = currentPage === 1;
            nextBtn.disabled = currentPage === totalPages;

            const startIndex = (currentPage - 1) * itemsPerPage;
            itemsToRender = filteredHeroes.slice(startIndex, startIndex + itemsPerPage);
        } else {
            flipper.style.display = "none";
        }

        // Build the character cards
        itemsToRender.forEach(hero => {
            const panel = document.createElement("div");
            panel.className = "comic-panel";
            panel.innerHTML = `
                <div class="panel-header">${hero.alias.toUpperCase()}</div>
                <img class="panel-image" src="${hero.image}" alt="${hero.alias}">
                <div class="panel-caption">
                    <strong>ID:</strong> ${hero.civilian_name}<br>
                    <strong>AFFILIATION:</strong> ${hero.affiliation}
                </div>
            `;
            panel.addEventListener("click", () => openModal(hero));
            stage.appendChild(panel);
        });
    }

    // --- Universe Tab Filtering ---
    tabBtns.forEach(tab => {
        tab.addEventListener("click", () => {
            AudioFX.playFlip();
            
            // Update active tab styling
            tabBtns.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            
            const filter = tab.dataset.filter;
            searchInput.value = ""; // Clear search when switching universes

            if (filter === "ALL") {
                filteredHeroes = [...rawCatalog];
            } else if (filter === "MARVEL") {
                const marvelTeams = ["AVENGERS", "X-MEN", "FANTASTIC", "DEFENDERS", "MYSTIC", "WEB-WARRIORS", "X-FORCE", "WAKANDA"];
                filteredHeroes = rawCatalog.filter(h => marvelTeams.some(team => h.affiliation.toUpperCase().includes(team)));
            } else if (filter === "DC") {
                const dcTeams = ["JUSTICE", "TITANS", "SUICIDE", "WATCHMEN", "GREEN LANTERN"];
                filteredHeroes = rawCatalog.filter(h => dcTeams.some(team => h.affiliation.toUpperCase().includes(team)));
            } else if (filter === "IMAGE") {
                const imageTeams = ["GLOBE", "VILTRUM", "SCORCHED", "FREAK"];
                filteredHeroes = rawCatalog.filter(h => imageTeams.some(team => h.affiliation.toUpperCase().includes(team)));
            } else if (filter === "DARK_HORSE") {
                const dhTeams = ["B.P.R.D.", "UMBRELLA"];
                filteredHeroes = rawCatalog.filter(h => dhTeams.some(team => h.affiliation.toUpperCase().includes(team)));
            } else if (filter === "DYNAMITE") {
                const dynTeams = ["THE BOYS", "THE SEVEN"];
                filteredHeroes = rawCatalog.filter(h => dynTeams.some(team => h.affiliation.toUpperCase().includes(team)));
            } else if (filter === "VALIANT") {
                const valTeams = ["UNITY", "RISING SUN", "MI-6"];
                filteredHeroes = rawCatalog.filter(h => valTeams.some(team => h.affiliation.toUpperCase().includes(team)));
            } else if (filter === "INDIE") {
                const indieTeams = ["TURTLES", "CRIMEFIGHTERS", "JUSTICE FOREVER", "JUSTICE DEPARTMENT"];
                filteredHeroes = rawCatalog.filter(h => indieTeams.some(team => h.affiliation.toUpperCase().includes(team)));
            }

            currentPage = 1;
            renderReader();
        });
    });

    // --- Search and View Toggles ---
    searchInput.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        
        // Reset tabs to "ALL" visually when searching
        tabBtns.forEach(t => t.classList.remove("active"));
        document.querySelector('[data-filter="ALL"]').classList.add("active");

        filteredHeroes = rawCatalog.filter(h => 
            h.alias.toLowerCase().includes(term) ||
            h.civilian_name.toLowerCase().includes(term) ||
            h.primary_powers.toLowerCase().includes(term)
        );
        
        currentPage = 1;
        renderReader();
    });

    resetBtn.addEventListener("click", () => {
        searchInput.value = "";
        filteredHeroes = [...rawCatalog];
        tabBtns.forEach(t => t.classList.remove("active"));
        document.querySelector('[data-filter="ALL"]').classList.add("active");
        currentPage = 1;
        renderReader();
    });

    viewModeBtn.addEventListener("click", () => {
        isStripMode = !isStripMode;
        viewModeBtn.textContent = isStripMode ? "📑 SWITCH TO PAGE MODE" : "📖 SWITCH TO CONTINUOUS STRIP";
        stage.classList.toggle("continuous-strip-mode");
        renderReader();
    });

    // --- Pagination Controls ---
    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            AudioFX.playFlip();
            currentPage--;
            renderReader();
        }
    });

    nextBtn.addEventListener("click", () => {
        const totalPages = Math.ceil(filteredHeroes.length / itemsPerPage);
        if (currentPage < totalPages) {
            AudioFX.playFlip();
            currentPage++;
            renderReader();
        }
    });

    // --- Modal Controls ---
    function openModal(hero) {
        modalBody.innerHTML = `
            <h2 class="modal-title">${hero.alias}</h2>
            <p><strong>TRUE NAME:</strong> ${hero.civilian_name}</p>
            <p><strong>CLASS:</strong> ${hero.classification}</p>
            <p><strong>THREAT LEVEL:</strong> ${hero.threat_level}</p>
            <p><strong>POWERS:</strong> ${hero.primary_powers}</p>
            <p><strong>WEAKNESSES:</strong> ${hero.tactical_vulnerability}</p>
            <p><strong>GEAR:</strong> ${hero.signature_gear}</p>
            <hr>
            <p><em>DOSSIER NOTES:</em> ${hero.psychological_dossier}</p>
        `;
        modal.classList.remove("hidden");
    }

    closeModalBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    // Run initialization on load
    initArchive();
