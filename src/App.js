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

const SHARED_GROUP_ID = "keluarga123";

function App() {
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

  const handleAddOrUpdate = async () => {
    const income = parseFloat(newNominal);
    if (!income || isNaN(income)) return;

    const now = new Date();
    const date = now.toISOString().split("T")[0];

    const kebutuhan = Math.round(income * 0.5);
    const tabungan = Math.round(income * 0.3);
    const hiburan = Math.round(income * 0.1);
    const darurat = income - kebutuhan - tabungan - hiburan;

    const detail = {
      nominal: income,
      date,
      kebutuhan: {
        total: kebutuhan,
        sisa: kebutuhan,
        penggunaan: []
      },
      tabungan,
      hiburan,
      darurat,
      by: user.email,
    };

    let updatedHistory = [];

    if (editIndex !== null) {
      updatedHistory = [...history];
      updatedHistory[editIndex] = detail;
    } else {
      updatedHistory = [...history, detail];
    }

    await setDoc(docRef, { history: updatedHistory });
    setHistory(updatedHistory);
    setSelectedDetail(detail);
    setNewNominal("");
    setEditIndex(null);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 p-6 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto bg-white bg-opacity-90 rounded-xl shadow-lg p-8">
        <h1 className="text-4xl font-extrabold mb-6 text-center">💰 Rencana Keuangan Bersama</h1>

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

            {/* Input nominal */}
            <div className="mb-6">
              <label className="block mb-2 font-medium">
                {editIndex !== null ? "Edit nominal:" : "Masukkan nominal pemasukan:"}
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={newNominal}
                  onChange={(e) => setNewNominal(e.target.value)}
                  placeholder="Contoh: 2500000"
                  className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition"
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
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <select onChange={(e) => setFilterUser(e.target.value)} className="p-2 border rounded">
                <option value="">Semua User</option>
                {[...new Set(history.map(item => item.by))].map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>

              <select onChange={(e) => setFilterMonth(e.target.value)} className="p-2 border rounded">
                <option value="">Semua Bulan</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>

              <select onChange={(e) => setFilterYear(e.target.value)} className="p-2 border rounded">
                <option value="">Semua Tahun</option>
                {[...new Set(history.map(item => new Date(item.date).getFullYear()))].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <select onChange={(e) => setSortOrder(e.target.value)} className="p-2 border rounded">
                <option value="">Urutan Nominal</option>
                <option value="asc">Terkecil → Terbesar</option>
                <option value="desc">Terbesar → Terkecil</option>
              </select>
            </div>

            {/* Detail penggunaan */}
            {selectedDetail && (
              <div className="transition-all duration-500 ease-in-out bg-gray-100 p-4 rounded-md shadow mb-6">
                <h3 className="text-lg font-semibold mb-2">📊 Rincian Alokasi:</h3>
                <p>Tanggal: {selectedDetail.date}</p>
                <p>Nominal: Rp {selectedDetail.nominal?.toLocaleString("id-ID")}</p>
                <p>Kebutuhan: Rp {selectedDetail.kebutuhan?.total?.toLocaleString("id-ID")}</p>
                <p>Tabungan: Rp {selectedDetail.tabungan?.toLocaleString("id-ID")}</p>
                <p>Hiburan: Rp {selectedDetail.hiburan?.toLocaleString("id-ID")}</p>
                <p>Darurat: Rp {selectedDetail.darurat?.toLocaleString("id-ID")}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Ditambahkan oleh: {selectedDetail.by}
                </p>

                <div className="mt-4">
                  {selectedDetail.kebutuhan?.penggunaan?.length > 0 && (
                    <>
                      <h4 className="font-semibold mb-1">📟 Penggunaan Kebutuhan:</h4>
                      <ul className="list-disc pl-5 text-sm text-gray-700">
                        {selectedDetail.kebutuhan.penggunaan.map((p, idx) => (
                          <li key={idx}>
                            {p.tanggal}: {p.keterangan} - Rp {p.jumlah.toLocaleString("id-ID")}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {selectedDetail.kebutuhan?.sisa !== undefined && (
                    <p className="mt-2 text-sm text-green-700">
                      💡 Sisa kebutuhan: Rp {selectedDetail.kebutuhan.sisa.toLocaleString("id-ID")}
                    </p>
                  )}

                  <div className="mt-4">
                    <h4 className="font-semibold mb-1">➕ Tambah Penggunaan Dana Kebutuhan</h4>
                    <div className="flex flex-col sm:flex-row gap-2 mt-2">
                      <input
                        type="number"
                        value={penggunaanForm.jumlah}
                        onChange={(e) =>
                          setPenggunaanForm({ ...penggunaanForm, jumlah: e.target.value })
                        }
                        placeholder="Jumlah (Rp)"
                        className="px-3 py-2 border rounded-md w-full sm:w-1/3"
                      />
                      <input
                        type="text"
                        value={penggunaanForm.keterangan}
                        onChange={(e) =>
                          setPenggunaanForm({ ...penggunaanForm, keterangan: e.target.value })
                        }
                        placeholder="Keterangan"
                        className="px-3 py-2 border rounded-md w-full sm:w-2/3"
                      />
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
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Riwayat */}
            <h2 className="text-2xl font-bold mb-4">📅 Riwayat Pemasukan</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredHistory.map((item, i) => (
                <div
                  key={i}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(i);
                        }}
                        className="text-yellow-600 hover:underline text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(i);
                        }}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
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
