// ============================================================
// DATA SILSILAH LENGKAP (CONTOH 3 GENERASI)
// ============================================================
// Ganti URL ini dengan URL Web App Google Apps Script Anda jika ada
const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbzBo9d7OP8HX4V8Ti6vD2z2xz62WBTYk17aj9zKATcymeOfr4axzsOgkns8l4sVP1sCog/exec"; 

// Data Dummy Default
let members = [
    { id: "1", nama: "PRAMUDJO SUWARNO", gender: "Laki-laki", statusHidup: "Hidup", generasi: 1, ayahId: "", ibuId: "", pasanganId: "" },
    { id: "2", nama: "SUTASMIATUN", gender: "Perempuan", statusHidup: "Hidup", generasi: 2, ayahId: "1", ibuId: "", pasanganId: "3" },
    { id: "3", nama: "TOTOK SUGIARTO", gender: "Laki-laki", statusHidup: "Hidup", generasi: 2, ayahId: "", ibuId: "", pasanganId: "2" },
    { id: "4", nama: "SUKATRI", gender: "Perempuan", statusHidup: "Hidup", generasi: 2, ayahId: "1", ibuId: "", pasanganId: "5" },
    { id: "5", nama: "PANGGIH", gender: "Laki-laki", statusHidup: "Hidup", generasi: 2, ayahId: "", ibuId: "", pasanganId: "4" },
    { id: "6", nama: "SRUASTI", gender: "Perempuan", statusHidup: "Hidup", generasi: 2, ayahId: "1", ibuId: "", pasanganId: "7" },
    { id: "7", nama: "NARSANTOSO", gender: "Laki-laki", statusHidup: "Hidup", generasi: 2, ayahId: "", ibuId: "", pasanganId: "6" },
    { id: "8", nama: "VIVI", gender: "Perempuan", statusHidup: "Hidup", generasi: 3, ayahId: "3", ibuId: "2", pasanganId: "" },
    { id: "9", nama: "TAMI", gender: "Perempuan", statusHidup: "Hidup", generasi: 3, ayahId: "3", ibuId: "2", pasanganId: "" },
    { id: "10", nama: "HANA", gender: "Perempuan", statusHidup: "Hidup", generasi: 3, ayahId: "3", ibuId: "2", pasanganId: "" },
    { id: "11", nama: "HANI", gender: "Perempuan", statusHidup: "Hidup", generasi: 3, ayahId: "3", ibuId: "2", pasanganId: "" },
    { id: "12", nama: "DAVA FN", gender: "Laki-laki", statusHidup: "Hidup", generasi: 3, ayahId: "7", ibuId: "6", pasanganId: "" }
];

let renderedMemberIds = new Set();
let currentZoom = 1.0;
let isAdminMode = false;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.0;

// ============================================================
// 1. INITIALIZATION & ADMIN TOGGLE
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderApp());
    }

    loadDataFromGoogleSheets();
});

