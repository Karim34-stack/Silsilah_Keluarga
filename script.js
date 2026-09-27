// State Aplikasi
let members = [];
let isAdmin = false;
let scriptUrl = localStorage.getItem('gs_script_url') || '';
let viewMode = 'tree'; // 'tree' | 'grid'

const ADMIN_PIN = "1234";

// Sample Data Awal jika kosong
const defaultMembers = [
    { id: "m1", nama: "Kakek Ahmad", gender: "L", generasi: 1, status: "Wafat", ayahId: "", ibuId: "", pasanganId: "m2", foto: "", catatan: "Perintis keluarga besar." },
    { id: "m2", nama: "Nenek Fatimah", gender: "P", generasi: 1, status: "Wafat", ayahId: "", ibuId: "", pasanganId: "m1", foto: "", catatan: "" },
    { id: "m3", nama: "Budi Santoso", gender: "L", generasi: 2, status: "Hidup", ayahId: "m1", ibuId: "m2", pasanganId: "m4", foto: "", catatan: "" },
    { id: "m4", nama: "Siti Rahma", gender: "P", generasi: 2, status: "Hidup", ayahId: "", ibuId: "", pasanganId: "m3", foto: "", catatan: "" },
    { id: "m5", nama: "Rian Santoso", gender: "L", generasi: 3, status: "Hidup", ayahId: "m3", ibuId: "m4", pasanganId: "", foto: "", catatan: "Anak pertama." }
];

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
    if (scriptUrl) {
        document.getElementById('script-url-input').value = scriptUrl;
        syncData();
    } else {
        members = JSON.parse(localStorage.getItem('local_members')) || defaultMembers;
        updateDbBadge(false, 'Mode Lokal (Tanpa Sheets)');
        renderApp();
    }
});

// Update Badge Koneksi Database
function updateDbBadge(connected, text) {
    const dot = document.getElementById('status-dot');
    const label = document.getElementById('status-text');
    label.innerText = text;

    if (connected) {
        dot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
    } else {
        dot.className = "w-2 h-2 rounded-full bg-amber-400";
    }
}

// Sinkronisasi dengan Google Apps Script JS API
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
            throw new Error('Format Data Salah');
        }
    } catch (err) {
        console.error('Sync Error:', err);
        members = JSON.parse(localStorage.getItem('local_members')) || defaultMembers;
        updateDbBadge(false, 'Gagal Sync (Pakai Lokal)');
    }

    renderApp();
}

// Simpan Perubahan ke Backend & LocalStorage
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

