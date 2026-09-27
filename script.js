// ============================================================
// Silsilah Keluarga - Client-side Logic (script.js Final)
// ============================================================

// State Utama Aplikasi
let members = [];
let isAdmin = false;
let scriptUrl = localStorage.getItem('gs_script_url') || '';
let viewMode = 'tree'; // 'tree' | 'grid'
let renderedMemberIds = new Set(); // Pelacak global untuk cegah duplikasi kartu

const ADMIN_PIN = "1234";

// Sample Data Awal (digunakan jika localStorage/Sheets kosong)
const defaultMembers = [
    { id: "m1", nama: "Kaidi", gender: "L", generasi: 1, status: "Hidup", ayahId: "", ibuId: "", pasanganId: "m2", foto: "", catatan: "Kakek / Kepala Keluarga Pertama" },
    { id: "m2", nama: "Tukirah", gender: "P", generasi: 1, status: "Hidup", ayahId: "", ibuId: "", pasanganId: "m1", foto: "", catatan: "Nenek" },
    { id: "m3", nama: "Budi Santoso", gender: "L", generasi: 2, status: "Hidup", ayahId: "m1", ibuId: "m2", pasanganId: "m4", foto: "", catatan: "Anak Pertama" },
    { id: "m4", nama: "Wiwit", gender: "P", generasi: 2, status: "Hidup", ayahId: "", ibuId: "", pasanganId: "m3", foto: "", catatan: "Istri Budi Santoso" },
    { id: "m5", nama: "Zeni DS", gender: "P", generasi: 2, status: "Hidup", ayahId: "m1", ibuId: "m2", pasanganId: "", foto: "", catatan: "Anak Kedua" },
    { id: "m6", nama: "Kana Zs", gender: "P", generasi: 3, status: "Hidup", ayahId: "m3", ibuId: "m4", pasanganId: "", foto: "", catatan: "Cucu" }
];

// Inisialisasi Saat Halaman Dimuat
document.addEventListener('DOMContentLoaded', () => {
    if (scriptUrl) {
        const inputElem = document.getElementById('script-url-input');
        if (inputElem) inputElem.value = scriptUrl;
        syncData();
    } else {
        members = JSON.parse(localStorage.getItem('local_members')) || defaultMembers;
        updateDbBadge(false, 'Mode Lokal (Tanpa Sheets)');
        renderApp();
    }
});

// Update Badge Status Database di Header
function updateDbBadge(connected, text) {
    const dot = document.getElementById('status-dot');
    const label = document.getElementById('status-text');
    if (label) label.innerText = text;

    if (dot) {
        if (connected) {
            dot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
        } else {
            dot.className = "w-2 h-2 rounded-full bg-amber-400";
        }
    }
}

// Sinkronisasi Data dengan Google Apps Script (Spreadsheet)
async function syncData() {
    if (!scriptUrl) {
        updateDbBadge(false, 'Lokal / Terputus');
        renderApp();
        return;
    }

    updateDbBadge(false, 'Menghubungkan...');

    try {
        const response = await fetch(scriptUrl);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            members = data.map(item => ({
                ...item,
                generasi: parseInt(item.generasi) || 1
            }));
            localStorage.setItem('local_members', JSON.stringify(members));
            updateDbBadge(true, 'Sheets Terhubung');
        } else {
            throw new Error('Format Data Tidak Valid');
        }
    } catch (err) {
        console.error('Sync Error:', err);
        members = JSON.parse(localStorage.getItem('local_members')) || defaultMembers;
        updateDbBadge(false, 'Gagal Sync (Pakai Lokal)');
    }

    renderApp();
}

// Simpan Semua Perubahan Data ke Backend / LocalStorage
async function saveAllData() {
    localStorage.setItem('local_members', JSON.stringify(members));
    
    if (scriptUrl) {
        updateDbBadge(false, 'Menyimpan...');
        try {
            await fetch(scriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'saveAll', members: members })
            });
            setTimeout(() => {
                updateDbBadge(true, 'Sheets Terhubung');
            }, 1000);
        } catch (err) {
            console.error('Save Error:', err);
            updateDbBadge(false, 'Gagal Simpan Sheets');
        }
    }
    renderApp();
}

