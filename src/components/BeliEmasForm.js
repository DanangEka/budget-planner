import React, { useState } from "react";

function BeliEmasForm({
  hargaUBS,
  hargaAntam,
  totalTabungan,
  setTotalTabungan,
  onPembelian,
}) {
  const [brand, setBrand] = useState("Antam");

  const handleBeli = () => {
    const harga = brand === "Antam" ? hargaAntam : hargaUBS;

    if (totalTabungan < harga) {
      alert("Tabungan belum cukup!");
      return;
    }

    const tanggal = new Date().toLocaleDateString("id-ID");
    const pembelian = {
      id: Date.now(), // ID unik untuk identifikasi
      tanggal,
      brand,
      harga,
    };

    // Kurangi tabungan
    setTotalTabungan((prev) => prev - harga);

    // Kirim data pembelian ke parent (HargaEmasChart)
    if (onPembelian) {
      onPembelian(pembelian);
    }
  };

  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="text-lg font-semibold mb-2">🛒 Pembelian Emas</h3>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <select
          className="border p-2 rounded w-full sm:w-auto"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        >
          <option value="Antam">Logam Mulia Antam</option>
          <option value="UBS">Logam Mulia UBS</option>
        </select>
        <button
          onClick={handleBeli}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
        >
          Beli 1 gram
        </button>
      </div>
    </div>
  );
}

export default BeliEmasForm;
