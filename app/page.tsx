"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [rates, setRates] = useState({
    MS: "",
    HSD: "",
    Speed: "",
  });

  const sections = {
  MS: [
    "P1-N3", "P1-N4",
    "P2-N3", "P2-N4",
    "P3-N5", "P3-N6"
  ],
  HSD: [
    "P1-N1", "P1-N2",
    "P2-N1", "P2-N2",
    "P3-N1", "P3-N2"
  ],
  Speed: [
    "P3-N3", "P3-N4"
  ],
};

  const allNozzles = Object.entries(sections).flatMap(([fuel, nozzles]) =>
    nozzles.map((id) => ({
      id,
      fuel,
      opening: "",
      closing: "",
      testing: "0",
    }))
  );

  const [data, setData] = useState(allNozzles);

  useEffect(() => {
  const fetchPreviousClosings = async () => {
    const { data: readings, error } = await supabase
      .from("nozzle_readings")
      .select("id, closing")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    if (readings && readings.length > 0) {
      const updatedData = allNozzles.map((item) => {
        const found = readings.find((r: any) => r.id === item.id);
        return found ? { ...item, opening: found.closing } : item;
      });

      setData(updatedData);
    }
  };

  fetchPreviousClosings();
}, []);

useEffect(() => {
  const fetchLatestRates = async () => {
    const { data, error } = await supabase
      .from("daily_register")
      .select("ms_rate, hsd_rate, speed_rate")
      .order("date", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setRates({
        MS: data[0].ms_rate ?? "",
        HSD: data[0].hsd_rate ?? "",
        Speed: data[0].speed_rate ?? "",
      });
    }
  };

  fetchLatestRates();
}, []);

  const [oilItems, setOilItems] = useState([
  { particular: "", quantity: "", amount: "" },
]);
const [receipts, setReceipts] = useState({
  density: "",
  cash: "",
  paytm: "",
  nightPaytm: "",
  credit: "",
  bpclCard: "",
  bossPhonepe: "",
});

const receiptLabels: Record<string, string> = {
  density: "Density Testing",
  cash: "Cash",
  paytm: "UPI (Day)",
  nightPaytm: "UPI (Night)",
  credit: "Credit Sales",
  bpclCard: "BPCL Fleet Card",
  bossPhonepe: "UPI (Owner Account)",
};


const [expenses, setExpenses] = useState([
  { particular: "", amount: "" },
]);

const [selectedDate, setSelectedDate] = useState(
  new Date().toISOString().split("T")[0]
);

  const handleChange = (
    index: number, 
    field: "opening" | "closing" | "testing", 
    value: string
  ) => {
    const updated = [...data];
    updated[index][field] = value;
    setData(updated);
  };

  const calculate = (item: any) => {
    const opening = parseFloat(item.opening || "0");
    const closing = parseFloat(item.closing || "0");
    const testing = parseFloat(item.testing || "0");

    const net = closing - opening - testing;
    if (isNaN(net) || net <= 0) return { net: 0, amount: 0 };
    const rate = Number(rates[item.fuel as keyof typeof rates]) || 0
    const amount = net * rate;
    return { net, amount };
  };

  const totals = { MS: 0, HSD: 0, Speed: 0 };

  data.forEach((item) => {
    const { amount } = calculate(item);
    totals[item.fuel as keyof typeof totals] += amount;
  });

  const grandTotal = totals.MS + totals.HSD + totals.Speed;

  const oilTotal = oilItems.reduce(
  (sum, item) => sum + parseFloat(item.amount || "0"),
  0
);

const expectedTotal = grandTotal + oilTotal;

const totalReceipts =
  Object.values(receipts).reduce(
    (sum, val) => sum + parseFloat(val || "0"),
    0
  );

const totalExpenses = expenses.reduce(
  (sum, exp) => sum + parseFloat(exp.amount || "0"),
    0
);

const totalReceived = totalReceipts + totalExpenses;

const difference = expectedTotal - totalReceived;