// Toggle Peran Mode Admin
function toggleAdminRole() {
    if (isAdmin) {
        isAdmin = false;
        alert("Anda telah kembali ke Mode Anggota biasa.");
    } else {
        const pin = prompt("Masukkan PIN Admin (Default: 1234):");
        if (pin === ADMIN_PIN) {
            isAdmin = true;
            alert("Mode Admin Aktif! Anda sekarang memiliki akses Edit & Hapus.");
        } else if (pin !== null) {
            alert("PIN Salah!");
        }
    }
    updateAdminUI();
    renderApp();
}

function updateAdminUI() {
    const btnText = document.getElementById('admin-text');
    const btn = document.getElementById('btn-admin');

    if (btnText && btn) {
        if (isAdmin) {
            btnText.innerText = "Admin (Aktif)";
            btn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium transition shadow-sm";
        } else {
            btnText.innerText = "Mode Admin";
            btn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition";
        }
    }
}

// Mengubah Mode Tampilan (Pohon / Grid)
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

// Function Utama Render UI
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

// ------------------------------------------------------------
// RENDER POHON SILSILAH TANPA DUPLIKASI
// ------------------------------------------------------------
function renderTreeView(container, filteredMembers) {
    // Reset tracker global agar tidak ada kartu ganda yang dirender
    renderedMemberIds = new Set();

    // 1. Cari kandidat akar (anggota yang tidak punya Ayah dan Ibu di database)
    let rootCandidates = filteredMembers.filter(m => !m.ayahId && !m.ibuId);

    // Jika tidak ada akar murni, gunakan anggota dari generasi terkecil
    if (rootCandidates.length === 0 && filteredMembers.length > 0) {
        const minGen = Math.min(...filteredMembers.map(m => m.generasi));
        rootCandidates = filteredMembers.filter(m => m.generasi === minGen);
    }

    if (rootCandidates.length === 0) {
        container.innerHTML = `<div class="text-center py-12 text-slate-500">Tidak ada data silsilah.</div>`;
        return;
    }

    const treeWrapper = document.createElement('div');
    treeWrapper.className = 'flex flex-col items-center gap-12 overflow-x-auto py-6 w-full';

    // Build pohon dari setiap akar
    rootCandidates.forEach(root => {
        if (!renderedMemberIds.has(root.id)) {
            const treeNode = buildTreeNode(root, filteredMembers);
            if (treeNode) {
                treeWrapper.appendChild(treeNode);
            }
        }
    });

    container.appendChild(treeWrapper);
}

