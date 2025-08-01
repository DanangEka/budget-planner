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

function HargaEmasChart({ totalTabungan }) {
  const [data, setData] = useState([]);
  const [hargaUBS, setHargaUBS] = useState(null);
  const [hargaAntam, setHargaAntam] = useState(null);

  useEffect(() => {
    const sheetUrl = "https://opensheet.elk.sh/1Kj0THHCsfEnzOeQnQL8A0RdhLHPP7sf5aq17msSzmeM/Harga1Gram";

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

  const bisaBeliUBS = typeof hargaUBS === "number" && totalTabungan >= hargaUBS;
  const bisaBeliAntam = typeof hargaAntam === "number" && totalTabungan >= hargaAntam;

  return (
    <div className="bg-white rounded-lg shadow p-4 my-6">
      <h2 className="text-xl font-bold mb-2">📊 Harga Emas 1 Gram per Hari</h2>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="tanggal" />
            <YAxis tickFormatter={(v) => "Rp " + v.toLocaleString("id-ID")} />
            <Tooltip formatter={(v) => "Rp " + v.toLocaleString("id-ID")} />
            <CartesianGrid strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="UBS"
              stroke="#10b981"
              strokeWidth={2}
              name="UBS"
            />
            <Line
              type="monotone"
              dataKey="Antam"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Antam"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {(typeof hargaUBS === "number" || typeof hargaAntam === "number") && (
        <div className="mt-4 space-y-2">
          {typeof hargaUBS === "number" && (
            <p>💰 Harga UBS: <strong>Rp {hargaUBS.toLocaleString("id-ID")}</strong></p>
          )}
          {typeof hargaAntam === "number" && (
            <p>💰 Harga Antam: <strong>Rp {hargaAntam.toLocaleString("id-ID")}</strong></p>
          )}
          {typeof totalTabungan === "number" && (
            <p>💼 Total Tabungan: <strong>Rp {totalTabungan.toLocaleString("id-ID")}</strong></p>
          )}

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
    </div>
  );
}

export default HargaEmasChart;