const saveDayData = async () => {
  const confirmSave = window.confirm(
    "Are you sure you want to close and save this day?"
  );

  if (!confirmSave) return;

  const roundedFuelTotal = Number(grandTotal.toFixed(2));
const roundedOilTotal = Number(oilTotal.toFixed(2));
const roundedExpectedTotal = Number(expectedTotal.toFixed(2));
const roundedTotalReceived = Number(totalReceived.toFixed(2));
const roundedDifference = Number(difference.toFixed(2));

  // Insert daily register summary
const { error: dailyError } = await supabase
  .from("daily_register")
  .insert([
    {
      date: selectedDate,
      fuel_total: roundedFuelTotal,
      oil_total: roundedOilTotal,
      expected_total: roundedExpectedTotal,
      total_received: roundedTotalReceived,
      difference: roundedDifference,
      ms_rate: rates.MS,
      hsd_rate: rates.HSD,
      speed_rate: rates.Speed,
      status:
        difference === 0
          ? "Balanced"
          : difference > 0
          ? "Excess"
          : "Shortage",
    },
  ]);

if (dailyError) {
  console.log("DAILY SAVE ERROR:", dailyError);
  alert(dailyError.message);
  return;
}

// Insert nozzle readings
const nozzleRows = data.map((item) => {
  const opening = parseFloat(item.opening || "0");
  const closing = parseFloat(item.closing || "0");
  const testing = parseFloat(item.testing || "0");

  const net = closing - opening - testing;

  const rate = Number(rates[item.fuel as keyof typeof rates] || 0);
  const amount = net * rate;

  return {
    date: selectedDate,
    nozzle_id: item.id,
    fuel_type: item.fuel,
    opening,
    closing,
    testing,
    net_litres: net,
    amount,
  };
});

const { error: nozzleError } = await supabase
  .from("nozzle_readings")
  .insert(nozzleRows);

if (nozzleError) {
  alert("Error saving nozzle data");
  console.log(nozzleError);
  return;
}

// Insert oil sales
const oilRows = oilItems
  .filter(item => item.particular && item.amount)
  .map(item => ({
    date: selectedDate,
    particular: item.particular,
    quantity: parseFloat(item.quantity || "0"),
    amount: parseFloat(item.amount || "0"),
  }));

if (oilRows.length > 0) {
  const { error: oilError } = await supabase
    .from("oil_sales")
    .insert(oilRows);

  if (oilError) {
    alert("Error saving oil sales");
    console.log(oilError);
    return;
  }
}

// Insert receipts
const receiptRows = Object.entries(receipts)
  .filter(([_, value]) => value && parseFloat(value) !== 0)
  .map(([type, value]) => ({
    date: selectedDate,
    type,
    amount: parseFloat(value || "0"),
  }));

if (receiptRows.length > 0) {
  const { error: receiptError } = await supabase
    .from("receipts")
    .insert(receiptRows);

  if (receiptError) {
    alert("Error saving receipts");
    console.log(receiptError);
    return;
  }
}

// Insert expenses
const expenseRows = expenses
  .filter(item => item.particular && item.amount)
  .map(item => ({
    date: selectedDate,
    particular: item.particular,
    amount: parseFloat(item.amount || "0"),
  }));

if (expenseRows.length > 0) {
  const { error: expenseError } = await supabase
    .from("expenses")
    .insert(expenseRows);

  if (expenseError) {
    alert("Error saving expenses");
    console.log(expenseError);
    return;
  }
}

  // Save closing readings
  const closingData = data.map((item) => ({
    id: item.id,
    closing: item.closing,
  }));

  localStorage.setItem("previousClosings", JSON.stringify(closingData));

  // Immediately carry forward opening
  const updatedData = data.map((item) => ({
    ...item,
    opening: item.closing,  // carry forward
    closing: "",
    testing: "",
  }));

  setData(updatedData);

  // Reset oil, receipts, expenses
  setOilItems([{ particular: "", quantity: "", amount: "" }]);

  setReceipts({
    density: "",
    cash: "",
    paytm: "",
    nightPaytm: "",
    credit: "",
    bpclCard: "",
    bossPhonepe: "",
  });

  setExpenses([{ particular: "", amount: "" }]);

  alert("Day closed successfully. Ready for next day.");
};

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-black">
      <div className="bg-gradient-to-r from-black to-gray-800 text-white px-6 py-4 flex justify-between items-center shadow-md">
  <h1 className="text-lg font-semibold tracking-wide">
    SKS FUELS – Daily Register
  </h1>
  <span className="text-sm opacity-80">
    {selectedDate}
  </span>
