// ============================================================
// KONFIGURASI DATABASE GOOGLE SHEETS (TERHUBUNG OTOMATIS)
// ============================================================
// Tempelkan URL Google Apps Script Web App Anda di sini:
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxLSVQPcbETmXAna8tSs7uIweqzM1HJpbn9lExO7kyPa_Hcr6e0Pyw8CtBCSMve9a3_Xg/exec";

// State Utama Aplikasi
let members = [];
let isAdmin = false;
let viewMode = 'tree'; // Mode tampilan: 'tree' | 'grid'
let renderedMemberIds = new Set(); // Mencegah duplikasi kartu di Pohon

const ADMIN_PIN = "1234"; // PIN default mode admin

// Data Cadangan Default (Jika spreadsheet masih kosong)
const defaultMembers = [
    { id: "m1", nama: "Kaidi", gender: "L", generasi: 1, status: "Hidup", ayahId: "", ibuId: "", pasanganId: "m2", foto: "", catatan: "Kakek" },
    { id: "m2", nama: "Tukirah", gender: "P", generasi: 1, status: "Hidup", ayahId: "", ibuId: "", pasanganId: "m1", foto: "", catatan: "Nenek" },
    { id: "m3", nama: "Budi Santoso", gender: "L", generasi: 2, status: "Hidup", ayahId: "m1", ibuId: "m2", pasanganId: "m4", foto: "", catatan: "Anak Pertama" },
    { id: "m4", nama: "Wiwit", gender: "P", generasi: 2, status: "Hidup", ayahId: "", ibuId: "", pasanganId: "m3", foto: "", catatan: "Istri Budi" },
    { id: "m5", nama: "Zeni DS", gender: "P", generasi: 2, status: "Hidup", ayahId: "m1", ibuId: "m2", pasanganId: "", foto: "", catatan: "Anak Kedua" },
    { id: "m6", nama: "Kana Zs", gender: "P", generasi: 3, status: "Hidup", ayahId: "m3", ibuId: "m4", pasanganId: "", foto: "", catatan: "Cucu" }
];

// Inisialisasi Aplikasi Saat Halaman Dimuat
document.addEventListener('DOMContentLoaded', () => {
    // Langsung ambil data dari Google Sheets tanpa input manual
    fetchDataFromDatabase();
});

// Update Badge Status Database
function updateDbBadge(status, text) {
    const dot = document.getElementById('status-dot');
    const label = document.getElementById('status-text');

    if (label) label.innerText = text;
    if (dot) {
        if (status === 'connected') {
            dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse";
        } else if (status === 'loading') {
            dot.className = "w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping";
        } else {
            dot.className = "w-2.5 h-2.5 rounded-full bg-amber-400";
        }
    }
}

// ============================================================
// 1. OTOMATIS AMBIL DATA DARI DATABASE (GET / READ)
// ============================================================
async function fetchDataFromDatabase() {
    updateDbBadge('loading', 'Menghubungkan Database...');

    // Jika URL belum diganti/diisi
    if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_SCRIPT_ID_HERE")) {
        console.warn("URL Script belum diset. Menggunakan data Lokal.");
        loadLocalStorage();
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
            members = data.map(item => ({
                ...item,
                generasi: parseInt(item.generasi) || 1
            }));
            // Backup data terbaru ke LocalStorage
            localStorage.setItem('local_members', JSON.stringify(members));
            updateDbBadge('connected', 'Google Sheets Terhubung');
        } else {
            // Jika spreadsheet kosong
            loadLocalStorage();
        }
    } catch (err) {
        console.error('Database Sync Error:', err);
        loadLocalStorage();
    }

    renderApp();
}

function loadLocalStorage() {
    members = JSON.parse(localStorage.getItem('local_members')) || defaultMembers;
    updateDbBadge('offline', 'Mode Offline / Lokal');
    renderApp();
}

// ============================================================
// 2. OTOMATIS SIMPAN KE DATABASE (POST / SAVE)
// ============================================================
async function saveDataToDatabase() {
    // 1. Simpan ke LocalStorage dulu agar respons cepat
    localStorage.setItem('local_members', JSON.stringify(members));
    renderApp();

    if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_SCRIPT_ID_HERE")) return;

    updateDbBadge('loading', 'Menyimpan...');

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'saveAll',
                members: members
            })
        });

        setTimeout(() => {
            updateDbBadge('connected', 'Google Sheets Terhubung');
        }, 800);
    } catch (err) {
        console.error('Save Error:', err);
        updateDbBadge('offline', 'Gagal Simpan ke Sheets');
    }
}