// Toggle Admin Status
function toggleAdminRole() {
    if (isAdmin) {
        isAdmin = false;
        alert("Anda kembali ke Mode Anggota biasa.");
    } else {
        const pin = prompt("Masukkan PIN Admin:");
        if (pin === ADMIN_PIN) {
            isAdmin = true;
            alert("Mode Admin Aktif! Anda memiliki hak edit & hapus.");
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

    if (isAdmin) {
        btnText.innerText = "Admin (Aktif)";
        btn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium transition";
    } else {
        btnText.innerText = "Mode Admin";
        btn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition";
    }
}

// Set Display Mode
function setViewMode(mode) {
    viewMode = mode;
    document.getElementById('view-tree-btn').className = mode === 'tree' ? 'px-3 py-1.5 rounded-md font-medium bg-emerald-600 text-white' : 'px-3 py-1.5 rounded-md font-medium text-slate-400 hover:text-slate-200';
    document.getElementById('view-grid-btn').className = mode === 'grid' ? 'px-3 py-1.5 rounded-md font-medium bg-emerald-600 text-white' : 'px-3 py-1.5 rounded-md font-medium text-slate-400 hover:text-slate-200';
    renderApp();
}

// Render Aplikasi Utama
function renderApp() {
    updateFilterOptions();
    const container = document.getElementById('tree-container');
    container.innerHTML = '';

    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    const selectedGen = document.getElementById('filter-gen').value;

    let filtered = members.filter(m => m.nama.toLowerCase().includes(searchQuery));
    if (selectedGen !== 'ALL') {
        filtered = filtered.filter(m => m.generasi === parseInt(selectedGen));
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center py-12 text-slate-500">Tidak ada data anggota ditemukan.</div>`;
        return;
    }

    if (viewMode === 'grid') {
        renderGridView(container, filtered);
    } else {
        renderTreeView(container, filtered);
    }
}

// Render Tampilan Pohon Per Generasi
function renderTreeView(container, filteredMembers) {
    const generations = [...new Set(members.map(m => m.generasi))].sort((a, b) => a - b);

    generations.forEach(gen => {
        const genMembers = filteredMembers.filter(m => m.generasi === gen);
        if (genMembers.length === 0) return;

        const genSection = document.createElement('div');
        genSection.className = 'bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 relative';

        genSection.innerHTML = `
            <div class="flex items-center gap-2 mb-4 pb-2 border-b border-slate-700/50">
                <span class="bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-0.5 rounded text-xs border border-emerald-500/30">Generasi ${gen}</span>
                <span class="text-xs text-slate-400">(${genMembers.length} Anggota)</span>
            </div>
            <div class="flex flex-wrap justify-center gap-4" id="gen-grid-${gen}"></div>
        `;

        container.appendChild(genSection);
        const grid = document.getElementById(`gen-grid-${gen}`);

        genMembers.forEach(m => {
            grid.appendChild(createMemberCard(m));
        });
    });
}

// Render Tampilan Pohon Rekursif Berabang
function renderTreeView(container, filteredMembers) {
    // Cari Akar Keluarga (Anggota tanpa Ayah & Ibu)
    const roots = filteredMembers.filter(m => !m.ayahId && !m.ibuId);

    if (roots.length === 0) {
        container.innerHTML = `<div class="text-center py-12 text-slate-500">Tidak ada akar silsilah yang cocok.</div>`;
        return;
    }

    const treeWrapper = document.createElement('div');
    treeWrapper.className = 'flex flex-col items-center gap-12 overflow-x-auto py-6';

    roots.forEach(root => {
        // Jika akar sudah menjadi pasangan dari akar lain yang diproses, lewati agar tidak ganda
        const isSpouseProcessed = roots.some(r => r.id === root.pasanganId && r.id < root.id);
        if (!isSpouseProcessed) {
            treeWrapper.appendChild(buildTreeNode(root, filteredMembers));
        }
    });

    container.appendChild(treeWrapper);
}

// Fungsi Rekursif Membuat Node Pohon Beserta Cabang Anak
function buildTreeNode(member, allMembers) {
    const nodeContainer = document.createElement('div');
    nodeContainer.className = 'flex flex-col items-center tree-node';

    // Kartu Anggota + Pasangan
    const spouse = allMembers.find(m => m.id === member.pasanganId);
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

    // Cari Anak-Anak
    const children = allMembers.filter(m => 
        (m.ayahId === member.id || m.ibuId === member.id) ||
        (spouse && (m.ayahId === spouse.id || m.ibuId === spouse.id))
    );

    if (children.length > 0) {
        // Garis Vertikal Turun
        const lineDown = document.createElement('div');
        lineDown.className = 'tree-line-v h-6';
        nodeContainer.appendChild(lineDown);

        // Container Cabang Anak
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'flex items-start justify-center relative pt-4';

        // Garis Horisontal Penghubung Cabang
        if (children.length > 1) {
            const lineHorizontal = document.createElement('div');
            lineHorizontal.className = 'tree-line-h absolute top-0 left-1/4 right-1/4';
            childrenContainer.appendChild(lineHorizontal);
        }

        children.forEach(child => {
            const childWrapper = document.createElement('div');
            childWrapper.className = 'flex flex-col items-center px-4 relative';

            // Garis Vertikal Atas Anak
            const lineUp = document.createElement('div');
            lineUp.className = 'tree-line-v h-4 absolute -top-4';
            childWrapper.appendChild(lineUp);

            childWrapper.appendChild(buildTreeNode(child, allMembers));
            childrenContainer.appendChild(childWrapper);
        });

        nodeContainer.appendChild(childrenContainer);
    }

    return nodeContainer;
}
// Render Tampilan Grid Kartu
function renderGridView(container, filteredMembers) {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
    filteredMembers.forEach(m => grid.appendChild(createMemberCard(m)));
    container.appendChild(grid);
}

// Buat Element Kartu Anggota
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
                        <h4 class="font-bold text-slate-100 text-sm flex items-center gap-1.5 cursor-pointer hover:text-emerald-400" onclick="openDetailModal('${m.id}')">
                            ${m.nama}
                        </h4>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[10px] px-1.5 py-0.5 rounded ${m.gender === 'L' ? 'bg-sky-500/20 text-sky-300' : 'bg-pink-500/20 text-pink-300'}">${m.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                            <span class="text-[10px] px-1.5 py-0.5 rounded ${isDeceased ? 'bg-slate-700 text-slate-400' : 'bg-emerald-500/20 text-emerald-300'}">${m.status}</span>
                        </div>
                    </div>
                </div>

                <!-- Admin Action Buttons -->
                ${isAdmin ? `
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onclick="openFormModal('${m.id}')" class="p-1 text-slate-400 hover:text-sky-400"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button onclick="deleteMember('${m.id}')" class="p-1 text-slate-400 hover:text-rose-400"><i class="fa-solid fa-trash"></i></button>
                    </div>
                ` : ''}
            </div>

            ${m.catatan ? `<p class="text-xs text-slate-400 line-clamp-2 italic mb-3">"${m.catatan}"</p>` : ''}
        </div>

        <!-- Add Relative Quick Options -->
        <div class="pt-2 border-t border-slate-700/50 flex justify-between items-center text-xs">
            <button onclick="openDetailModal('${m.id}')" class="text-slate-400 hover:text-slate-200">Detail Kerabat</button>
            <div class="relative group/drop">
                <button class="text-emerald-400 font-medium flex items-center gap-1 hover:underline">
                    <i class="fa-solid fa-plus text-[10px]"></i> Kerabat
                </button>
                <div class="absolute right-0 bottom-full mb-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl hidden group-hover/drop:block z-20 whitespace-nowrap overflow-hidden">
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

// Dynamic Filter Generasi
function updateFilterOptions() {
    const select = document.getElementById('filter-gen');
    const currentVal = select.value;
    const genList = [...new Set(members.map(m => m.generasi))].sort((a, b) => a - b);

    select.innerHTML = `<option value="ALL">Semua Generasi</option>`;
    genList.forEach(g => {
        select.innerHTML += `<option value="${g}">Generasi ${g}</option>`;
    });
    select.value = currentVal;
}

// Modal Form
function openFormModal(editId = null) {
    populateParentDropdowns(editId);
    const modal = document.getElementById('form-modal');
    const form = document.getElementById('member-form');
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
    document.getElementById('form-modal').classList.add('hidden');
}

function populateParentDropdowns(excludeId = null) {
    const ayahSel = document.getElementById('form-ayah');
    const ibuSel = document.getElementById('form-ibu');
    const pasanganSel = document.getElementById('form-pasangan');

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

    // Two-way sync Pasangan
    if (newMember.pasanganId) {
        const spouse = members.find(m => m.id === newMember.pasanganId);
        if (spouse) spouse.pasanganId = id;
    }

    closeFormModal();
    saveAllData();
}

// Hapus Anggota
function deleteMember(id) {
    if (!isAdmin) {
        alert("Hanya Admin yang dapat menghapus data.");
        return;
    }

    if (confirm("Apakah Anda yakin ingin menghapus anggota keluarga ini?")) {
        members = members.filter(m => m.id !== id);
        // Hapus link relasi
        members.forEach(m => {
            if (m.ayahId === id) m.ayahId = "";
            if (m.ibuId === id) m.ibuId = "";
            if (m.pasanganId === id) m.pasanganId = "";
        });
        saveAllData();
    }
}

// Detail Drawer / Modal
function openDetailModal(id) {
    const m = members.find(item => item.id === id);
    if (!m) return;

    const ayah = members.find(item => item.id === m.ayahId);
    const ibu = members.find(item => item.id === m.ibuId);
    const pasangan = members.find(item => item.id === m.pasanganId);
    const anakList = members.filter(item => item.ayahId === id || item.ibuId === id);

    const defaultAvatar = m.gender === 'L' ? 'https://avatar.iran.liara.run/public/boy' : 'https://avatar.iran.liara.run/public/girl';

    const container = document.getElementById('detail-content');
    container.innerHTML = `
        <div class="text-center mb-6">
            <img src="${m.foto || defaultAvatar}" class="w-20 h-20 rounded-full mx-auto object-cover border-4 ${m.gender === 'L' ? 'border-sky-500' : 'border-pink-500'} mb-2">
            <h3 class="text-lg font-bold text-slate-100">${m.nama}</h3>
            <p class="text-xs text-slate-400">Generasi Ke-${m.generasi} • ${m.status}</p>
        </div>

        <div class="space-y-4 text-xs">
            <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                <span class="text-slate-400 font-semibold uppercase block mb-1">Orang Tua:</span>
                <p class="text-slate-200">Ayah: ${ayah ? `<span class="text-emerald-400 cursor-pointer" onclick="openDetailModal('${ayah.id}')">${ayah.nama}</span>` : '-'}</p>
                <p class="text-slate-200">Ibu: ${ibu ? `<span class="text-emerald-400 cursor-pointer" onclick="openDetailModal('${ibu.id}')">${ibu.nama}</span>` : '-'}</p>
            </div>

            <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                <span class="text-slate-400 font-semibold uppercase block mb-1">Pasangan:</span>
                <p class="text-slate-200">${pasangan ? `<span class="text-emerald-400 cursor-pointer" onclick="openDetailModal('${pasangan.id}')">${pasangan.nama}</span>` : '-'}</p>
            </div>

            <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                <span class="text-slate-400 font-semibold uppercase block mb-1">Anak-Anak (${anakList.length}):</span>
                ${anakList.length > 0 ? `<ul class="list-disc pl-4 space-y-1">${anakList.map(a => `<li class="text-emerald-400 cursor-pointer" onclick="openDetailModal('${a.id}')">${a.nama}</li>`).join('')}</ul>` : '<p class="text-slate-500">-</p>'}
            </div>

            ${m.catatan ? `
                <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                    <span class="text-slate-400 font-semibold uppercase block mb-1">Catatan:</span>
                    <p class="text-slate-300 italic">${m.catatan}</p>
                </div>
            ` : ''}
        </div>
    `;

    document.getElementById('detail-modal').classList.remove('hidden');
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.add('hidden');
}

// Config Modal
function openConfigModal() {
    document.getElementById('config-modal').classList.remove('hidden');
}

function closeConfigModal() {
    document.getElementById('config-modal').classList.add('hidden');
}

function saveScriptUrl() {
    const url = document.getElementById('script-url-input').value.trim();
    scriptUrl = url;
    localStorage.setItem('gs_script_url', url);
    closeConfigModal();
    syncData();
}