// Rekursi Pembangunan Node Pohon Silsilah
function buildTreeNode(member, allMembers) {
    // Lewati jika anggota ini sudah dirender sebelumnya
    if (renderedMemberIds.has(member.id)) {
        return null;
    }

    // Tandai anggota sebagai sudah dirender
    renderedMemberIds.add(member.id);

    const nodeContainer = document.createElement('div');
    nodeContainer.className = 'flex flex-col items-center tree-node';

    // Cari Pasangan
    const spouse = allMembers.find(m => m.id === member.pasanganId);
    if (spouse) {
        renderedMemberIds.add(spouse.id); // Tandai pasangan agar tidak buat pohon terpisah
    }

    // Kotak Pasangan / Pasangan Inti
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

    // Cari Anak-Anak dari Pasangan Ini
    const children = allMembers.filter(m => {
        if (renderedMemberIds.has(m.id)) return false;
        
        const isChildOfMember = (m.ayahId && m.ayahId === member.id) || (m.ibuId && m.ibuId === member.id);
        const isChildOfSpouse = spouse && ((m.ayahId && m.ayahId === spouse.id) || (m.ibuId && m.ibuId === spouse.id));
        
        return isChildOfMember || isChildOfSpouse;
    });

    // Render Cabang Anak
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

// Render Mode Grid Kartu Biasa
function renderGridView(container, filteredMembers) {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
    filteredMembers.forEach(m => grid.appendChild(createMemberCard(m)));
    container.appendChild(grid);
}

// Templating Kartu Anggota
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

                <!-- Tombol Aksi Khusus Admin -->
                ${isAdmin ? `
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onclick="openFormModal('${m.id}')" class="p-1 text-slate-400 hover:text-sky-400"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button onclick="deleteMember('${m.id}')" class="p-1 text-slate-400 hover:text-rose-400"><i class="fa-solid fa-trash"></i></button>
                    </div>
                ` : ''}
            </div>

            ${m.catatan ? `<p class="text-xs text-slate-400 line-clamp-2 italic mb-3">"${m.catatan}"</p>` : ''}
        </div>

        <!-- Tombol Cepat Tambah Kerabat -->
        <div class="pt-2 border-t border-slate-700/50 flex justify-between items-center text-xs">
            <button onclick="openDetailModal('${m.id}')" class="text-slate-400 hover:text-slate-200 transition">Detail Kerabat</button>
            <div class="relative group/drop">
                <button class="text-emerald-400 font-medium flex items-center gap-1 hover:underline">
                    <i class="fa-solid fa-plus text-[10px]"></i> Kerabat
                </button>
                <div class="absolute right-0 bottom-full mb-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl hidden group-hover/drop:block z-30 whitespace-nowrap overflow-hidden">
                    <button onclick="quickAddRelative('${m.id}', 'ANAK')" class="block w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-1.5">
                        <i class="fa-solid fa-child text-emerald-400"></i> Tambah Anak
                    </button>
                    <button onclick="quickAddRelative('${m.id}', 'PASANGAN')" class="block w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-1.5">
                        <i class="fa-solid fa-heart text-pink-400"></i> Tambah Pasangan
                    </button>
                    <button onclick="quickAddRelative('${m.id}', 'ORANGTUA')" class="block w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-1.5">
                        <i class="fa-solid fa-person-breastfeeding text-sky-400"></i> Tambah Orang Tua
                    </button>
                </div>
            </div>
        </div>
    `;

    return card;
}

// Tambah Kerabat Kontekstual Cepat
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

// Update Opsi Opsi Filter Generasi
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

// Modal Form Tambah / Edit Anggota
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

// Handle Submit Form
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

    // Sinkronisasi Dua Arah untuk Pasangan
    if (newMember.pasanganId) {
        const spouse = members.find(m => m.id === newMember.pasanganId);
        if (spouse) spouse.pasanganId = id;
    }

    closeFormModal();
    saveAllData();
}

// Hapus Data Anggota (Khusus Admin)
function deleteMember(id) {
    if (!isAdmin) {
        alert("Hanya Admin yang memiliki hak akses untuk menghapus data.");
        return;
    }

    if (confirm("Apakah Anda yakin ingin menghapus anggota keluarga ini?")) {
        members = members.filter(m => m.id !== id);
        // Hapus tautan relasi
        members.forEach(m => {
            if (m.ayahId === id) m.ayahId = "";
            if (m.ibuId === id) m.ibuId = "";
            if (m.pasanganId === id) m.pasanganId = "";
        });
        saveAllData();
    }
}

// Modal Detail Anggota Keluarga
function openDetailModal(id) {
    const m = members.find(item => item.id === id);
    if (!m) return;

    const ayah = members.find(item => item.id === m.ayahId);
    const ibu = members.find(item => item.id === m.ibuId);
    const pasangan = members.find(item => item.id === m.pasanganId);
    const anakList = members.filter(item => item.ayahId === id || item.ibuId === id);

    const defaultAvatar = m.gender === 'L' ? 'https://avatar.iran.liara.run/public/boy' : 'https://avatar.iran.liara.run/public/girl';

    const container = document.getElementById('detail-content');
    if (!container) return;

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

            ${m.catatan ? `
                <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                    <span class="text-slate-400 font-semibold uppercase block mb-1">Catatan:</span>
                    <p class="text-slate-300 italic">${m.catatan}</p>
                </div>
            ` : ''}
        </div>
    `;

    const detailModal = document.getElementById('detail-modal');
    if (detailModal) detailModal.classList.remove('hidden');
}

function closeDetailModal() {
    const modal = document.getElementById('detail-modal');
    if (modal) modal.classList.add('hidden');
}

// Modal Pengaturan URL Google Sheets API
function openConfigModal() {
    const modal = document.getElementById('config-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeConfigModal() {
    const modal = document.getElementById('config-modal');
    if (modal) modal.classList.add('hidden');
}

function saveScriptUrl() {
    const input = document.getElementById('script-url-input');
    if (!input) return;

    const url = input.value.trim();
    scriptUrl = url;
    localStorage.setItem('gs_script_url', url);
    closeConfigModal();
    syncData();
}