// ============================================================
// 3. RENDER POHON SILSILAH TANPA DUPLIKASI
// ============================================================
function renderApp() {
    updateFilterOptions();
    const container = document.getElementById('tree-container');
    if (!container) return;

    container.innerHTML = '';

    const searchInput = document.getElementById('search-input');
    const filterGenSelect = document.getElementById('filter-gen');

    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedGen = filterGenSelect ? filterGenSelect.value : 'ALL';

    let filtered = members.filter(m => m.nama.toLowerCase().includes(searchQuery));
    if (selectedGen !== 'ALL') {
        filtered = filtered.filter(m => m.generasi === parseInt(selectedGen));
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center py-12 text-slate-500 font-medium">Tidak ada data anggota ditemukan.</div>`;
        return;
    }

    if (viewMode === 'grid') {
        renderGridView(container, filtered);
    } else {
        renderTreeView(container, filtered);
    }
}

function renderTreeView(container, filteredMembers) {
    // Reset tracker global untuk cegah ganda
    renderedMemberIds = new Set();

    // Cari akar keluarga
    let rootCandidates = filteredMembers.filter(m => !m.ayahId && !m.ibuId);

    if (rootCandidates.length === 0 && filteredMembers.length > 0) {
        const minGen = Math.min(...filteredMembers.map(m => m.generasi));
        rootCandidates = filteredMembers.filter(m => m.generasi === minGen);
    }

    const treeWrapper = document.createElement('div');
    treeWrapper.className = 'flex flex-col items-center gap-12 overflow-x-auto py-6 w-full';

    rootCandidates.forEach(root => {
        if (!renderedMemberIds.has(root.id)) {
            const treeNode = buildTreeNode(root, filteredMembers);
            if (treeNode) treeWrapper.appendChild(treeNode);
        }
    });

    container.appendChild(treeWrapper);
}

function buildTreeNode(member, allMembers) {
    if (renderedMemberIds.has(member.id)) return null;

    renderedMemberIds.add(member.id);

    const nodeContainer = document.createElement('div');
    nodeContainer.className = 'flex flex-col items-center tree-node';

    // Pasangan
    const spouse = allMembers.find(m => m.id === member.pasanganId);
    if (spouse) renderedMemberIds.add(spouse.id);

    // Kotak Keluarga
    const coupleBox = document.createElement('div');
    coupleBox.className = 'flex items-center gap-2 relative bg-slate-800/80 p-2 rounded-2xl border border-slate-700/80 shadow-lg';

    coupleBox.appendChild(createMemberCard(member));
    if (spouse) {
        const heartBadge = document.createElement('div');
        heartBadge.className = 'text-pink-500 text-xs font-bold px-1';
        heartBadge.innerHTML = '<i class="fa-solid fa-heart"></i>';
        coupleBox.appendChild(heartBadge);
        coupleBox.appendChild(createMemberCard(spouse));
    }

    nodeContainer.appendChild(coupleBox);

    // Anak-anak
    const children = allMembers.filter(m => {
        if (renderedMemberIds.has(m.id)) return false;
        const isChildOfMember = (m.ayahId && m.ayahId === member.id) || (m.ibuId && m.ibuId === member.id);
        const isChildOfSpouse = spouse && ((m.ayahId && m.ayahId === spouse.id) || (m.ibuId && m.ibuId === spouse.id));
        return isChildOfMember || isChildOfSpouse;
    });

    if (children.length > 0) {
        const lineDown = document.createElement('div');
        lineDown.className = 'tree-line-v h-6';
        nodeContainer.appendChild(lineDown);

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'flex items-start justify-center relative pt-4 gap-6';

        if (children.length > 1) {
            const lineHorizontal = document.createElement('div');
            lineHorizontal.className = 'tree-line-h absolute top-0 left-6 right-6';
            childrenContainer.appendChild(lineHorizontal);
        }

        children.forEach(child => {
            if (!renderedMemberIds.has(child.id)) {
                const childWrapper = document.createElement('div');
                childWrapper.className = 'flex flex-col items-center relative';

                const lineUp = document.createElement('div');
                lineUp.className = 'tree-line-v h-4 absolute -top-4';
                childWrapper.appendChild(lineUp);

                const childNode = buildTreeNode(child, allMembers);
                if (childNode) {
                    childWrapper.appendChild(childNode);
                    childrenContainer.appendChild(childWrapper);
                }
            }
        });

        if (childrenContainer.children.length > 0) {
            nodeContainer.appendChild(childrenContainer);
        }
    }

    return nodeContainer;
}