</div>
  <div className="max-w-6xl mx-auto">
    <div className="mb-6 flex items-end justify-between gap-6 flex-wrap">

  {/* Date */}
  <div>
    <label className="block font-semibold mb-2">Date</label>
    <input
      type="date"
      value={selectedDate}
      onChange={(e) => setSelectedDate(e.target.value)}
      className="border p-2 rounded"
    />
  </div>

  {/* Rates */}
  <div className="flex gap-4">
    <div>
      <label className="block font-semibold mb-2">MS Rate</label>
      <input
        type="number"
        step="0.01"
        className="border p-2 rounded w-32"
        value={rates.MS ?? ""}
        onChange={(e) =>
          setRates({ ...rates, MS: e.target.value })
        }
      />
    </div> 

    <div>
      <label className="block font-semibold mb-2">HSD Rate</label>
      <input
        type="number"
        step="0.01"
        className="border p-2 rounded w-32"
        value={rates.HSD ?? ""}
        onChange={(e) =>
          setRates({ ...rates, HSD: e.target.value })
        }
      />
    </div>

    <div>
      <label className="block font-semibold mb-2">Speed Rate</label>
      <input
        type="number"
        step="0.01"
        className="border p-2 rounded w-32"
        value={rates.Speed ?? ""}
        onChange={(e) =>
          setRates({ ...rates, Speed: e.target.value })
        }
      />
    </div>
  </div>

  {/* Save Button */}
  <button
    onClick={saveDayData}
    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow-md font-semibold"
  >
    Save Day
  </button>

</div>
    {Object.entries(sections).map(([fuel, nozzles]) => (
      <div key={fuel} className="mb-12 bg-white p-8 rounded-2x1 shadow-1g border border-gray-100">

        <h2 className="text-2xl font-semibold mb-6 text-gray-800">
          {fuel === "MS" ? "MS (Petrol)" :
           fuel === "HSD" ? "HSD (Diesel)" :
           "Speed"}
        </h2>

        <div className="grid grid-cols-6 gap-4 text-sm font-bold uppercase tracking-wide border-b border-black pb-3">
          <div>Nozzle</div>
          <div>Opening</div>
          <div>Closing</div>
          <div>Testing</div>
          <div>Net Litres</div>
          <div>Amount</div>
        </div>

        {data
          .filter((item) => item.fuel === fuel)
          .map((item) => {
            const realIndex = data.findIndex((d) => d.id === item.id);
            const { net, amount } = calculate(item);

            return (
              <div
                key={item.id}
                className="grid grid-cols-6 gap-4 py-4 items-center border-b border-gray-200"
              >
                <div className="text-base font-medium">{item.id}</div>

                <input
                type="number"
                className="border p-2 rounded bg-gray-100"
                value={item.opening}
                onChange={(e)=>
                  handleChange(realIndex, "opening", e.target.value)
                }
                />

                <input
                  type="number"
                  className="border p-2 rounded"
                  value={item.closing}
                  onChange={(e) =>
                    handleChange(realIndex, "closing", e.target.value)
                  }
                />

                <input
                  type="number"
                  className="border p-2 rounded"
                  value={item.testing}
                  onChange={(e) =>
                    handleChange(realIndex, "testing", e.target.value)
                  }
                />

                <div>{net.toFixed(2)}</div>
                <div>₹ {amount.toFixed(2)}</div>
              </div>
            );
          })}

        <div className="mt-4 text-right font-bold text-lg">
          Total {fuel}: ₹ {totals[fuel as keyof typeof totals].toFixed(2)}
        </div>

      </div>
    ))}

    <div className="bg-green-100 p-6 rounded text-right text-2xl font-bold">
      Grand Total: ₹ {grandTotal.toFixed(2)}
    </div>

    {/* Oil Section */}
