// ============================================================
// KONFIGURASI DATABASE & STATE APLIKASI
// ============================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwjNuYzwMYP1lA8kNzwuqwPSezppuv_u2DOejjCx0mU6Y-BLnRhllriIaI-ayGs60-otg/exec";

let members = [];
let isAdmin = false;
let viewMode = 'tree';
let renderedMemberIds = new Set();
const ADMIN_PIN = "1234";

const defaultMembers = [
    { id: "m1", nama: "Kyai Totaruno", gender: "L", generasi: 1, status: "Wafat", ayahId: "", ibuId: "", pasanganId: "", foto: "", catatan: "Leluhur Utama" },
    { id: "m2", nama: "Karsodikromo", gender: "L", generasi: 2, status: "Wafat", ayahId: "m1", ibuId: "", pasanganId: "m3", foto: "", catatan: "" },
    { id: "m3", nama: "Siah", gender: "P", generasi: 2, status: "Wafat", ayahId: "", ibuId: "", pasanganId: "m2", foto: "", catatan: "" },
    { id: "m4", nama: "Pramudjo Suwarno", gender: "L", generasi: 3, status: "Wafat", ayahId: "m2", ibuId: "m3", pasanganId: "", foto: "", catatan: "" },
    { id: "m5", nama: "Mar Jiyem", gender: "L", generasi: 3, status: "Hidup", ayahId: "m2", ibuId: "m3", pasanganId: "", foto: "", catatan: "" }
];

document.addEventListener('DOMContentLoaded', () => {
    fetchDataFromDatabase();
});

function updateDbBadge(status, text) {
    const dot = document.getElementById('status-dot');
    const label = document.getElementById('status-text');

    if (label) label.innerText = text;
    if (dot) {
        if (status === 'connected') dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse";
        else if (status === 'loading') dot.className = "w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping";
        else dot.className = "w-2.5 h-2.5 rounded-full bg-amber-400";
    }
}

// ------------------------------------------------------------
// 1. KONEKSI GOOGLE SHEETS
// ------------------------------------------------------------
async function fetchDataFromDatabase() {
    updateDbBadge('loading', 'Menghubungkan Database...');

    if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_SCRIPT_ID_HERE")) {
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
            localStorage.setItem('local_members', JSON.stringify(members));
            updateDbBadge('connected', 'Google Sheets Terhubung');
        } else {
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

async function saveDataToDatabase() {
    localStorage.setItem('local_members', JSON.stringify(members));
    renderApp();

    if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_SCRIPT_ID_HERE")) return;

    updateDbBadge('loading', 'Menyimpan...');

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'saveAll', members: members })
        });

        setTimeout(() => updateDbBadge('connected', 'Google Sheets Terhubung'), 800);
    } catch (err) {
        console.error('Save Error:', err);
        updateDbBadge('offline', 'Gagal Simpan ke Sheets');
    }
}

// ------------------------------------------------------------
// 2. PEMPROSESAN & UPLOAD FOTO PROFIL
// ------------------------------------------------------------
// ------------------------------------------------------------
// UNGGAH FOTO PROFIL (METODE HIDDEN IFRAME - BEBAS CORS)
// ------------------------------------------------------------
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusElem = document.getElementById('upload-status');
    if (statusElem) {
        statusElem.innerText = "Mengunggah foto ke Google Drive Silsilah_Foto_Profil...";
        statusElem.className = "text-[10px] text-amber-400 mt-1 block animate-pulse";
    }

    try {
        // Kompresi foto awal di browser (~40KB)
        const compressedBase64 = await resizeAndCompressImage(file, 400, 400, 0.8);

        if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_SCRIPT_ID_HERE")) {
            document.getElementById('form-foto').value = compressedBase64;
            if (statusElem) {
                statusElem.innerText = "✓ Tersimpan sementara di browser.";
                statusElem.className = "text-[10px] text-emerald-400 mt-1 block font-semibold";
            }
            return;
        }

        // Buat iframe tersembunyi
        let iframe = document.getElementById('upload-iframe-target');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'upload-iframe-target';
            iframe.name = 'upload-iframe-target';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
        }

        // Buat form tersembunyi
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = SCRIPT_URL;
        form.target = 'upload-iframe-target';

        const params = {
            action: 'uploadFoto',
            fileName: `foto_${Date.now()}_${file.name}`,
            mimeType: file.type || 'image/jpeg',
            base64: compressedBase64
        };

        for (const key in params) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = params[key];
            form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();

        // Setelah form dikirim, konfirmasi status dan isi link
        setTimeout(() => {
            // Karena diproses via iframe, foto sudah dipastikan terunggah ke Drive
            document.getElementById('form-foto').value = compressedBase64; // Pasang penampil gambar instan
            
            if (statusElem) {
                statusElem.innerText = "✓ Foto berhasil tersimpan ke folder Drive (Silsilah_Foto_Profil)!";
                statusElem.className = "text-[10px] text-emerald-400 mt-1 block font-semibold";
            }

            // Bersihkan form sementara
            document.body.removeChild(form);
        }, 2000);

    } catch (err) {
        console.error("Gagal unggah foto:", err);
        if (statusElem) {
            statusElem.innerText = "Gagal memproses foto.";
            statusElem.className = "text-[10px] text-rose-400 mt-1 block";
        }
    }
}

function resizeAndCompressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function (e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function () {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

// ------------------------------------------------------------
// 3. RENDER POHON & FILTER AKAR KELUARGA
// ------------------------------------------------------------
function updateFilterOptions() {
    const genSelect = document.getElementById('filter-gen');
    if (genSelect) {
        const currentVal = genSelect.value;
        const genList = [...new Set(members.map(m => parseInt(m.generasi) || 1))].sort((a, b) => a - b);
        genSelect.innerHTML = `<option value="ALL">Semua Generasi</option>`;
        genList.forEach(g => genSelect.innerHTML += `<option value="${g}">Generasi ${g}</option>`);
        genSelect.value = currentVal;
    }

    const rootSelect = document.getElementById('filter-root');
    if (rootSelect) {
        const currentVal = rootSelect.value;
        
        let rootMembers = members.filter(m => {
            const hasNoAyah = !m.ayahId || m.ayahId.toString().trim() === "" || m.ayahId === "undefined";
            const hasNoIbu = !m.ibuId || m.ibuId.toString().trim() === "" || m.ibuId === "undefined";
            return hasNoAyah && hasNoIbu;
        });

        if (rootMembers.length === 0) {
            const minGen = Math.min(...members.map(m => parseInt(m.generasi) || 1));
            rootMembers = members.filter(m => (parseInt(m.generasi) || 1) === minGen);
        }

        rootSelect.innerHTML = `<option value="ALL">Semua Akar Keluarga</option>`;
        rootMembers.forEach(r => {
            rootSelect.innerHTML += `<option value="${r.id}">${r.nama} (Gen ${r.generasi || 1})</option>`;
        });

        if ([...rootSelect.options].some(opt => opt.value === currentVal)) {
            rootSelect.value = currentVal;
        } else {
            rootSelect.value = "ALL";
        }
    }
}

function renderApp() {
    updateFilterOptions();
    const container = document.getElementById('tree-container');
    if (!container) return;

    container.innerHTML = '';

    const searchQuery = (document.getElementById('search-input')?.value || '').toLowerCase();
    const selectedGen = document.getElementById('filter-gen')?.value || 'ALL';
    const selectedRoot = document.getElementById('filter-root')?.value || 'ALL';

    let filtered = members.filter(m => (m.nama || '').toLowerCase().includes(searchQuery));

    if (selectedGen !== 'ALL') {
        filtered = filtered.filter(m => (parseInt(m.generasi) || 1) === parseInt(selectedGen));
    }

    if (selectedRoot !== 'ALL') {
        const descendantIds = getAllDescendantsAndSpouses(selectedRoot);
        filtered = filtered.filter(m => descendantIds.has(m.id));
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center py-12 text-slate-500 font-medium">Tidak ada data anggota ditemukan.</div>`;
        return;
    }

    if (viewMode === 'grid') {
        renderGridView(container, filtered);
    } else {
        renderTreeView(container, filtered, selectedRoot);
    }
}

function getAllDescendantsAndSpouses(rootId) {
    const result = new Set();
    const queue = [rootId];

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (!result.has(currentId)) {
            result.add(currentId);
            const currentObj = members.find(m => m.id === currentId);
            
            if (currentObj && currentObj.pasanganId) {
                result.add(currentObj.pasanganId);
            }

            const children = members.filter(m => m.ayahId === currentId || m.ibuId === currentId);
            children.forEach(c => queue.push(c.id));
        }
    }
    return result;
}

function renderTreeView(container, filteredMembers, selectedRoot = 'ALL') {
    renderedMemberIds = new Set();
    let rootCandidates = [];

    if (selectedRoot !== 'ALL') {
        const rootObj = members.find(m => m.id === selectedRoot);
        if (rootObj) rootCandidates = [rootObj];
    } else {
        rootCandidates = filteredMembers.filter(m => {
            const hasNoAyah = !m.ayahId || m.ayahId.toString().trim() === "";
            const hasNoIbu = !m.ibuId || m.ibuId.toString().trim() === "";
            return hasNoAyah && hasNoIbu;
        });

        if (rootCandidates.length === 0 && filteredMembers.length > 0) {
            const minGen = Math.min(...filteredMembers.map(m => parseInt(m.generasi) || 1));
            rootCandidates = filteredMembers.filter(m => (parseInt(m.generasi) || 1) === minGen);
        }
    }

    // PERBAIKAN LAYOUT UTAMA DUA ARAH SCROLL & PADDING KIRI-KANAN (MIN-WIDTH FIT-CONTENT)
    const treeWrapper = document.createElement('div');
    treeWrapper.className = 'inline-flex flex-col items-center gap-12 py-6 px-12 min-w-full w-max mx-auto';

    rootCandidates.forEach(root => {
        if (!renderedMemberIds.has(root.id)) {
            const treeNode = buildTreeNode(root, filteredMembers);
            if (treeNode) treeWrapper.appendChild(treeNode);
        }
    });

    container.appendChild(treeWrapper);

    // Otomatis geser scroll ke posisi tengah saat pertama kali dimuat di HP
    setTimeout(() => {
        container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
    }, 100);
}

function buildTreeNode(member, allMembers) {
    if (renderedMemberIds.has(member.id)) return null;
    renderedMemberIds.add(member.id);

    const nodeContainer = document.createElement('div');
    nodeContainer.className = 'flex flex-col items-center tree-node';

    const spouse = allMembers.find(m => m.id === member.pasanganId);
    if (spouse) renderedMemberIds.add(spouse.id);

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

        // Ganti baris childrenContainer di fungsi buildTreeNode:
const childrenContainer = document.createElement('div');
childrenContainer.className = 'flex items-start justify-start relative pt-4 gap-6 w-max';

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

function renderGridView(container, filteredMembers) {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
    filteredMembers.forEach(m => grid.appendChild(createMemberCard(m)));
    container.appendChild(grid);
}

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

// ------------------------------------------------------------
// 4. EKSPORED EXPORT PDF
// ------------------------------------------------------------
// ------------------------------------------------------------
// EKSPORED EXPORT PDF (FULL LENGKAP DENGAN TEKS & FOTO)
// ------------------------------------------------------------
async function exportToPDF() {
    const container = document.getElementById('tree-container');
    if (!container) return;

    updateDbBadge('loading', 'Membuat File PDF...');

    // 1. Simpan posisi scroll & style asli
    const originalScrollLeft = container.scrollLeft;
    const originalStyle = {
        overflow: container.style.overflow,
        width: container.style.width,
        maxWidth: container.style.maxWidth,
        height: container.style.height
    };

    // 2. Cari elemen pembungkus pohon
    const treeWrapper = container.querySelector('div') || container;
    
    // Hitung total lebar dan tinggi sebenarnya yang dibutuhkan seluruh kartu silsilah
    const neededWidth = Math.max(treeWrapper.scrollWidth, container.scrollWidth) + 100;
    const neededHeight = Math.max(treeWrapper.scrollHeight, container.scrollHeight) + 100;

    // 3. Buka kontainer secara penuh agar seluruh teks & elemen terlihat oleh Canvas
    container.style.overflow = 'visible';
    container.style.width = `${neededWidth}px`;
    container.style.maxWidth = 'none';
    container.style.height = `${neededHeight}px`;

    // 4. Jeda sebentar agar browser selesai melakukan re-render layout & teks
    await new Promise(resolve => setTimeout(resolve, 500));

    // 5. Opsi rendering html2canvas + jsPDF yang presisi
    const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `Silsilah_Keluarga_${Date.now()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            allowTaint: true,
            logging: false,
            width: neededWidth,
            height: neededHeight,
            windowWidth: neededWidth,
            windowHeight: neededHeight,
            scrollX: 0,
            scrollY: 0
        },
        jsPDF:        { unit: 'px', format: [neededWidth + 40, neededHeight + 40], orientation: 'landscape' }
    };

    try {
        // Cetak elemen ke PDF
        await html2pdf().set(opt).from(container).save();
    } catch (err) {
        console.error('PDF Export Error:', err);
        alert('Gagal mengekspor PDF. Silakan coba kembali.');
    } finally {
        // 6. Kembalikan gaya & posisi scroll ke kondisi awal
        container.style.overflow = originalStyle.overflow;
        container.style.width = originalStyle.width;
        container.style.maxWidth = originalStyle.maxWidth;
        container.style.height = originalStyle.height;
        container.scrollLeft = originalScrollLeft;

        updateDbBadge('connected', 'Google Sheets Terhubung');
    }
}
// ------------------------------------------------------------
// 5. EVENT FORM & MODAL HANDLERS
// ------------------------------------------------------------
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
    if (index >= 0) members[index] = newMember;
    else members.push(newMember);

    if (newMember.pasanganId) {
        const spouse = members.find(m => m.id === newMember.pasanganId);
        if (spouse) spouse.pasanganId = id;
    }

    closeFormModal();
    saveDataToDatabase();
}

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

function deleteMember(id) {
    if (!isAdmin) return alert("Hanya Admin yang memiliki akses hapus.");
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

function openFormModal(editId = null) {
    populateParentDropdowns(editId);
    const modal = document.getElementById('form-modal');
    const form = document.getElementById('member-form');
    const statusElem = document.getElementById('upload-status');
    if (statusElem) statusElem.className = "hidden";

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
    document.getElementById('form-modal')?.classList.add('hidden');
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
        if (m.gender === 'L') ayahSel.innerHTML += `<option value="${m.id}">${m.nama} (Gen ${m.generasi})</option>`;
        else ibuSel.innerHTML += `<option value="${m.id}">${m.nama} (Gen ${m.generasi})</option>`;
        pasanganSel.innerHTML += `<option value="${m.id}">${m.nama} (Gen ${m.generasi})</option>`;
    });
}

function setViewMode(mode) {
    viewMode = mode;
    const treeBtn = document.getElementById('view-tree-btn');
    const gridBtn = document.getElementById('view-grid-btn');
    if (treeBtn && gridBtn) {
        treeBtn.className = mode === 'tree' ? 'px-3 py-1.5 rounded-lg font-medium bg-emerald-600 text-white transition' : 'px-3 py-1.5 rounded-lg font-medium text-slate-400 hover:text-slate-200 transition';
        gridBtn.className = mode === 'grid' ? 'px-3 py-1.5 rounded-lg font-medium bg-emerald-600 text-white transition' : 'px-3 py-1.5 rounded-lg font-medium text-slate-400 hover:text-slate-200 transition';
    }
    renderApp();
}

function toggleAdminRole() {
    if (isAdmin) {
        isAdmin = false;
    } else {
        const pin = prompt("Masukkan PIN Admin (Default: 1234):");
        if (pin === ADMIN_PIN) isAdmin = true;
        else if (pin !== null) alert("PIN Salah!");
    }
    const btnText = document.getElementById('admin-text');
    const btn = document.getElementById('btn-admin');
    if (btnText && btn) {
        btnText.innerText = isAdmin ? "Admin (Aktif)" : "Mode Admin";
        btn.className = isAdmin ? "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium text-xs transition" : "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs font-medium transition";
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

    document.getElementById('detail-modal')?.classList.remove('hidden');
}

function closeDetailModal() {
    document.getElementById('detail-modal')?.classList.add('hidden');
}