// Render Mode Grid
function renderGridView(container, filteredMembers) {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
    filteredMembers.forEach(m => grid.appendChild(createMemberCard(m)));
    container.appendChild(grid);
}

// Element Kartu Anggota
function createMemberCard(m) {
    const card = document.createElement('div');
    card.className = "member-card bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-between relative shadow-md group w-full max-w-xs";

    const defaultAvatar = m.gender === 'L' ? 'https://avatar.iran.liara.run/public/boy' : 'https://avatar.iran.liara.run/public/girl';
    const photoUrl = m.foto || defaultAvatar;
    const isDeceased = m.status === 'Wafat';

    card.innerHTML = `
        <div>
            <div class="flex items-start justify-between gap-3 mb-3">
                <div class="flex items-center gap-3">
                    <img src="${photoUrl}" class="w-12 h-12 rounded-full object-cover border-2 ${m.gender === 'L' ? 'border-sky-500' : 'border-pink-500'} ${isDeceased ? 'grayscale' : ''}">
                    <div>
                        <h4 class="font-bold text-slate-100 text-sm flex items-center gap-1.5 cursor-pointer hover:text-emerald-400 transition" onclick="openDetailModal('${m.id}')">
                            ${m.nama}
                        </h4>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[10px] px-1.5 py-0.5 rounded ${m.gender === 'L' ? 'bg-sky-500/20 text-sky-300' : 'bg-pink-500/20 text-pink-300'}">${m.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                            <span class="text-[10px] px-1.5 py-0.5 rounded ${isDeceased ? 'bg-slate-700 text-slate-400' : 'bg-emerald-500/20 text-emerald-300'}">${m.status}</span>
                        </div>
                    </div>
                </div>

                ${isAdmin ? `
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onclick="openFormModal('${m.id}')" class="p-1 text-slate-400 hover:text-sky-400"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button onclick="deleteMember('${m.id}')" class="p-1 text-slate-400 hover:text-rose-400"><i class="fa-solid fa-trash"></i></button>
                    </div>
                ` : ''}
            </div>

            ${m.catatan ? `<p class="text-xs text-slate-400 line-clamp-2 italic mb-3">"${m.catatan}"</p>` : ''}
        </div>

        <div class="pt-2 border-t border-slate-700/50 flex justify-between items-center text-xs">
            <button onclick="openDetailModal('${m.id}')" class="text-slate-400 hover:text-slate-200 transition">Detail Kerabat</button>
            <div class="relative group/drop">
                <button class="text-emerald-400 font-medium flex items-center gap-1 hover:underline">
                    <i class="fa-solid fa-plus text-[10px]"></i> Kerabat
                </button>
                <div class="absolute right-0 bottom-full mb-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl hidden group-hover/drop:block z-30 whitespace-nowrap overflow-hidden">
                    <button onclick="quickAddRelative('${m.id}', 'ANAK')" class="block w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">
                        <i class="fa-solid fa-child text-emerald-400"></i> Tambah Anak
                    </button>
                    <button onclick="quickAddRelative('${m.id}', 'PASANGAN')" class="block w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">
                        <i class="fa-solid fa-heart text-pink-400"></i> Tambah Pasangan
                    </button>
                    <button onclick="quickAddRelative('${m.id}', 'ORANGTUA')" class="block w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">
                        <i class="fa-solid fa-person-breastfeeding text-sky-400"></i> Tambah Orang Tua
                    </button>
                </div>
            </div>
        </div>
    `;

    return card;
}

// Tambah Kerabat Cepat
function quickAddRelative(targetId, type) {
    const target = members.find(m => m.id === targetId);
    if (!target) return;

    openFormModal();

    if (type === 'ANAK') {
        document.getElementById('form-generasi').value = target.generasi + 1;
        if (target.gender === 'L') {
            document.getElementById('form-ayah').value = target.id;
            if (target.pasanganId) document.getElementById('form-ibu').value = target.pasanganId;
        } else {
            document.getElementById('form-ibu').value = target.id;
            if (target.pasanganId) document.getElementById('form-ayah').value = target.pasanganId;
        }
    } else if (type === 'PASANGAN') {
        document.getElementById('form-generasi').value = target.generasi;
        document.getElementById('form-pasangan').value = target.id;
        document.getElementById('form-gender').value = target.gender === 'L' ? 'P' : 'L';
    } else if (type === 'ORANGTUA') {
        document.getElementById('form-generasi').value = Math.max(1, target.generasi - 1);
    }
}

