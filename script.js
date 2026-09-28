// ============================================================
// DATA SILSILAH LENGKAP (CONTOH 3 GENERASI)
// ============================================================

const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzBo9d7OP8HX4V8Ti6vD2z2xz62WBTYk17aj9zKATcymeOfr4axzsOgkns8l4sVP1sCog/exec";

let members = [
    // GENERASI 1 (Akar Utama)
    { id: "1", nama: "KYAI TOTARUNO", gender: "Laki-laki", statusHidup: "Wafat", generasi: 1, ayahId: "", ibuId: "", pasanganId: "2" },
    { id: "2", nama: "NYAI TOTARUNO", gender: "Perempuan", statusHidup: "Wafat", generasi: 1, ayahId: "", ibuId: "", pasanganId: "1" },

    // GENERASI 2 (Anak dari Kyai Totaruno)
    { id: "3", nama: "KARSODIKROMO", gender: "Laki-laki", statusHidup: "Wafat", generasi: 2, ayahId: "1", ibuId: "2", pasanganId: "4" },
    { id: "4", nama: "SIAH", gender: "Perempuan", statusHidup: "Wafat", generasi: 2, ayahId: "", ibuId: "", pasanganId: "3" },
    
    { id: "5", nama: "SURYODIKROMO", gender: "Laki-laki", statusHidup: "Wafat", generasi: 2, ayahId: "1", ibuId: "2", pasanganId: "6" },
    { id: "6", nama: "MARIYAM", gender: "Perempuan", statusHidup: "Wafat", generasi: 2, ayahId: "", ibuId: "", pasanganId: "5" },

    // GENERASI 3 (Cucu / Anak dari Karsodikromo)
    { id: "7", nama: "AHMAD KARSODI", gender: "Laki-laki", statusHidup: "Hidup", generasi: 3, ayahId: "3", ibuId: "4", pasanganId: "" },
    { id: "8", nama: "SITI KARSODI", gender: "Perempuan", statusHidup: "Hidup", generasi: 3, ayahId: "3", ibuId: "4", pasanganId: "" },
    
    // GENERASI 3 (Cucu / Anak dari Suryodikromo)
    { id: "9", nama: "BUDI SURYO", gender: "Laki-laki", statusHidup: "Hidup", generasi: 3, ayahId: "5", ibuId: "6", pasanganId: "" }
]; 

let renderedMemberIds = new Set();
let currentZoom = 1.0;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.0;

// ============================================================
// 1. INISIALISASI APLIKASI
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderApp());
    }

    // Muat opsi dropdown dan tampilkan pohon langsung
    updateFilterOptions();
    renderApp();
});

