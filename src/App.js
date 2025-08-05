// App.js
import React, { useEffect, useState } from "react";
import { auth } from "./firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import Login from "./Login";
import HargaEmasChart from "./components/HargaEmasChart";

const SHARED_GROUP_ID = "keluarga123";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
    setIsSidebarOpen(false);
  };
  
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [newNominal, setNewNominal] = useState("");
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [filterUser, setFilterUser] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [penggunaanForm, setPenggunaanForm] = useState({ jumlah: "", keterangan: "" });
  
  const [hargaUBS, setHargaUBS] = useState(null);
  const [hargaAntam, setHargaAntam] = useState(null);
  const [totalTabungan, setTotalTabungan] = useState(0);

  useEffect(() => {
    const total = history.reduce((acc, item) => acc + (item.tabungan || 0), 0);
    setTotalTabungan(total);
  }, [history]); // Akan jalan setiap history berubah


  const docRef = doc(db, "budgets", SHARED_GROUP_ID);

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("Login gagal: " + error.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const fetchHistory = async () => {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data().history || [];
      setHistory(data);
    } else {
      await setDoc(docRef, { history: [] });
      setHistory([]);
    }
  };

  const hitungAlokasiBaru = (nominal) => {
    const kebutuhan = Math.min(nominal * 0.5, 1480000);
    const hiburan = Math.min(nominal * 0.1, 200000);
    const mama = 300000;
    const emak = 300000;
    const sedekah = Math.floor(nominal * 0.025);
    const tabunganAwal = Math.floor(nominal * 0.3);

    const totalSementara = kebutuhan + hiburan + mama + emak + sedekah + tabunganAwal;
    const sisa = nominal - totalSementara;
    const tabungan = tabunganAwal + (sisa > 0 ? sisa : 0);
    
  return {
    kebutuhan,
    hiburan,
    mama,
    emak,
    sedekah,
    tabungan
  };
};

  const handleAddOrUpdate = async () => {
  const income = parseInt(newNominal);

  if (!income || income <= 0) {
    alert("Masukkan nominal yang valid!");
    return;
  }

  // === LOGIKA ALOKASI ===
  const kebutuhanTotal = income > 2000000 ? 1480000 : Math.floor(income * 0.5);
  const hiburan = income > 2000000 ? 200000 : Math.floor(income * 0.1);
  const mama = 300000;
  const emak = 300000;
  const sedekah = Math.floor(income * 0.025);
  const tabungan = Math.floor(income * 0.3);

  // Hitung sisa dana untuk darurat
  const totalSementara =
    kebutuhanTotal + hiburan + mama + emak + sedekah + tabungan;

  const sisa = income - totalSementara;
  const darurat = sisa > 0 ? sisa : 0;

  const date = new Date().toISOString().split("T")[0];

  const newEntry = {
    nominal: income,
    date,
    by: user.email,
    kebutuhan: {
      total: kebutuhanTotal,
      sisa: kebutuhanTotal,
      penggunaan: [],
    },
    hiburan: {
      total: hiburan,
      sisa: hiburan,
      penggunaan: [],
    },
    mama,
    emak,
    sedekah,
    tabungan,
    darurat: {
      total: darurat,
      sisa: darurat,
      penggunaan: [],
    },
  };

  let updatedHistory;

  if (editIndex !== null) {
    updatedHistory = [...history];
    updatedHistory[editIndex] = newEntry;
    setEditIndex(null);
  } else {
    updatedHistory = [...history, newEntry];
  }

  setHistory(updatedHistory);
  setNewNominal("");
  setSelectedDetail(newEntry);

  try {
    await setDoc(doc(db, "history", user.uid), { data: updatedHistory });
  } catch (error) {
    console.error("Gagal menyimpan ke Firestore:", error);
  }
};