// ============================================================
// 4. KELOLA FORM & MODAL
// ============================================================
function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('form-id').value || 'm_' + Date.now();
    const newMember = {
        id: id,
        nama: document.getElementById('form-nama').value,
        gender: document.getElementById('form-gender').value,
        status: document.getElementById('form-status').value,
        generasi: parseInt(document.getElementById('form-generasi').value) || 1,
        ayahId: document.getElementById('form-ayah').value,
        ibuId: document.getElementById('form-ibu').value,
        pasanganId: document.getElementById('form-pasangan').value,
        foto: document.getElementById('form-foto').value,
        catatan: document.getElementById('form-catatan').value
    };

    const index = members.findIndex(m => m.id === id);
    if (index >= 0) {
        members[index] = newMember;
    } else {
        members.push(newMember);
    }

    // Hubungkan pasangan dua arah secara otomatis
    if (newMember.pasanganId) {
        const spouse = members.find(m => m.id === newMember.pasanganId);
        if (spouse) spouse.pasanganId = id;
    }

    closeFormModal();
    saveDataToDatabase(); // Langsung kirim ke Google Sheets
}

function deleteMember(id) {
    if (!isAdmin) {
        alert("Hanya Admin yang memiliki akses hapus.");
        return;
    }

    if (confirm("Hapus anggota keluarga ini?")) {
        members = members.filter(m => m.id !== id);
        members.forEach(m => {
            if (m.ayahId === id) m.ayahId = "";
            if (m.ibuId === id) m.ibuId = "";
            if (m.pasanganId === id) m.pasanganId = "";
        });
        saveDataToDatabase();
    }
}

// Fungsi Modal Pendukung
function openFormModal(editId = null) {
    populateParentDropdowns(editId);
    const modal = document.getElementById('form-modal');
    const form = document.getElementById('member-form');
    if (!modal || !form) return;

    form.reset();

    if (editId) {
        const m = members.find(item => item.id === editId);
        if (!m) return;
        document.getElementById('form-title').innerText = "Edit Anggota Keluarga";
        document.getElementById('form-id').value = m.id;
        document.getElementById('form-nama').value = m.nama;
        document.getElementById('form-gender').value = m.gender;
        document.getElementById('form-status').value = m.status;
        document.getElementById('form-generasi').value = m.generasi;
        document.getElementById('form-ayah').value = m.ayahId || "";
        document.getElementById('form-ibu').value = m.ibuId || "";
        document.getElementById('form-pasangan').value = m.pasanganId || "";
        document.getElementById('form-foto').value = m.foto || "";
        document.getElementById('form-catatan').value = m.catatan || "";
    } else {
        document.getElementById('form-title').innerText = "Tambah Anggota Keluarga";
        document.getElementById('form-id').value = "";
    }

    modal.classList.remove('hidden');
}

function closeFormModal() {
    const modal = document.getElementById('form-modal');
    if (modal) modal.classList.add('hidden');
}

function populateParentDropdowns(excludeId = null) {
    const ayahSel = document.getElementById('form-ayah');
    const ibuSel = document.getElementById('form-ibu');
    const pasanganSel = document.getElementById('form-pasangan');

    if (!ayahSel || !ibuSel || !pasanganSel) return;

    ayahSel.innerHTML = `<option value="">-- Tidak Ada --</option>`;
    ibuSel.innerHTML = `<option value="">-- Tidak Ada --</option>`;
    pasanganSel.innerHTML = `<option value="">-- Tidak Ada --</option>`;

    members.forEach(m => {
        if (m.id === excludeId) return;
        if (m.gender === 'L') {
            ayahSel.innerHTML += `<option value="${m.id}">${m.nama} (Gen ${m.generasi})</option>`;
        } else {
            ibuSel.innerHTML += `<option value="${m.id}">${m.nama} (Gen ${m.generasi})</option>`;
        }
        pasanganSel.innerHTML += `<option value="${m.id}">${m.nama} (Gen ${m.generasi})</option>`;
    });
}