// Fungsi memuat data dari API / Google Sheets jika ada
async function loadDataFromGoogleSheets() {
    const container = document.getElementById('tree-container');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-16 text-slate-400">
                <i class="fa-solid fa-spinner fa-spin text-4xl mb-3 text-emerald-400"></i>
                <p class="text-sm font-medium">Mengambil data dari Google Sheets...</p>
            </div>`;
    }

    try {
        const response = await fetch(GOOGLE_SHEETS_URL);
        const data = await response.json();

        // Validasi apakah data berbentuk Array dan tidak kosong
        if (Array.isArray(data) && data.length > 0) {
            members = data;
        } else {
            console.warn("Data kosong atau format JSON tidak sesuai:", data);
        }
    } catch (error) {
        console.error("Gagal mengambil data dari Google Sheets:", error);
    } finally {
        // Pembaruan dropdown filter dan render pohon
        updateFilterOptions();
        renderApp();
    }
}

// ============================================================
// 2. FUNGSI UTAMA RENDER APLIKASI
// ============================================================
function renderApp() {
    const container = document.getElementById('tree-container');
    if (!container) return;

    const searchKeyword = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
    const selectedRoot = document.getElementById('filter-root')?.value || 'ALL';
    const selectedGen = document.getElementById('filter-gen')?.value || 'ALL';

    // Filter Anggota
    let filtered = members.filter(m => {
        const matchesSearch = !searchKeyword || m.nama.toLowerCase().includes(searchKeyword);
        const matchesGen = selectedGen === 'ALL' || String(m.generasi) === String(selectedGen);
        return matchesSearch && matchesGen;
    });

    // Update Counter Total
    const totalCountEl = document.getElementById('total-count');
    if (totalCountEl) totalCountEl.innerText = filtered.length;

    if (members.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 text-slate-500">
                <i class="fa-solid fa-database text-4xl mb-3 block text-emerald-500/50"></i>
                <p class="text-sm font-medium">Memuat data atau belum ada anggota terdaftar...</p>
            </div>`;
        return;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 text-slate-500">
                <i class="fa-solid fa-user-slash text-4xl mb-3 block"></i>
                <p class="text-sm font-medium">Tidak ditemukan anggota keluarga yang sesuai dengan kriteria filter.</p>
            </div>`;
        return;
    }

    // Render Pohon
    renderTreeView(container, filtered, selectedRoot);
}

// ============================================================
// 3. FITUR ZOOM CONTROL
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

    if (zoomText) {
        zoomText.innerText = `${Math.round(currentZoom * 100)}%`;
    }

    if (treeWrapper) {
        treeWrapper.style.transform = `scale(${currentZoom})`;
    }
}

// ============================================================
// 4. UPDATE DROPDOWN FILTER
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

// ============================================================
// 5. RENDER TREE VIEW & REKURSIF POHON
// ============================================================
function renderTreeView(container, filteredMembers, selectedRoot = 'ALL') {
    container.innerHTML = '';
    renderedMemberIds = new Set();
    const selectedGen = document.getElementById('filter-gen')?.value || 'ALL';

    const treeWrapper = document.createElement('div');
    treeWrapper.className = 'tree-wrapper-inner';

    // TAMPILAN MATRIKS PER-GENERASI
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
    // TAMPILAN POHON SILSILAH UTAMA
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
    applyZoom();

    setTimeout(() => { 
        container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2; 
    }, 100);
}

// Rekursi Pembentuk Cabang & Anak
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

    // Cari Keturunan / Anak-anak
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

// Pembuat Kartu Anggota
function createMemberCard(member) {
    const card = document.createElement('div');
    card.className = 'flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-xl min-w-[170px] shadow-sm hover:border-emerald-500/50 transition cursor-pointer';

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
    `;

    return card;
}

// ============================================================
// LOGIKA MODAL FORM TAMBAH ANGGOTA
// ============================================================

// Buka Modal & Isi Pilihan Ayah, Ibu, Pasangan
function openModal() {
    const modal = document.getElementById('modal-tambah');
    if (!modal) return;

    // Reset Form
    document.getElementById('form-add-member').reset();

    // Population dropdown Ayah, Ibu, Pasangan dari data members yang ada
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

    modal.classList.remove('hidden');
}

// Tutup Modal
function closeModal() {
    const modal = document.getElementById('modal-tambah');
    if (modal) modal.classList.add('hidden');
}

// Simpan Anggota Baru
function submitMember(event) {
    event.preventDefault();

    const newMember = {
        id: String(Date.now()), // Unique ID berbasis timestamp
        nama: document.getElementById('add-nama').value.trim().toUpperCase(),
        gender: document.getElementById('add-gender').value,
        statusHidup: document.getElementById('add-status').value,
        generasi: parseInt(document.getElementById('add-generasi').value) || 1,
        ayahId: document.getElementById('add-ayah').value,
        ibuId: document.getElementById('add-ibu').value,
        pasanganId: document.getElementById('add-pasangan').value
    };

    // Tambahkan ke array lokal
    members.push(newMember);

    // Jika anggota baru diset punya pasangan, perbarui referensi pasangan sebaliknya
    if (newMember.pasanganId) {
        const spouse = members.find(m => m.id === newMember.pasanganId);
        if (spouse) spouse.pasanganId = newMember.id;
    }

    // Refresh Tampilan & Dropdown
    updateFilterOptions();
    renderApp();
    closeModal();
}