// Load Data Google Sheets dengan Safe Timeout & Fallback Status
async function loadDataFromGoogleSheets() {
    const container = document.getElementById('tree-container');
    const statusBadge = document.getElementById('db-status-badge');
    const statusDot = document.getElementById('db-status-dot');
    const statusText = document.getElementById('db-status-text');

    if (container) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
                <i class="fa-solid fa-circle-notch fa-spin text-2xl text-emerald-500"></i>
                <p class="text-xs">Mengambil data silsilah...</p>
            </div>
        `;
    }

    if (statusText) statusText.innerText = "Menghubungkan...";
    if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-amber-500 animate-pulse";
    if (statusBadge) statusBadge.className = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-amber-400 border border-slate-700/60";

    try {
        if (!GOOGLE_SHEETS_API_URL || GOOGLE_SHEETS_API_URL.trim() === "") {
            throw new Error("URL API Google Sheets belum dikonfigurasi.");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 detik timeout

        const response = await fetch(GOOGLE_SHEETS_API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            members = data;
        }

        if (statusText) statusText.innerText = "Google Sheets Terhubung";
        if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-emerald-500 animate-pulse";
        if (statusBadge) statusBadge.className = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-emerald-400 border border-slate-700/60";

    } catch (error) {
        console.warn("Koneksi Google Sheets gagal/offline, menggunakan data lokal:", error.message);

        if (statusText) statusText.innerText = "Mode Offline / Lokal";
        if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-rose-500";
        if (statusBadge) statusBadge.className = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-rose-400 border border-slate-700/60";
    } finally {
        updateFilterOptions();
        renderApp();
    }
}

function toggleAdminMode() {
    isAdminMode = !isAdminMode;
    const btnAdmin = document.getElementById('btn-admin');
    const iconAdmin = document.getElementById('icon-admin');
    const textAdmin = document.getElementById('text-admin');

    if (isAdminMode) {
        btnAdmin.className = "px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg border border-emerald-500 flex items-center gap-2 font-medium transition shadow-lg shadow-emerald-900/30 cursor-pointer";
        if (iconAdmin) iconAdmin.className = "fa-solid fa-lock-open text-xs";
        if (textAdmin) textAdmin.innerText = "Mode Admin (Aktif)";
    } else {
        btnAdmin.className = "px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 flex items-center gap-2 font-medium transition cursor-pointer";
        if (iconAdmin) iconAdmin.className = "fa-solid fa-lock text-xs";
        if (textAdmin) textAdmin.innerText = "Mode Admin";
    }

    renderApp();
}

// ============================================================
// 2. RENDER POHON & KARTU ANGGOTA
// ============================================================
function renderApp() {
    const container = document.getElementById('tree-container');
    if (!container) return;

    const searchKeyword = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
    const selectedRoot = document.getElementById('filter-root')?.value || 'ALL';
    const selectedGen = document.getElementById('filter-gen')?.value || 'ALL';

    let filtered = members.filter(m => {
        const matchesSearch = !searchKeyword || m.nama.toLowerCase().includes(searchKeyword);
        const matchesGen = selectedGen === 'ALL' || String(m.generasi) === String(selectedGen);
        return matchesSearch && matchesGen;
    });

    const totalCountEl = document.getElementById('total-count');
    if (totalCountEl) totalCountEl.innerText = filtered.length;

    renderTreeView(container, filtered, selectedRoot);
}

function renderTreeView(container, filteredMembers, selectedRoot = 'ALL') {
    container.innerHTML = '';
    renderedMemberIds = new Set();
    const selectedGen = document.getElementById('filter-gen')?.value || 'ALL';

    const treeWrapper = document.createElement('div');
    treeWrapper.className = 'tree-wrapper-inner';

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
    } else {
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
    applyZoom();
}

function buildTreeNode(member, filteredList) {
    if (!member) return null;

    renderedMemberIds.add(member.id);

    const nodeContainer = document.createElement('div');
    nodeContainer.className = 'tree-node';

    const coupleBox = document.createElement('div');
    coupleBox.className = 'couple-box';
    coupleBox.appendChild(createMemberCard(member));

    const spouseId = member.pasanganId;
    let spouse = spouseId ? members.find(m => m.id === spouseId) : null;
    if (spouse) {
        renderedMemberIds.add(spouse.id);
        const heartBadge = document.createElement('div');
        heartBadge.className = 'text-pink-500 text-xs font-bold px-1';
        heartBadge.innerHTML = '<i class="fa-solid fa-heart"></i>';
        coupleBox.appendChild(heartBadge);
        coupleBox.appendChild(createMemberCard(spouse));
    }

    nodeContainer.appendChild(coupleBox);

    const children = members.filter(m => 
        (m.ayahId && m.ayahId === member.id) || 
        (m.ibuId && m.ibuId === member.id) || 
        (spouse && ((m.ayahId && m.ayahId === spouse.id) || (m.ibuId && m.ibuId === spouse.id)))
    );

    if (children.length > 0) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';

        children.forEach(child => {
            const childWrapper = document.createElement('div');
            childWrapper.className = 'tree-node-child';
            const childNode = buildTreeNode(child, filteredList);
            if (childNode) {
                childWrapper.appendChild(childNode);
                childrenContainer.appendChild(childWrapper);
            }
        });

        if (childrenContainer.children.length > 0) {
            nodeContainer.appendChild(childrenContainer);
        }
    }

    return nodeContainer;
}

// Pembuat Kartu Anggota (Tombol +Kerabat SELALU MUNCUL DI SETIAP KARTU)
function createMemberCard(member) {
    const card = document.createElement('div');
    card.className = 'relative group flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-xl min-w-[170px] shadow-sm hover:border-emerald-500/50 transition cursor-pointer';

    const avatarUrl = member.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.nama)}&background=0D8ABC&color=fff`;
    const isWafat = member.statusHidup === 'Wafat' || member.wafat;

    card.innerHTML = `
        <div class="relative">
            <img src="${avatarUrl}" class="w-10 h-10 rounded-full object-cover border border-slate-600">
        </div>
        <div class="flex flex-col">
            <h4 class="text-xs font-bold text-slate-100 uppercase tracking-wider line-clamp-1">${member.nama}</h4>
            <div class="flex items-center gap-1 mt-1">
                <span class="text-[10px] px-1.5 py-0.5 rounded font-medium ${member.gender === 'Perempuan' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}">
                    ${member.gender || 'Laki-laki'}
                </span>
                <span class="text-[10px] px-1.5 py-0.5 rounded font-medium ${isWafat ? 'bg-slate-700 text-slate-400' : 'bg-emerald-500/20 text-emerald-400'}">
                    ${isWafat ? 'Wafat' : 'Hidup'}
                </span>
            </div>
        </div>

        <!-- Tombol (+) TAMBAH KERABAT: SELALU AKTIF DI KANAN ATAS KARTU -->
        <button onclick="openModalForRelation('${member.id}')" title="Tambah Anak / Kerabat dari ${member.nama}" class="absolute -top-2 -right-2 bg-emerald-600 hover:bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md transition z-10 cursor-pointer">
            <i class="fa-solid fa-plus"></i>
        </button>

        <!-- Tombol EDIT & HAPUS: HANYA DITAMPILKAN SAAT MODE ADMIN AKTIF -->
        ${isAdminMode ? `
            <div class="absolute -bottom-2 right-2 flex items-center gap-1 z-10">
                <button onclick="editMember('${member.id}')" title="Edit Data" class="bg-amber-600 hover:bg-amber-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-md transition cursor-pointer">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button onclick="deleteMember('${member.id}')" title="Hapus Anggota" class="bg-rose-600 hover:bg-rose-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-md transition cursor-pointer">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        ` : ''}
    `;

    return card;
}

