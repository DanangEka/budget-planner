import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import BeliEmasForm from "./BeliEmasForm";

function HargaEmasChart({ totalTabungan, setTotalTabungan }) {
  const [data, setData] = useState([]);
  const [hargaUBS, setHargaUBS] = useState(null);
  const [hargaAntam, setHargaAntam] = useState(null);
  const [pembelianLog, setPembelianLog] = useState([]);

  useEffect(() => {
    const sheetUrl =
      "https://opensheet.elk.sh/1Kj0THHCsfEnzOeQnQL8A0RdhLHPP7sf5aq17msSzmeM/Harga1Gram";

    fetch(sheetUrl)
      .then((res) => res.json())
      .then((rows) => {
        const cleaned = rows.map((row) => ({
          tanggal: row.Tanggal,
          UBS: parseInt(row.UBS.replace(/\D/g, ""), 10),
          Antam: parseInt(row.Antam.replace(/\D/g, ""), 10),
        }));
        setData(cleaned);

        if (cleaned.length > 0) {
          const latest = cleaned[cleaned.length - 1];
          setHargaUBS(latest.UBS);
          setHargaAntam(latest.Antam);
        }
      })
      .catch((err) => {
        console.error("Gagal memuat data harga emas:", err);
      });
  }, []);

  const handlePembelian = (pembelian) => {
    setPembelianLog((prev) => [...prev, pembelian]);
  };

  const handleDelete = (id) => {
    const pembelian = pembelianLog.find((item) => item.id === id);
    if (!pembelian) return;

    // Kembalikan uang ke tabungan
    setTotalTabungan((prev) => prev + pembelian.harga);

    // Hapus dari log
    setPembelianLog((prev) => prev.filter((item) => item.id !== id));
  };

  const handleEdit = (id, brandBaru) => {
    setPembelianLog((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              brand: brandBaru,
              harga: brandBaru === "Antam" ? hargaAntam : hargaUBS,
            }
          : item
      )
    );
  };

  const bisaBeliUBS = typeof hargaUBS === "number" && totalTabungan >= hargaUBS;
  const bisaBeliAntam = typeof hargaAntam === "number" && totalTabungan >= hargaAntam;

  return (
    <div className="bg-white rounded-lg shadow p-4 my-6">
      <h2 className="text-xl font-bold mb-2">📊 Harga Emas 1 Gram per Hari</h2>

      <div className="h-40 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="tanggal" />
            <YAxis tickFormatter={(v) => "Rp " + v.toLocaleString("id-ID")} />
            <Tooltip formatter={(v) => "Rp " + v.toLocaleString("id-ID")} />
            <CartesianGrid strokeDasharray="3 3" />
            <Line type="monotone" dataKey="UBS" stroke="#10b981" strokeWidth={2} name="UBS" />
            <Line type="monotone" dataKey="Antam" stroke="#f59e0b" strokeWidth={2} name="Antam" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {(hargaUBS || hargaAntam) && (
        <div className="mt-4 space-y-2">
          {hargaUBS && (
            <p>
              💰 Harga UBS: <strong>Rp {hargaUBS.toLocaleString("id-ID")}</strong>
            </p>
          )}
          {hargaAntam && (
            <p>
              💰 Harga Antam: <strong>Rp {hargaAntam.toLocaleString("id-ID")}</strong>
            </p>
          )}
          <p>
            💼 Total Tabungan: <strong>Rp {totalTabungan.toLocaleString("id-ID")}</strong>
          </p>
          <p>
            🪙 Total Emas Dibeli: <strong>{pembelianLog.length} gram</strong>
          </p>

          {bisaBeliUBS && (
            <p className="text-green-600 font-semibold">
              ✅ Tabungan cukup untuk beli 1 gram emas UBS
            </p>
          )}
          {bisaBeliAntam && (
            <p className="text-green-600 font-semibold">
              ✅ Tabungan cukup untuk beli 1 gram emas Antam
            </p>
          )}
          {!bisaBeliUBS && !bisaBeliAntam && (
            <p className="text-red-600">
              ❗ Tabungan belum cukup untuk beli 1 gram emas
            </p>
          )}
        </div>
      )}

      {/* Form pembelian */}
      {(hargaUBS && hargaAntam) && (
        <BeliEmasForm
          hargaUBS={hargaUBS}
          hargaAntam={hargaAntam}
          totalTabungan={totalTabungan}
          setTotalTabungan={setTotalTabungan}
          onPembelian={handlePembelian}
        />
      )}

      {/* Riwayat pembelian */}
      {pembelianLog.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h3 className="font-semibold text-lg mb-2">📜 Riwayat Pembelian</h3>
          <ul className="space-y-2">
            {pembelianLog.map((item) => (
              <li key={item.id} className="flex justify-between items-center text-sm border-b pb-1">
                <div>
                  {item.tanggal} - {item.brand} - Rp {item.harga.toLocaleString("id-ID")}
                </div>
                <div className="space-x-2">
                  <select
                    value={item.brand}
                    onChange={(e) => handleEdit(item.id, e.target.value)}
                    className="border rounded px-1 py-0.5 text-sm"
                  >
                    <option value="Antam">Antam</option>
                    <option value="UBS">UBS</option>
                  </select>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-500 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default HargaEmasChart;