<div className="mt-10 bg-white p-6 rounded shadow">
  <h2 className="text-2xl font-semibold mb-6 text-gray-800">Oil Sales</h2>

  {oilItems.map((item, index) => (
    <div key={index} className="flex gap-4 mb-3">
      <input
        type="text"
        placeholder="Oil Particular"
        className="border p-1 rounded flex-1"
        value={item.particular}
        onChange={(e) => {
          const updated = [...oilItems];
          updated[index].particular = e.target.value;
          setOilItems(updated);
        }}
      />

      <input
        type="number"
        placeholder="Qty"
        className="border p-1 rounded w-24"
        value={item.quantity}
        onChange={(e) => {
          const updated = [...oilItems];
          updated[index].quantity = e.target.value;
          setOilItems(updated);
        }}
      />

      <input
        type="number"
        placeholder="Amount"
        className="border p-1 rounded w-40"
        value={item.amount}
        onChange={(e) => {
          const updated = [...oilItems];
          updated[index].amount = e.target.value;
          setOilItems(updated);
        }}
      />
    </div>
  ))}

  <button
    className="mt-2 bg-blue-500 text-white px-4 py-1 rounded"
    onClick={() =>
      setOilItems([...oilItems, { particular: "", quantity: "", amount: "" }])
    }
  >
    + Add Oil Item
  </button>

  <div className="mt-4 font-semibold">
    Oil Total: ₹ {oilTotal.toFixed(2)}
  </div>

  <div className="mt-2 font-semibold">
    Expected Total: ₹ {expectedTotal.toFixed(2)}
  </div>
</div>

{/* Receipts Section */}
<div className="mt-10 bg-white p-6 rounded shadow">
  <h2 className="text-2xl font-semibold mb-6 text-gray-800">Receipts</h2>

  {Object.entries(receipts).map(([key, value]) => (
    <div key={key} className="flex justify-between mb-3">
      <label>{receiptLabels[key]}</label>
      <input
        type="number"
        className="border p-1 rounded w-40"
        value={value}
        onChange={(e) =>
          setReceipts({ ...receipts, [key]: e.target.value })
        }
      />
    </div>
  ))}

  <div className="mt-4 font-semibold">
    Total Receipts: ₹ {totalReceipts.toFixed(2)}
  </div>
</div>

{/* Expenses Section */}
<div className="mt-10 bg-white p-6 rounded shadow">
  <h2 className="text-2xl font-semibold mb-6 text-gray-800">Expenses</h2>

  {expenses.map((exp, index) => (
    <div key={index} className="flex gap-4 mb-3">
      <input
        type="text"
        placeholder="Particular"
        className="border p-1 rounded flex-1"
        value={exp.particular}
        onChange={(e) => {
          const updated = [...expenses];
          updated[index].particular = e.target.value;
          setExpenses(updated);
        }}
      />

      <input
        type="number"
        placeholder="Amount"
        className="border p-1 rounded w-40"
        value={exp.amount}
        onChange={(e) => {
          const updated = [...expenses];
          updated[index].amount = e.target.value;
          setExpenses(updated);
        }}
      />
    </div>
  ))}

  <button
    className="mt-2 bg-blue-500 text-white px-4 py-1 rounded"
    onClick={() =>
      setExpenses([...expenses, { particular: "", amount: "" }])
    }
  >
    + Add Expense
  </button>

  <div className="mt-4 font-semibold">
    Total Expenses: ₹ {totalExpenses.toFixed(2)}
  </div>
</div>

{/* Final Tally */}
<div className="mt-10 p-6 bg-yellow-100 border border-yellow-200 rounded-xl shadow-sm">
  <h2 className="text-2xl font-semibold text-gray-800 mb-6">Final Tally</h2>

  <p>Expected Total: ₹ {expectedTotal.toFixed(2)}</p>
  <p>Total Received: ₹ {totalReceived.toFixed(2)}</p>

  <div
    className={`mt-4 text-xl font-bold ${
      difference === 0
        ? "text-green-600"
        : difference > 0
        ? "text-red-600"
        : "text-blue-600"
    }`}
  >
    {difference === 0
      ? "Balanced"
      : difference > 0
      ? `Shortage: ₹ ${difference.toFixed(2)}`
      : `Excess: ₹ ${Math.abs(difference).toFixed(2)}`}
  </div>
</div>

  </div>
</main>
  );
}