// ============================================================
// 3. ZOOM CONTROLS
// ============================================================
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

    if (zoomText) zoomText.innerText = `${Math.round(currentZoom * 100)}%`;
    if (treeWrapper) treeWrapper.style.transform = `scale(${currentZoom})`;
}

// ============================================================
// 4. DROPDOWN & MODAL FORM LOGIC
// ============================================================
function updateFilterOptions() {
    const genSelect = document.getElementById('filter-gen');
    if (genSelect) {
        const currentVal = genSelect.value;
        const genList = [...new Set(members.map(m => parseInt(m.generasi) || 1))].sort((a, b) => a - b);
        genSelect.innerHTML = `<option value="ALL">Semua Generasi</option>`;
        genList.forEach(g => genSelect.innerHTML += `<option value="${g}">Generasi ${g}</option>`);
        genSelect.value = [...genSelect.options].some(opt => opt.value === currentVal) ? currentVal : "ALL";
    }

    const rootSelect = document.getElementById('filter-root');
    if (rootSelect) {
        const currentVal = rootSelect.value;
        const sortedMembers = [...members].sort((a, b) => (a.generasi || 1) - (b.generasi || 1));

        rootSelect.innerHTML = `<option value="ALL">Semua Akar (Pohon Utama)</option>`;
        sortedMembers.forEach(m => {
            rootSelect.innerHTML += `<option value="${m.id}">Pangkal: ${m.nama} (Gen ${m.generasi || 1})</option>`;
        });

        rootSelect.value = [...rootSelect.options].some(opt => opt.value === currentVal) ? currentVal : "ALL";
    }
}

function openModal() {
    populateModalDropdowns();
    document.getElementById('form-add-member').reset();
    document.getElementById('edit-member-id').value = "";
    document.getElementById('modal-title').innerText = "Tambah Anggota Keluarga";
    document.getElementById('modal-tambah').classList.remove('hidden');
}

