let people = [];

let adminToken = localStorage.getItem("silsilah_admin_token") || "";

let editingId = null;

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", function () {
  updateAdminUI();

  loadData();
});

/* =========================
   LOAD DATA
========================= */

function loadData() {
  document.getElementById("loading").classList.remove("hidden");

  google.script.run
    .withSuccessHandler(function (data) {
      people = Array.isArray(data) ? data : [];

      render();

      document.getElementById("loading").classList.add("hidden");
    })
    .withFailureHandler(function (error) {
      document.getElementById("loading").textContent =
        "Gagal memuat data: " + error.message;
    })
    .getData();
}

/* =========================
   SORT
   OLDEST -> YOUNGEST
========================= */

function sortByAge(list) {
  return [...list].sort(function (a, b) {
    const dateA = a.tanggalLahir
      ? new Date(a.tanggalLahir)
      : new Date("9999-12-31");

    const dateB = b.tanggalLahir
      ? new Date(b.tanggalLahir)
      : new Date("9999-12-31");

    return dateA - dateB;
  });
}

/* =========================
   RENDER
========================= */

function render() {
  const container = document.getElementById("familyTree");

  const search = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();

  let filtered = people.filter(function (person) {
    const text = [
      person.nama,
      person.hubungan,
      person.ayah,
      person.ibu,
      person.pasangan,
      person.alamat,
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(search);
  });

  /*
   * Urutan utama:
   * tanggal lahir dari paling tua
   * ke paling muda.
   */

  filtered = sortByAge(filtered);

  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="loading">
        Belum ada data anggota keluarga.
      </div>
    `;

    return;
  }

  filtered.forEach(function (person) {
    container.appendChild(createCard(person));
  });
}

/* =========================
   CARD
========================= */

function createCard(person) {
  const card = document.createElement("article");

  card.className = "person-card";

  let photoHTML = `
    <div class="no-photo">
      👤
    </div>
  `;

  if (person.foto) {
    photoHTML = `
      <img
        class="card-photo"
        src="${escapeAttr(person.foto)}"
        alt="${escapeAttr(person.nama)}"
        onclick="openImage('${escapeAttr(person.foto)}')"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
      >

      <div
        class="no-photo"
        style="display:none"
      >
        👤
      </div>
    `;
  }

  const gender = person.jenisKelamin
    ? `👤 ${escapeHTML(person.jenisKelamin)}`
    : "";

  const birth = person.tanggalLahir
    ? `🎂 ${formatDate(person.tanggalLahir)}`
    : "";

  const address = person.alamat
    ? `
        <div class="info">
          📍 ${escapeHTML(person.alamat)}

          <div class="maps-buttons">

            <button
              class="btn btn-map"
              onclick="openMaps('${escapeAttr(person.alamat)}')"
            >
              📍 Lihat Lokasi
            </button>

            <button
              class="btn btn-map"
              onclick="openDirections('${escapeAttr(person.alamat)}')"
            >
              🚗 Petunjuk Arah
            </button>

          </div>
        </div>
      `
    : "";

  let adminButtons = "";

  if (isAdmin()) {
    adminButtons = `
      <button
        class="btn btn-primary"
        onclick="openEditModal('${escapeAttr(person.id)}')"
      >
        ✏️ Edit
      </button>

      <button
        class="btn btn-danger"
        onclick="deletePerson('${escapeAttr(person.id)}')"
      >
        🗑️ Hapus
      </button>
    `;
  }

  card.innerHTML = `

    ${photoHTML}

    <div class="card-body">

      <h3>
        ${escapeHTML(person.nama)}
      </h3>

      ${
        person.hubungan
          ? `
            <div class="relationship">
              ${escapeHTML(person.hubungan)}
            </div>
          `
          : ""
      }

      <div class="info">
        ${gender}
      </div>

      <div class="info">
        ${birth}
      </div>

      ${address}

      ${
        person.pasangan
          ? `
            <div class="info">
              💑 Pasangan:
              ${escapeHTML(person.pasangan)}
            </div>
          `
          : ""
      }

      <div class="card-actions">

        <button
          class="btn btn-primary"
          onclick="showDetail('${escapeAttr(person.id)}')"
        >
          🔎 Detail
        </button>

        ${adminButtons}

      </div>

    </div>

  `;

  return card;
}

/* =========================
   ADD
========================= */

function openAddModal() {
  editingId = null;

  document.getElementById("formTitle").textContent = "Tambah Anggota Keluarga";

  document.getElementById("personForm").reset();

  document.getElementById("personId").value = "";

  document.getElementById("oldPhoto").value = "";

  document.getElementById("photoPreview").innerHTML = "";

  openModal("formModal");
}

/* =========================
   EDIT
========================= */

function openEditModal(id) {
  if (!isAdmin()) {
    alert("Hanya admin yang dapat mengedit data.");

    return;
  }

  const person = people.find(function (item) {
    return String(item.id) === String(id);
  });

  if (!person) {
    alert("Data tidak ditemukan");

    return;
  }

  editingId = person.id;

  document.getElementById("formTitle").textContent = "Edit Anggota Keluarga";

  document.getElementById("personId").value = person.id || "";

  document.getElementById("nama").value = person.nama || "";

  document.getElementById("jenisKelamin").value = person.jenisKelamin || "";

  document.getElementById("tanggalLahir").value = person.tanggalLahir || "";

  document.getElementById("hubungan").value = person.hubungan || "";

  document.getElementById("ayah").value = person.ayah || "";

  document.getElementById("ibu").value = person.ibu || "";

  document.getElementById("pasangan").value = person.pasangan || "";

  document.getElementById("alamat").value = person.alamat || "";

  document.getElementById("deskripsi").value = person.deskripsi || "";

  document.getElementById("oldPhoto").value = person.foto || "";

  if (person.foto) {
    document.getElementById("photoPreview").innerHTML = `
        <img
          src="${escapeAttr(person.foto)}"
          alt="Foto"
        >
      `;
  } else {
    document.getElementById("photoPreview").innerHTML = "";
  }

  document.getElementById("foto").value = "";

  openModal("formModal");
}

/* =========================
   SUBMIT
========================= */

function submitPerson(event) {
  event.preventDefault();

  const saveBtn = document.getElementById("saveBtn");

  saveBtn.disabled = true;

  saveBtn.textContent = "Menyimpan...";

  const file = document.getElementById("foto").files[0];

  if (file && file.size > 5 * 1024 * 1024) {
    alert("Foto terlalu besar. Maksimal 5 MB.");

    saveBtn.disabled = false;

    saveBtn.textContent = "Simpan";

    return;
  }

  const data = {
    id: document.getElementById("personId").value,

    nama: document.getElementById("nama").value,

    jenisKelamin: document.getElementById("jenisKelamin").value,

    tanggalLahir: document.getElementById("tanggalLahir").value,

    hubungan: document.getElementById("hubungan").value,

    ayah: document.getElementById("ayah").value,

    ibu: document.getElementById("ibu").value,

    pasangan: document.getElementById("pasangan").value,

    alamat: document.getElementById("alamat").value,

    deskripsi: document.getElementById("deskripsi").value,

    foto: document.getElementById("oldPhoto").value,

    token: adminToken,
  };

  if (file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      const base64 = e.target.result.split(",")[1];

      google.script.run
        .withSuccessHandler(function (result) {
          data.foto = result.url;

          saveData(data, saveBtn);
        })
        .withFailureHandler(function (error) {
          alert("Upload foto gagal: " + error.message);

          resetSaveButton(saveBtn);
        })
        .uploadPhoto({
          name: file.name,

          mimeType: file.type,

          data: base64,
        });
    };

    reader.readAsDataURL(file);
  } else {
    saveData(data, saveBtn);
  }
}

/* =========================
   SAVE DATA
========================= */

function saveData(data, saveBtn) {
  google.script.run
    .withSuccessHandler(function () {
      alert(data.id ? "Data berhasil diperbarui" : "Data berhasil ditambahkan");

      closeModal("formModal");

      resetSaveButton(saveBtn);

      loadData();
    })
    .withFailureHandler(function (error) {
      alert("Gagal menyimpan data: " + error.message);

      resetSaveButton(saveBtn);
    })
    .savePerson(data);
}

function resetSaveButton(button) {
  button.disabled = false;

  button.textContent = "Simpan";
}

/* =========================
   DELETE
========================= */

function deletePerson(id) {
  if (!isAdmin()) {
    alert("Hanya admin yang dapat menghapus data.");

    return;
  }

  const person = people.find(function (item) {
    return String(item.id) === String(id);
  });

  if (!person) return;

  if (!confirm('Hapus "' + person.nama + '"?')) {
    return;
  }

  google.script.run
    .withSuccessHandler(function () {
      alert("Data berhasil dihapus");

      loadData();
    })
    .withFailureHandler(function (error) {
      alert("Gagal menghapus: " + error.message);
    })
    .deletePerson(id, adminToken);
}

/* =========================
   DETAIL
========================= */

function showDetail(id) {
  const person = people.find(function (item) {
    return String(item.id) === String(id);
  });

  if (!person) return;

  let photo = "";

  if (person.foto) {
    photo = `
      <img
        class="detail-photo"
        src="${escapeAttr(person.foto)}"
        alt="${escapeAttr(person.nama)}"
        onclick="openImage('${escapeAttr(person.foto)}')"
      >
    `;
  }

  let maps = "";

  if (person.alamat) {
    maps = `
      <div class="maps-buttons">

        <button
          class="btn btn-map"
          onclick="openMaps('${escapeAttr(person.alamat)}')"
        >
          📍 Lihat Lokasi
        </button>

        <button
          class="btn btn-map"
          onclick="openDirections('${escapeAttr(person.alamat)}')"
        >
          🚗 Petunjuk Arah
        </button>

      </div>
    `;
  }

  document.getElementById("detailContent").innerHTML = `

      <h2>
        ${escapeHTML(person.nama)}
      </h2>

      ${photo}

      <div class="detail-info">

        ${detailRow("Jenis Kelamin", person.jenisKelamin)}

        ${detailRow(
          "Tanggal Lahir",
          person.tanggalLahir ? formatDate(person.tanggalLahir) : "",
        )}

        ${detailRow("Hubungan", person.hubungan)}

        ${detailRow("Ayah", person.ayah)}

        ${detailRow("Ibu", person.ibu)}

        ${detailRow("Pasangan", person.pasangan)}

        ${detailRow("Alamat", person.alamat)}

        ${maps}

        ${detailRow("Deskripsi", person.deskripsi)}

      </div>
    `;

  openModal("detailModal");
}

function detailRow(label, value) {
  if (!value) return "";

  return `
    <div class="detail-row">

      <div class="detail-label">
        ${escapeHTML(label)}
      </div>

      <div>
        ${escapeHTML(value)}
      </div>

    </div>
  `;
}

/* =========================
   MAPS
========================= */

function openMaps(address) {
  if (!address) return;

  const url =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(address);

  window.open(url, "_blank");
}

function openDirections(address) {
  if (!address) return;

  const url =
    "https://www.google.com/maps/dir/?api=1&destination=" +
    encodeURIComponent(address);

  window.open(url, "_blank");
}

function previewMap() {
  const address = document.getElementById("alamat").value.trim();

  if (!address) {
    alert("Masukkan alamat terlebih dahulu.");

    return;
  }

  openMaps(address);
}

/* =========================
   PHOTO PREVIEW
========================= */

function previewPhoto(event) {
  const file = event.target.files[0];

  const preview = document.getElementById("photoPreview");

  if (!file) {
    preview.innerHTML = "";

    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Foto terlalu besar. Maksimal 5 MB.");

    event.target.value = "";

    preview.innerHTML = "";

    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    preview.innerHTML = `
      <img
        src="${e.target.result}"
        alt="Preview"
      >
    `;
  };

  reader.readAsDataURL(file);
}

/* =========================
   IMAGE LIGHTBOX
========================= */

function openImage(url) {
  document.getElementById("largeImage").src = url;

  openModal("imageModal");
}

/* =========================
   LOGIN
========================= */

function openLogin() {
  document.getElementById("loginUsername").value = "";

  document.getElementById("loginPassword").value = "";

  document.getElementById("loginError").textContent = "";

  openModal("loginModal");
}

function loginAdmin(event) {
  event.preventDefault();

  const username = document.getElementById("loginUsername").value;

  const password = document.getElementById("loginPassword").value;

  google.script.run
    .withSuccessHandler(function (result) {
      if (!result.success) {
        document.getElementById("loginError").textContent = result.message;

        return;
      }

      adminToken = result.token;

      localStorage.setItem("silsilah_admin_token", adminToken);

      closeModal("loginModal");

      updateAdminUI();

      render();

      alert("Login admin berhasil");
    })
    .withFailureHandler(function (error) {
      document.getElementById("loginError").textContent = error.message;
    })
    .login(username, password);
}

/* =========================
   LOGOUT
========================= */

function logoutAdmin() {
  if (!adminToken) return;

  google.script.run
    .withSuccessHandler(function () {
      adminToken = "";

      localStorage.removeItem("silsilah_admin_token");

      updateAdminUI();

      render();
    })
    .logout(adminToken);
}

/* =========================
   ADMIN UI
========================= */

function isAdmin() {
  return !!adminToken;
}

function updateAdminUI() {
  const loginBtn = document.getElementById("loginBtn");

  const logoutBtn = document.getElementById("logoutBtn");

  if (isAdmin()) {
    loginBtn.classList.add("hidden");

    logoutBtn.classList.remove("hidden");
  } else {
    loginBtn.classList.remove("hidden");

    logoutBtn.classList.add("hidden");
  }
}

/* =========================
   MODAL
========================= */

function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}

function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

window.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal").forEach(function (modal) {
      modal.classList.add("hidden");
    });

    document.getElementById("imageModal").classList.add("hidden");
  }
});

/* =========================
   FORMAT DATE
========================= */

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString + "T00:00:00");

  if (isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* =========================
   SECURITY HELPERS
========================= */

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value).replaceAll("\n", " ");
}
