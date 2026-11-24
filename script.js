// ====== ISI DUA NILAI INI ======
const SUPABASE_URL = "https://yxlhafhytmgyxvpgauww.supabase.co";
const SUPABASE_KEY = "TEMPEL_PUBLISHABLE_KEY_DI_SINI"; // diawali sb_publishable_
// ================================

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);
let semuaTransaksi = [];
let sudahLogin = false;

const rupiah = (n) => "Rp" + Math.abs(n).toLocaleString("id-ID");
const namaBulan = (ym) =>
  new Date(ym + "-01T00:00:00").toLocaleDateString("id-ID", { month: "long", year: "numeric" });
const tglPendek = (s) =>
  new Date(s + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

// ---------- Data ----------
async function muatData() {
  const { data, error } = await db
    .from("transaksi")
    .select("*")
    .order("tanggal", { ascending: false })
    .order("id", { ascending: false });
  if (error) {
    $("status").textContent = "Gagal memuat data: " + error.message;
    return;
  }
  semuaTransaksi = data;
  isiFilterBulan();
  tampilkan();
}

function isiFilterBulan() {
  const pilihan = $("filterBulan").value || "semua";
  const bulan = [...new Set(semuaTransaksi.map((t) => t.tanggal.slice(0, 7)))];
  $("filterBulan").innerHTML = "";
  $("filterBulan").add(new Option("Semua bulan", "semua"));
  bulan.forEach((b) => $("filterBulan").add(new Option(namaBulan(b), b)));
  $("filterBulan").value = bulan.includes(pilihan) || pilihan === "semua" ? pilihan : "semua";
}

function tampilkan() {
  // Saldo selalu dihitung dari semua transaksi
  const masuk = semuaTransaksi.filter((t) => t.jenis === "masuk").reduce((a, t) => a + t.jumlah, 0);
  const keluar = semuaTransaksi.filter((t) => t.jenis === "keluar").reduce((a, t) => a + t.jumlah, 0);
  const saldo = masuk - keluar;
  $("saldo").textContent = (saldo < 0 ? "-" : "") + rupiah(saldo);
  $("totalMasuk").textContent = rupiah(masuk);
  $("totalKeluar").textContent = rupiah(keluar);

  // Riwayat mengikuti filter bulan
  const bulan = $("filterBulan").value;
  const tampil = bulan === "semua" ? semuaTransaksi : semuaTransaksi.filter((t) => t.tanggal.startsWith(bulan));

  const daftar = $("daftar");
  daftar.innerHTML = "";
  tampil.forEach((t) => {
    const li = document.createElement("li");

    const ket = document.createElement("span");
    ket.className = "ket";
    ket.textContent = t.keterangan || (t.jenis === "masuk" ? "Uang masuk" : "Uang keluar");

    const nominal = document.createElement("span");
    nominal.className = "nominal " + t.jenis;
    nominal.textContent = (t.jenis === "masuk" ? "+" : "-") + rupiah(t.jumlah);

    const tgl = document.createElement("span");
    tgl.className = "tgl";
    tgl.textContent = tglPendek(t.tanggal);

    li.append(ket, nominal, tgl);

    if (sudahLogin) {
      const hapus = document.createElement("button");
      hapus.className = "hapus";
      hapus.textContent = "Hapus";
      hapus.addEventListener("click", () => hapusTransaksi(t.id));
      li.append(hapus);
    }
    daftar.append(li);
  });
  $("kosong").hidden = tampil.length > 0;
}

async function hapusTransaksi(id) {
  if (!confirm("Hapus transaksi ini? Tindakan ini tidak bisa dibatalkan.")) return;
  const { error } = await db.from("transaksi").delete().eq("id", id);
  if (error) return alert("Gagal menghapus: " + error.message);
  muatData();
}

// ---------- Form transaksi ----------
$("formTransaksi").addEventListener("submit", async (e) => {
  e.preventDefault();
  const tombol = e.submitter;
  tombol.disabled = true;

  const { error } = await db.from("transaksi").insert({
    jenis: document.querySelector('input[name="jenis"]:checked').value,
    tanggal: $("tanggal").value,
    jumlah: parseInt($("jumlah").value, 10),
    keterangan: $("keterangan").value.trim() || null,
  });

  tombol.disabled = false;
  if (error) return alert("Gagal menyimpan: " + error.message);

  $("jumlah").value = "";
  $("keterangan").value = "";
  muatData();
});

// ---------- Login bendahara ----------
function aturTampilanLogin() {
  $("panelForm").hidden = !sudahLogin;
  $("btnAuth").textContent = sudahLogin ? "Keluar" : "Masuk bendahara";
  $("status").textContent = sudahLogin ? "Masuk sebagai bendahara" : "Tampilan baca-saja";
  tampilkan();
}

$("btnAuth").addEventListener("click", async () => {
  if (sudahLogin) {
    await db.auth.signOut();
  } else {
    $("pesanLogin").textContent = "";
    $("dialogLogin").showModal();
  }
});

$("batalLogin").addEventListener("click", () => $("dialogLogin").close());

$("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await db.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value,
  });
  if (error) {
    $("pesanLogin").textContent = "Email atau password salah.";
    return;
  }
  $("password").value = "";
  $("dialogLogin").close();
});

db.auth.onAuthStateChange((_event, session) => {
  sudahLogin = !!session;
  aturTampilanLogin();
});

$("filterBulan").addEventListener("change", tampilkan);

// ---------- Mulai ----------
$("tanggal").value = new Date().toLocaleDateString("sv-SE"); // format YYYY-MM-DD
muatData();