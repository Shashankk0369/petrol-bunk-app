"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useParams, useRouter } from "next/navigation";

export default function DayDetails() {
  const [isEditing, setIsEditing] = useState(false);  
  const { date } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [nozzles, setNozzles] = useState<any[]>([]);
  const [oil, setOil] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    fetchDetails();
  }, []);

  const fetchDetails = async () => {
    // Nozzle data
    const { data: nozzleData } = await supabase
      .from("nozzle_readings")
      .select("*")
      .eq("date", date);

    // Fetch rates for that day
const { data: dayData, error: dayError } = await supabase
  .from("daily_register")
  .select("ms_rate, hsd_rate, speed_rate")
  .eq("date", params.date)
  .single();

if (dayError) {
  console.error(dayError);
}
const fuelPrice = {
  MS: dayData?.ms_rate || 0,
  HSD: dayData?.hsd_rate || 0,
  Speed: dayData?.speed_rate || 0,
};  

    // Oil data
    const { data: oilData } = await supabase
      .from("oil_sales")
      .select("*")
      .eq("date", date);

    // Receipts
    const { data: receiptData } = await supabase
      .from("receipts")
      .select("*")
      .eq("date", date);

    // Expenses
    const { data: expenseData } = await supabase
      .from("expenses")
      .select("*")
      .eq("date", date);

    setNozzles(nozzleData || []);
    setOil(oilData || []);
    setReceipts(receiptData || []);
    setExpenses(expenseData || []);
    setLoading(false);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  const totalFuel = nozzles.reduce(
  (sum: number, n: any) => sum + Number(n.amount || 0),
  0
);

const totalOil = oil.reduce(
  (sum: number, o: any) => sum + Number(o.amount || 0),
  0
);

const totalExpenses = expenses.reduce(
  (sum: number, e: any) => sum + Number(e.amount || 0),
  0
);

const totalReceipts = receipts.reduce(
  (sum: number, r: any) => sum + Number(r.amount || 0),
  0
);

const difference = totalReceipts - (totalFuel + totalOil);



const handleUpdate = async () => {
  for (const nozzle of nozzles) {
    const net = nozzle.closing - nozzle.opening - nozzle.testing;
    const amount = net * fuelPrice[nozzle.fuel_type];

    const { error } = await supabase
      .from("nozzle_readings")
      .update({
        opening: nozzle.opening,
        closing: nozzle.closing,
        testing: nozzle.testing,
        net_litres: net,
        amount: amount,
      })
      .eq("id", nozzle.id);

    if (error) {
      console.log(error);
      alert("Error updating nozzle data");
      return;
    }
  }

  alert("Day updated successfully!");
  setIsEditing(false);
};

  return (
    <main className="min-h-screen p-10 bg-white text-black">
      <div className="flex items-center justify-between mb-6">
  <h1 className="text-3xl font-bold">
    Details for {date}
  </h1>

  <div className="flex gap-3 print:hidden">
    {!isEditing ? (
  <button
    onClick={() => setIsEditing(true)}
    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
  >
    ✏️ Edit
  </button>
) : (
  <button
    onClick={handleUpdate}
    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
  >
    💾 Update Day
  </button>
)}

<button
  onClick={() => router.push("/history")}
  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
>
  ← Back
</button>

<button
  onClick={() => window.print()}
  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
>
  🖨 Print
</button>
</div>
</div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
  <div className="p-4 bg-gray-100 rounded shadow text-center">
    <p className="font-bold">Fuel Total</p>
    <p>₹ {totalFuel}</p>
  </div>

  <div className="p-4 bg-gray-100 rounded shadow text-center">
    <p className="font-bold">Oil Total</p>
    <p>₹ {totalOil}</p>
  </div>

  <div className="p-4 bg-gray-100 rounded shadow text-center">
    <p className="font-bold">Total Received</p>
    <p>₹ {totalReceipts}</p>
  </div>

  <div className="p-4 bg-gray-100 rounded shadow text-center">
    <p className="font-bold">Expenses</p>
    <p>₹ {totalExpenses}</p>
  </div>

  <div
    className={`p-4 rounded shadow text-center font-bold ${
      difference === 0
        ? "bg-green-200"
        : difference > 0
        ? "bg-blue-200"
        : "bg-red-200"
    }`}
  >
    <p>Status</p>
    <p>
      {difference === 0
        ? "Balanced"
        : difference > 0
        ? "Excess"
        : "Shortage"}
    </p>
  </div>
</div>

      <h2 className="text-xl font-bold mt-6 mb-4">Nozzle Readings</h2>

<table className="w-full border border-gray-400 mb-8">
  <thead>
    <tr className="bg-black text-white">
      <th className="p-3 border">Nozzle</th>
      <th className="p-3 border">Opening</th>
      <th className="p-3 border">Closing</th>
      <th className="p-3 border">Testing</th>
      <th className="p-3 border">Net Litres</th>
      <th className="p-3 border">Amount</th>
    </tr>
  </thead>
  <tbody>
    {nozzles.map((n, index) => (
  <tr key={n.id} className="text-center border">
    <td className="p-3 border">{n.nozzle_id}</td>

    <td className="p-3 border">
      {isEditing ? (
        <input
          type="number"
          value={n.opening}
          onChange={(e) => {
            const updated = [...nozzles];
            updated[index].opening = Number(e.target.value);
            setNozzles(updated);
          }}
          className="border p-1 w-24"
        />
      ) : (
        n.opening
      )}
    </td>

    <td className="p-3 border">
      {isEditing ? (
        <input
          type="number"
          value={n.closing}
          onChange={(e) => {
            const updated = [...nozzles];
            updated[index].closing = Number(e.target.value);
            setNozzles(updated);
          }}
          className="border p-1 w-24"
        />
      ) : (
        n.closing
      )}
    </td>

    <td className="p-3 border">
      {isEditing ? (
        <input
          type="number"
          value={n.testing}
          onChange={(e) => {
            const updated = [...nozzles];
            updated[index].testing = Number(e.target.value);
            setNozzles(updated);
          }}
          className="border p-1 w-24"
        />
      ) : (
        n.testing
      )}
    </td>

    <td className="p-3 border">
      {n.closing - n.opening - n.testing}
    </td>

    <td className="p-3 border">
      ₹ {n.amount}
    </td>
  </tr>
))}
  </tbody>
</table>

      <h2 className="text-xl font-bold mt-6 mb-4">Oil Sales</h2>

<table className="w-full border border-gray-400 mb-8">
  <thead>
    <tr className="bg-black text-white">
      <th className="p-3 border">Particular</th>
      <th className="p-3 border">Quantity</th>
      <th className="p-3 border">Amount</th>
    </tr>
  </thead>
  <tbody>
    {oil.map((item) => (
      <tr key={item.id} className="text-center border">
        <td className="p-3 border">{item.particular}</td>
        <td className="p-3 border">{item.quantity}</td>
        <td className="p-3 border">₹ {item.amount}</td>
      </tr>
    ))}
  </tbody>
</table>

      <h2 className="text-xl font-bold mt-6 mb-4">Receipts</h2>

<table className="w-full border border-gray-400 mb-8">
  <thead>
    <tr className="bg-black text-white">
      <th className="p-3 border">Type</th>
      <th className="p-3 border">Amount</th>
    </tr>
  </thead>
  <tbody>
  {receipts.map((item) => (
    <tr key={item.id} className="text-center border">
      <td className="p-3 border">{item.type}</td>
      <td className="p-3 border">₹ {item.amount}</td>
    </tr>
  ))}
</tbody>
</table>

      <h2 className="text-xl font-bold mt-6 mb-4">Expenses</h2>

<table className="w-full border border-gray-400 mb-8">
  <thead>
    <tr className="bg-black text-white">
      <th className="p-3 border">Particular</th>
      <th className="p-3 border">Amount</th>
    </tr>
  </thead>
  <tbody>
    {expenses.map((exp) => (
      <tr key={exp.id} className="text-center border">
        <td className="p-3 border">{exp.particular}</td>
        <td className="p-3 border">₹ {exp.amount}</td>
      </tr>
    ))}
  </tbody>
</table>
    </main>
  );
}