const handleAddPenggunaanKebutuhan = async (index, jumlah, keterangan) => {
  const updatedHistory = [...history];
  const item = updatedHistory[index];

  if (!item || !item.kebutuhan || typeof item.kebutuhan !== "object") {
    alert("Data kebutuhan tidak tersedia.");
    return;
  }

  item.kebutuhan.penggunaan = item.kebutuhan.penggunaan || [];

  const totalTerpakai = item.kebutuhan.penggunaan.reduce((acc, p) => acc + p.jumlah, 0);
  const sisaSebelum = item.kebutuhan.total - totalTerpakai;

  if (jumlah > sisaSebelum) {
    alert("Pengeluaran melebihi sisa kebutuhan!");
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  item.kebutuhan.penggunaan.push({ tanggal: today, jumlah, keterangan });

  // Hitung ulang sisa
  const totalPenggunaan = item.kebutuhan.penggunaan.reduce((acc, p) => acc + p.jumlah, 0);
  item.kebutuhan.sisa = item.kebutuhan.total - totalPenggunaan;

  await setDoc(docRef, { history: updatedHistory });
  setHistory(updatedHistory);
  setSelectedDetail(item);
};

  const handleAddPenggunaan = async (index) => {
    const jumlah = parseInt(penggunaanForm.jumlah);
    const keterangan = penggunaanForm.keterangan;
    if (!jumlah || jumlah <= 0 || !keterangan) {
      alert("Isi jumlah dan keterangan dengan benar.");
      return;
    }

    const updatedHistory = [...history];
    const item = updatedHistory[index];

    if (!item.kebutuhan || typeof item.kebutuhan !== "object") return;

    item.kebutuhan.penggunaan = item.kebutuhan.penggunaan || [];
    const totalTerpakai = item.kebutuhan.penggunaan.reduce((acc, p) => acc + p.jumlah, 0);
    const sisaSebelum = item.kebutuhan.total - totalTerpakai;

    if (jumlah > sisaSebelum) {
      alert("Pengeluaran melebihi sisa kebutuhan!");
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    item.kebutuhan.penggunaan.push({
      tanggal: today,
      jumlah,
      keterangan
    });

    item.kebutuhan.sisa = item.kebutuhan.total - item.kebutuhan.penggunaan.reduce((acc, p) => acc + p.jumlah, 0);

    await setDoc(docRef, { history: updatedHistory });
    setHistory(updatedHistory);
    setSelectedDetail(item);
    setPenggunaanForm({ jumlah: "", keterangan: "" });
  };

  const handleDelete = async (index) => {
    const confirm = window.confirm("Yakin ingin menghapus?");
    if (!confirm) return;
    const updatedHistory = history.filter((_, i) => i !== index);
    await setDoc(docRef, { history: updatedHistory });
    setHistory(updatedHistory);
    setSelectedDetail(null);
  };

  const handleEdit = (index) => {
    const item = history[index];
    setNewNominal(item.nominal);
    setEditIndex(index);
    setSelectedDetail(null);
  };

  const handleSelectDetail = (item) => {
    const isSame =
      selectedDetail?.date === item.date &&
      selectedDetail?.nominal === item.nominal;
    setSelectedDetail(isSame ? null : item);
  };

  const applyFilters = () => {
    let filtered = [...history];

    if (filterUser) {
      filtered = filtered.filter(item => item.by === filterUser);
    }

    if (filterMonth) {
      filtered = filtered.filter(item => {
        const month = new Date(item.date).getMonth() + 1;
        return month === parseInt(filterMonth);
      });
    }

    if (filterYear) {
      filtered = filtered.filter(item => {
        const year = new Date(item.date).getFullYear();
        return year === parseInt(filterYear);
      });
    }

    if (sortOrder === "asc") {
      filtered.sort((a, b) => a.nominal - b.nominal);
    } else if (sortOrder === "desc") {
      filtered.sort((a, b) => b.nominal - a.nominal);
    }

    setFilteredHistory(filtered);
  };
  const [hiburanForm, setHiburanForm] = useState({ jumlah: "", keterangan: "" });
const [daruratForm, setDaruratForm] = useState({ jumlah: "", keterangan: "" });

const handleAddHiburan = async (detail) => {
  if (!hiburanForm.jumlah || !hiburanForm.keterangan) {
    alert("Isi jumlah dan keterangan hiburan dengan benar.");
    return;
  }

  const tanggal = new Date().toISOString().split("T")[0];
  const updated = [...history];
  const idx = updated.findIndex(
    (d) => d.date === detail.date && d.nominal === detail.nominal
  );
  if (idx === -1) return;

  // Perbaikan: pastikan hiburan adalah objek
  if (typeof updated[idx].hiburan === "number") {
    const nominal = updated[idx].hiburan;
    updated[idx].hiburan = {
      total: nominal,
      sisa: nominal,
      penggunaan: [],
    };
  }

  updated[idx].hiburan.penggunaan = updated[idx].hiburan.penggunaan || [];

  updated[idx].hiburan.penggunaan.push({
    tanggal,
    jumlah: parseInt(hiburanForm.jumlah),
    keterangan: hiburanForm.keterangan,
  });

  const totalPenggunaan = updated[idx].hiburan.penggunaan.reduce(
    (acc, p) => acc + p.jumlah,
    0
  );
  updated[idx].hiburan.sisa = updated[idx].hiburan.total - totalPenggunaan;

  await setDoc(docRef, { history: updated });
  setHistory(updated);
  setSelectedDetail(updated[idx]);
  setHiburanForm({ jumlah: "", keterangan: "" });
};


const handleAddDarurat = async (detail) => {
  if (!daruratForm.jumlah || !daruratForm.keterangan) {
    alert("Isi jumlah dan keterangan darurat dengan benar.");
    return;
  }

  const tanggal = new Date().toISOString().split("T")[0];
  const updated = [...history];
  const idx = updated.findIndex(
    (d) => d.date === detail.date && d.nominal === detail.nominal
  );
  if (idx === -1) return;

  // Perbaikan: pastikan darurat adalah objek
  if (typeof updated[idx].darurat === "number") {
    const nominal = updated[idx].darurat;
    updated[idx].darurat = {
      total: nominal,
      sisa: nominal,
      penggunaan: [],
    };
  }

  updated[idx].darurat.penggunaan = updated[idx].darurat.penggunaan || [];

  updated[idx].darurat.penggunaan.push({
    tanggal,
    jumlah: parseInt(daruratForm.jumlah),
    keterangan: daruratForm.keterangan,
  });

  const totalPenggunaan = updated[idx].darurat.penggunaan.reduce(
    (acc, p) => acc + p.jumlah,
    0
  );
  updated[idx].darurat.sisa = updated[idx].darurat.total - totalPenggunaan;

  await setDoc(docRef, { history: updated });
  setHistory(updated);
  setSelectedDetail(updated[idx]);
  setDaruratForm({ jumlah: "", keterangan: "" });
};

  useEffect(() => {
    applyFilters();
  }, [history, filterUser, filterMonth, filterYear, sortOrder]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchHistory();
      } else {
        setUser(null);
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  console.log("Harga UBS:", hargaUBS);
  console.log("Harga Antam:", hargaAntam);

  return (          
    <div className="min-h-screen relative bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 p-4 sm:p-6 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto bg-white bg-opacity-90 rounded-xl shadow-lg p-4 sm:p-8">
        <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 bg-red-500 text-white p-2 rounded"
      >
        ☰
      </button>

              {/* Sidebar */}
              {isSidebarOpen && (
                <div
          className={`fixed top-0 left-0 h-full w-64 bg-white shadow-md z-50 transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4 border-b font-bold text-lg">Menu</div>
          <ul className="p-4 space-y-2">
            <li
              className="cursor-pointer hover:underline text-red-500"
              onClick={() => handleNavigate("dashboard")}
            >
              📊 Dashboard
            </li>
            <li
              className="cursor-pointer hover:underline text-orange-500"
              onClick={() => handleNavigate("investasi")}
            >
              📈 Investasi Emas
            </li>
          </ul>
        </div>
      )}
      
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-6 text-center">💰 Rencana Keuangan Bersama</h1>
        {/* Hamburger Button */}
      
        {user ? (
          <>
            <p className="text-lg mb-4 text-center">👋 Hai, {user.email}</p>
            <div className="flex justify-center mb-6">
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white py-2 px-6 rounded-md shadow-md transition"
              >
                Logout
              </button>
            </div>
            
           {currentPage === "dashboard" && (
              <>
                {/* Semua fitur dashboard keuangan */}
                {/* Termasuk input nominal, riwayat, dll */}
              </>
            )}

            {currentPage === "investasi" && (
              <>
                <h2 className="text-xl font-bold mb-4">📈 Investasi Emas</h2>
                <HargaEmasChart
                  totalTabungan={totalTabungan}
                  setTotalTabungan={setTotalTabungan}
                  setHargaUBS={setHargaUBS}
                  setHargaAntam={setHargaAntam}
                  hargaUBS={hargaUBS}
                  hargaAntam={hargaAntam}
                />
                {/* Tambahkan fitur emas lain di sini jika perlu */}
              </>
            )}

            {/* Input nominal */}
            <div className="mb-6">
              <label className="block mb-2 font-medium">
                {editIndex !== null ? "Edit nominal:" : "Masukkan nominal pemasukan:"}
              </label>
              <div className="flex flex-col sm:flex-row sm:space-x-2">
                <input
                  type="number"
                  value={newNominal}
                  onChange={(e) => setNewNominal(e.target.value)}
                  placeholder="Contoh: 2500000"
                  className="flex-grow px-4 py-2 mb-2 sm:mb-0 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition"
                />
                <button
                  onClick={handleAddOrUpdate}
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-md shadow-md transition"
                >
                  {editIndex !== null ? "Update" : "Proses"}
                </button>
              </div>
            </div>

            {/* Filter & sort */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <select onChange={(e) => setFilterUser(e.target.value)} className="p-2 border rounded w-full">
                <option value="">Semua User</option>
                {[...new Set(history.map(item => item.by))].map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>

              <select onChange={(e) => setFilterMonth(e.target.value)} className="p-2 border rounded w-full">
                <option value="">Semua Bulan</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>

              <select onChange={(e) => setFilterYear(e.target.value)} className="p-2 border rounded w-full">
                <option value="">Semua Tahun</option>
                {[...new Set(history.map(item => new Date(item.date).getFullYear()))].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <select onChange={(e) => setSortOrder(e.target.value)} className="p-2 border rounded w-full">
                <option value="">Urutan Nominal</option>
                <option value="asc">Terkecil → Terbesar</option>
                <option value="desc">Terbesar → Terkecil</option>
              </select>
            </div>

            {/* Riwayat */}
            <h2 className="text-2xl font-bold mb-4">📅 Riwayat Pemasukan</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredHistory.map((item, i) => (
  <div key={i} className="mb-4">
    <div
      className="bg-white border rounded-lg shadow p-4 hover:bg-pink-50 transition cursor-pointer"
      onClick={() => handleSelectDetail(item)}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="text-lg font-semibold text-indigo-700">
            Rp {item.nominal?.toLocaleString("id-ID")}
          </p>
          <p className="text-sm text-gray-500">{item.date} — {item.by}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(i); }}
            className="text-yellow-600 hover:underline text-sm"
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(i); }}
            className="text-red-600 hover:underline text-sm"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>

{selectedDetail?.date === item.date && selectedDetail?.nominal === item.nominal && (
  <div className="transition-all duration-500 ease-in-out bg-gray-100 p-4 rounded-md shadow mt-2">
    <h3 className="text-lg font-semibold mb-2">📊 Rincian Alokasi:</h3>
    <p>Tanggal: {selectedDetail.date}</p>
    <p>Nominal: Rp {selectedDetail.nominal?.toLocaleString("id-ID")}</p>
    <p>
      Kebutuhan: Rp {Number(selectedDetail.kebutuhan?.total || 0).toLocaleString("id-ID")}{" "}
      (sisa: Rp {Number(selectedDetail.kebutuhan?.sisa || 0).toLocaleString("id-ID")})
    </p>
    <p>Tabungan: Rp {selectedDetail.tabungan?.toLocaleString("id-ID")}</p>
    <p>Hiburan: Rp {Number(selectedDetail.hiburan?.total || 0).toLocaleString("id-ID")} (sisa: Rp {Number(selectedDetail.hiburan?.sisa || 0).toLocaleString("id-ID")})</p>
    <p>Darurat: Rp {Number(selectedDetail.darurat?.total || 0).toLocaleString("id-ID")} (sisa: Rp {Number(selectedDetail.darurat?.sisa || 0).toLocaleString("id-ID")})</p>
    <p>Mama: Rp {selectedDetail.mama?.toLocaleString("id-ID")}</p>
    <p>Emak: Rp {selectedDetail.emak?.toLocaleString("id-ID")}</p>
    <p>Sedekah: Rp {selectedDetail.sedekah?.toLocaleString("id-ID")}</p>
    <p className="text-sm text-gray-500 mt-2">Ditambahkan oleh: {selectedDetail.by}</p>

    {/* === PENGGUNAAN KEBUTUHAN === */}
    <div className="mt-4">
      <h4 className="font-semibold mb-1">📟 Penggunaan Kebutuhan:</h4>
      {selectedDetail.kebutuhan?.penggunaan?.map((p, idx) => (
        <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 mb-2">
          <span>{p.tanggal}</span>
          <input
            type="text"
            value={p.keterangan}
            onChange={(e) => {
              const newData = [...selectedDetail.kebutuhan.penggunaan];
              newData[idx].keterangan = e.target.value;
              setSelectedDetail({
                ...selectedDetail,
                kebutuhan: {
                  ...selectedDetail.kebutuhan,
                  penggunaan: newData,
                },
              });
            }}
            className="border px-2 py-1 rounded w-1/2"
          />
          <input
            type="number"
            value={p.jumlah}
            onChange={(e) => {
              const newData = [...selectedDetail.kebutuhan.penggunaan];
              newData[idx].jumlah = parseInt(e.target.value || 0);
              const sisa = selectedDetail.kebutuhan.total - newData.reduce((a, b) => a + b.jumlah, 0);
              setSelectedDetail({
                ...selectedDetail,
                kebutuhan: {
                  ...selectedDetail.kebutuhan,
                  penggunaan: newData,
                  sisa,
                },
              });
            }}
            className="border px-2 py-1 rounded w-28"
          />
          <button
            className="text-sm text-blue-500 underline"
            onClick={async () => {
              const updatedHistory = [...history];
              const hIdx = updatedHistory.findIndex(
                (h) => h.date === selectedDetail.date && h.nominal === selectedDetail.nominal
              );
              if (hIdx !== -1) {
                updatedHistory[hIdx].kebutuhan.penggunaan = selectedDetail.kebutuhan.penggunaan;
                updatedHistory[hIdx].kebutuhan.sisa = selectedDetail.kebutuhan.sisa;
                await setDoc(docRef, { history: updatedHistory });
                setHistory(updatedHistory);
              }
            }}
          >
            Simpan
          </button>
        </div>
      ))}

      {/* Tambah Penggunaan Kebutuhan */}
      <div className="mt-4">
        <h4 className="font-semibold mb-1">➕ Tambah Penggunaan Dana Kebutuhan</h4>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <input
            type="number"
            value={penggunaanForm.jumlah}
            onChange={(e) => setPenggunaanForm({ ...penggunaanForm, jumlah: e.target.value })}
            placeholder="Jumlah (Rp)"
            className="px-3 py-2 border rounded-md w-full sm:w-1/3"
          />
          <input
            type="text"
            value={penggunaanForm.keterangan}
            onChange={(e) => setPenggunaanForm({ ...penggunaanForm, keterangan: e.target.value })}
            placeholder="Keterangan"
            className="px-3 py-2 border rounded-md w-full sm:w-2/3"
          />
        </div>
        <button
                onClick={() =>
                  handleAddPenggunaan(
                    history.findIndex(
                      (h) =>
                        h.date === selectedDetail.date &&
                        h.nominal === selectedDetail.nominal
                    )
                  )
                }
                className="bg-blue-500 text-white px-4 py-2 rounded-md"
              >
                Tambah
              </button>
        <button
          onClick={() => handleAddPenggunaanKebutuhan(selectedDetail)}
          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
        >
          Simpan Penggunaan
        </button>
      </div>

      {/* === Penggunaan Hiburan === */}
      <div className="mt-6">
        <h4 className="font-semibold mb-1">🎮 Penggunaan Dana Hiburan</h4>
        <ul className="text-sm text-gray-700 list-disc pl-5">
          {selectedDetail.hiburan?.penggunaan?.map((p, idx) => (
            <li key={idx}>
              {p.tanggal}: {p.keterangan} - Rp {p.jumlah.toLocaleString("id-ID")}
            </li>
          ))}
        </ul>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <input
            type="number"
            placeholder="Jumlah (Rp)"
            value={hiburanForm.jumlah}
            onChange={(e) => setHiburanForm({ ...hiburanForm, jumlah: e.target.value })}
            className="px-3 py-2 border rounded-md w-full sm:w-1/3"
          />
          <input
            type="text"
            placeholder="Keterangan"
            value={hiburanForm.keterangan}
            onChange={(e) => setHiburanForm({ ...hiburanForm, keterangan: e.target.value })}
            className="px-3 py-2 border rounded-md w-full sm:w-2/3"
          />
        </div>
        <button
          onClick={() => handleAddHiburan(selectedDetail)}
          className="mt-2 px-3 py-1 bg-purple-600 text-white rounded"
        >
          Tambahkan Penggunaan Hiburan
        </button>
      </div>

      {/* === Penggunaan Darurat === */}
      <div className="mt-6">
        <h4 className="font-semibold mb-1">🧯 Penggunaan Dana Darurat</h4>
        <ul className="text-sm text-gray-700 list-disc pl-5">
          {selectedDetail.darurat?.penggunaan?.map((p, idx) => (
            <li key={idx}>
              {p.tanggal}: {p.keterangan} - Rp {p.jumlah.toLocaleString("id-ID")}
            </li>
          ))}
        </ul>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <input
            type="number"
            placeholder="Jumlah (Rp)"
            value={daruratForm.jumlah}
            onChange={(e) => setDaruratForm({ ...daruratForm, jumlah: e.target.value })}
            className="px-3 py-2 border rounded-md w-full sm:w-1/3"
          />
          <input
            type="text"
            placeholder="Keterangan"
            value={daruratForm.keterangan}
            onChange={(e) => setDaruratForm({ ...daruratForm, keterangan: e.target.value })}
            className="px-3 py-2 border rounded-md w-full sm:w-2/3"
          />
        </div>
        <button
          onClick={() => handleAddDarurat(selectedDetail)}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded"
        >
          Tambahkan Penggunaan Darurat
              </button>
            </div>
          </div>
        </div>
    )}
  </div>
))}

            </div>
          </>
        ) : (
          <Login onLogin={handleLogin} loading={loading} />
        )}
      </div>
    </div>
  );
}

export default App;