function updateFilterOptions() {
    const select = document.getElementById('filter-gen');
    if (!select) return;

    const currentVal = select.value;
    const genList = [...new Set(members.map(m => m.generasi))].sort((a, b) => a - b);

    select.innerHTML = `<option value="ALL">Semua Generasi</option>`;
    genList.forEach(g => {
        select.innerHTML += `<option value="${g}">Generasi ${g}</option>`;
    });
    select.value = currentVal;
}

function setViewMode(mode) {
    viewMode = mode;
    const treeBtn = document.getElementById('view-tree-btn');
    const gridBtn = document.getElementById('view-grid-btn');

    if (treeBtn && gridBtn) {
        treeBtn.className = mode === 'tree' ? 'px-3 py-1.5 rounded-md font-medium bg-emerald-600 text-white' : 'px-3 py-1.5 rounded-md font-medium text-slate-400 hover:text-slate-200';
        gridBtn.className = mode === 'grid' ? 'px-3 py-1.5 rounded-md font-medium bg-emerald-600 text-white' : 'px-3 py-1.5 rounded-md font-medium text-slate-400 hover:text-slate-200';
    }
    renderApp();
}

function toggleAdminRole() {
    if (isAdmin) {
        isAdmin = false;
        alert("Kembali ke Mode Anggota biasa.");
    } else {
        const pin = prompt("Masukkan PIN Admin (Default: 1234):");
        if (pin === ADMIN_PIN) {
            isAdmin = true;
            alert("Mode Admin Aktif.");
        } else if (pin !== null) {
            alert("PIN Salah!");
        }
    }
    const btnText = document.getElementById('admin-text');
    const btn = document.getElementById('btn-admin');
    if (btnText && btn) {
        btnText.innerText = isAdmin ? "Admin (Aktif)" : "Mode Admin";
        btn.className = isAdmin ? "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium" : "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300";
    }
    renderApp();
}

function openDetailModal(id) {
    const m = members.find(item => item.id === id);
    if (!m) return;

    const ayah = members.find(item => item.id === m.ayahId);
    const ibu = members.find(item => item.id === m.ibuId);
    const pasangan = members.find(item => item.id === m.pasanganId);
    const anakList = members.filter(item => item.ayahId === id || item.ibuId === id);

    const defaultAvatar = m.gender === 'L' ? 'https://avatar.iran.liara.run/public/boy' : 'https://avatar.iran.liara.run/public/girl';
    const container = document.getElementById('detail-content');

    if (container) {
        container.innerHTML = `
            <div class="text-center mb-6">
                <img src="${m.foto || defaultAvatar}" class="w-20 h-20 rounded-full mx-auto object-cover border-4 ${m.gender === 'L' ? 'border-sky-500' : 'border-pink-500'} mb-2">
                <h3 class="text-lg font-bold text-slate-100">${m.nama}</h3>
                <p class="text-xs text-slate-400">Generasi Ke-${m.generasi} • ${m.status}</p>
            </div>
            <div class="space-y-4 text-xs">
                <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                    <span class="text-slate-400 font-semibold uppercase block mb-1">Orang Tua:</span>
                    <p class="text-slate-200">Ayah: ${ayah ? `<span class="text-emerald-400 cursor-pointer hover:underline" onclick="openDetailModal('${ayah.id}')">${ayah.nama}</span>` : '-'}</p>
                    <p class="text-slate-200">Ibu: ${ibu ? `<span class="text-emerald-400 cursor-pointer hover:underline" onclick="openDetailModal('${ibu.id}')">${ibu.nama}</span>` : '-'}</p>
                </div>
                <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                    <span class="text-slate-400 font-semibold uppercase block mb-1">Pasangan:</span>
                    <p class="text-slate-200">${pasangan ? `<span class="text-emerald-400 cursor-pointer hover:underline" onclick="openDetailModal('${pasangan.id}')">${pasangan.nama}</span>` : '-'}</p>
                </div>
                <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                    <span class="text-slate-400 font-semibold uppercase block mb-1">Anak-Anak (${anakList.length}):</span>
                    ${anakList.length > 0 ? `<ul class="list-disc pl-4 space-y-1">${anakList.map(a => `<li class="text-emerald-400 cursor-pointer hover:underline" onclick="openDetailModal('${a.id}')">${a.nama}</li>`).join('')}</ul>` : '<p class="text-slate-500">-</p>'}
                </div>
            </div>
        `;
    }

    const detailModal = document.getElementById('detail-modal');
    if (detailModal) detailModal.classList.remove('hidden');
}

function closeDetailModal() {
    const modal = document.getElementById('detail-modal');
    if (modal) modal.classList.add('hidden');
}
