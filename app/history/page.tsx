"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const router = useRouter(); 
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from("daily_register")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.log(error);
    } else {
      setRecords(data || []);
    }

    setLoading(false);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
  <main className="min-h-screen p-10 bg-white text-black">
    <h1 className="text-4xl font-bold mb-10 text-center">
      Sales History
    </h1>

    <div className="overflow-x-auto">
      <table className="w-full border border-gray-400">
        <thead>
          <tr className="bg-black text-white">
            <th className="p-4 border">Date</th>
            <th className="p-4 border">Fuel Total</th>
            <th className="p-4 border">Oil Total</th>
            <th className="p-4 border">Difference</th>
            <th className="p-4 border">Status</th>
          </tr>
        </thead>
        <tbody>
  {records.map((record) => (
    <tr key={record.id} className="hover:bg-gray-100 cursor-pointer"
        onClick={() => router.push(`/history/${record.date}`)}
    >
      <td className="border p-3">{record.date}</td>
      <td className="border p-3">₹ {Number(record.fuel_total).toFixed(2)}</td>
      <td className="border p-3">₹ {Number(record.oil_total).toFixed(2)}</td>
      <td className="border p-3">₹ {Number(record.difference).toFixed(2)}</td>
      <td className="border p-3">{record.status}</td>
    </tr>
  ))}
</tbody>
      </table>
    </div>
  </main>
);
}