function openModalForRelation(parentId) {
    const parent = members.find(m => m.id === parentId);
    if (!parent) return;

    openModal();
    document.getElementById('modal-title').innerText = `Tambah Anak dari ${parent.nama}`;

    if (parent.gender === 'Laki-laki') {
        document.getElementById('add-ayah').value = parent.id;
        if (parent.pasanganId) document.getElementById('add-ibu').value = parent.pasanganId;
    } else {
        document.getElementById('add-ibu').value = parent.id;
        if (parent.pasanganId) document.getElementById('add-ayah').value = parent.pasanganId;
    }

    document.getElementById('add-generasi').value = (parseInt(parent.generasi) || 1) + 1;
}

function editMember(memberId) {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    openModal();
    document.getElementById('edit-member-id').value = member.id;
    document.getElementById('modal-title').innerText = `Edit Data: ${member.nama}`;
    document.getElementById('add-nama').value = member.nama;
    document.getElementById('add-gender').value = member.gender || 'Laki-laki';
    document.getElementById('add-status').value = member.statusHidup || 'Hidup';
    document.getElementById('add-generasi').value = member.generasi || 1;
    document.getElementById('add-ayah').value = member.ayahId || '';
    document.getElementById('add-ibu').value = member.ibuId || '';
    document.getElementById('add-pasangan').value = member.pasanganId || '';
}

function deleteMember(memberId) {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    if (confirm(`Apakah Anda yakin ingin menghapus "${member.nama}" dari silsilah?`)) {
        members = members.filter(m => m.id !== memberId);
        
        members.forEach(m => {
            if (m.pasanganId === memberId) m.pasanganId = "";
            if (m.ayahId === memberId) m.ayahId = "";
            if (m.ibuId === memberId) m.ibuId = "";
        });

        updateFilterOptions();
        renderApp();
    }
}

function closeModal() {
    document.getElementById('modal-tambah').classList.add('hidden');
}

function populateModalDropdowns() {
    const ayahSelect = document.getElementById('add-ayah');
    const ibuSelect = document.getElementById('add-ibu');
    const pasanganSelect = document.getElementById('add-pasangan');

    let ayahOptions = '<option value="">-- Tanpa Ayah --</option>';
    let ibuOptions = '<option value="">-- Tanpa Ibu --</option>';
    let pasanganOptions = '<option value="">-- Tanpa Pasangan --</option>';

    members.forEach(m => {
        if (m.gender === 'Laki-laki') {
            ayahOptions += `<option value="${m.id}">${m.nama} (Gen ${m.generasi || 1})</option>`;
        } else {
            ibuOptions += `<option value="${m.id}">${m.nama} (Gen ${m.generasi || 1})</option>`;
        }
        pasanganOptions += `<option value="${m.id}">${m.nama}</option>`;
    });

    if (ayahSelect) ayahSelect.innerHTML = ayahOptions;
    if (ibuSelect) ibuSelect.innerHTML = ibuOptions;
    if (pasanganSelect) pasanganSelect.innerHTML = pasanganOptions;
}

function submitMember(event) {
    event.preventDefault();

    const editId = document.getElementById('edit-member-id').value;
    const memberData = {
        id: editId ? editId : String(Date.now()),
        nama: document.getElementById('add-nama').value.trim().toUpperCase(),
        gender: document.getElementById('add-gender').value,
        statusHidup: document.getElementById('add-status').value,
        generasi: parseInt(document.getElementById('add-generasi').value) || 1,
        ayahId: document.getElementById('add-ayah').value,
        ibuId: document.getElementById('add-ibu').value,
        pasanganId: document.getElementById('add-pasangan').value
    };

    if (editId) {
        const index = members.findIndex(m => m.id === editId);
        if (index !== -1) members[index] = memberData;
    } else {
        members.push(memberData);
    }

    if (memberData.pasanganId) {
        const spouse = members.find(m => m.id === memberData.pasanganId);
        if (spouse) spouse.pasanganId = memberData.id;
    }

    updateFilterOptions();
    renderApp();
    closeModal();
}
