// ============================================================
// KONFIGURASI DATABASE & STATE APLIKASI
// ============================================================
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyI_d7HDbDyai1n_ybJJDxV1dVlz5fGuUu7vhEzFJFwwW7tI0_S5UlnwH7hDp_Rhk5Biw/exec";

// Global State
let members = []; 
let renderedMemberIds = new Set();
let currentZoom = 1.0;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.0;

// ------------------------------------------------------------
// 1. FITUR ZOOM POHON SILSILAH
// ------------------------------------------------------------
function zoomTree(delta) {
    currentZoom = Math.min(Math.max(currentZoom + delta, MIN_ZOOM), MAX_ZOOM);
    applyZoom();
}

function resetZoom() {
    currentZoom = 1.0;
    applyZoom();
}

function applyZoom() {
    const container = document.getElementById('tree-container');
    if (!container) return;

    const treeWrapper = container.querySelector('.tree-wrapper-inner');
    const zoomText = document.getElementById('zoom-level');

    if (zoomText) {
        zoomText.innerText = `${Math.round(currentZoom * 100)}%`;
    }

    if (treeWrapper) {
        treeWrapper.style.transform = `scale(${currentZoom})`;
    }
}

// ------------------------------------------------------------
// 2. OPSI FILTER (AKAR = PENCARIAN PANGKAL)
// ------------------------------------------------------------
function updateFilterOptions() {
    // A. Dropdown Generasi
    const genSelect = document.getElementById('filter-gen');
    if (genSelect) {
        const currentVal = genSelect.value;
        const genList = [...new Set(members.map(m => parseInt(m.generasi) || 1))].sort((a, b) => a - b);
        genSelect.innerHTML = `<option value="ALL">Semua Generasi</option>`;
        genList.forEach(g => genSelect.innerHTML += `<option value="${g}">Generasi ${g}</option>`);
        genSelect.value = currentVal;
    }

    // B. Dropdown Pencarian Pangkal/Akar
    const rootSelect = document.getElementById('filter-root');
    if (rootSelect) {
        const currentVal = rootSelect.value;
        const sortedMembers = [...members].sort((a, b) => {
            if (a.generasi !== b.generasi) return a.generasi - b.generasi;
            return a.nama.localeCompare(b.nama);
        });

        rootSelect.innerHTML = `<option value="ALL">Semua Akar (Pohon Utama)</option>`;
        sortedMembers.forEach(m => {
            rootSelect.innerHTML += `<option value="${m.id}">Pangkal: ${m.nama} (Gen ${m.generasi || 1})</option>`;
        });

        rootSelect.value = [...rootSelect.options].some(opt => opt.value === currentVal) ? currentVal : "ALL";
    }
}

// ------------------------------------------------------------
// 3. RENDER TREE VIEW (DENGAN FILTER & ZOOM FIT)
// ------------------------------------------------------------
function renderTreeView(container, filteredMembers, selectedRoot = 'ALL') {
    container.innerHTML = '';
    renderedMemberIds = new Set();
    const selectedGen = document.getElementById('filter-gen')?.value || 'ALL';

    const treeWrapper = document.createElement('div');
    treeWrapper.className = 'tree-wrapper-inner';

    // JIKA TAMPILAN PER-GENERASI (Flat List / Flex Matriks)
    if (selectedGen !== 'ALL') {
        const flexContainer = document.createElement('div');
        flexContainer.className = 'flex flex-wrap justify-center items-start gap-6 max-w-7xl';

        let remaining = [...filteredMembers];

        while (remaining.length > 0) {
            const member = remaining.shift();
            if (renderedMemberIds.has(member.id)) continue;

            renderedMemberIds.add(member.id);

            const spouseId = member.pasanganId;
            let spouse = spouseId ? members.find(m => m.id === spouseId) : null;
            if (spouse) renderedMemberIds.add(spouse.id);

            const coupleBox = document.createElement('div');
            coupleBox.className = 'couple-box';
            
            coupleBox.appendChild(createMemberCard(member));

            if (spouse) {
                const heartBadge = document.createElement('div');
                heartBadge.className = 'text-pink-500 text-xs font-bold px-1';
                heartBadge.innerHTML = '<i class="fa-solid fa-heart"></i>';
                coupleBox.appendChild(heartBadge);
                coupleBox.appendChild(createMemberCard(spouse));
            }

            flexContainer.appendChild(coupleBox);
        }

        treeWrapper.appendChild(flexContainer);
    } 
    // JIKA TAMPILAN POHON SILSILAH BERKETINGGIAN
    else {
        let rootCandidates = [];

        if (selectedRoot !== 'ALL') {
            const rootObj = members.find(m => m.id === selectedRoot);
            if (rootObj) rootCandidates = [rootObj];
        } else {
            const minGen = Math.min(...filteredMembers.map(m => parseInt(m.generasi) || 1));
            const topGenMembers = filteredMembers.filter(m => (parseInt(m.generasi) || 1) === minGen);
            const primaryRoots = topGenMembers.filter(m => (!m.ayahId || m.ayahId.trim() === "") && (!m.ibuId || m.ibuId.trim() === ""));

            if (primaryRoots.length > 0) rootCandidates = [primaryRoots[0]];
            else if (topGenMembers.length > 0) rootCandidates = [topGenMembers[0]];
        }

        rootCandidates.forEach(root => {
            if (!renderedMemberIds.has(root.id)) {
                const treeNode = buildTreeNode(root, filteredMembers);
                if (treeNode) treeWrapper.appendChild(treeNode);
            }
        });
    }

    container.appendChild(treeWrapper);
    
    // Terapkan Zoom Saat Ini
    applyZoom();

    setTimeout(() => { 
        container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2; 
    }, 100);
}
