import { useState, useEffect } from "react";
import { apiPost } from "../api/client";

export default function AddExpense() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState("");
  
  // Split Engine State
  const [myShare, setMyShare] = useState("");
  const [activeFraction, setActiveFraction] = useState(null);

  // Auto-calculate fractions when amount or fraction button changes
  useEffect(() => {
    if (amount && activeFraction) {
      const calculated = (parseFloat(amount) * activeFraction).toFixed(2);
      setMyShare(calculated);
    }
  }, [amount, activeFraction]);

  const handleAdd = async () => {
    // Hardcoded UUID to match the FastAPI default test user
    const currentUserId = "04a26012-7d92-4daa-823f-198b2390192d";

    const res = await apiPost("/expenses", {
      amount: parseFloat(amount),
      description,
      category,
      date,
      splits: [
        {
          user_id: currentUserId,
          amount: parseFloat(myShare) || parseFloat(amount),
        },
      ],
    });

    if (res?.expense_id) {
      alert("Expense added successfully!");
      setAmount(""); setDescription(""); setMyShare(""); setActiveFraction(null);
    } else {
      alert(`Failed: ${res?.error || "Unknown error"}`);
    }
  };

  const fractions = [
    { label: "1/2", value: 1/2 },
    { label: "1/3", value: 1/3 },
    { label: "1/4", value: 1/4 },
    { label: "1/5", value: 1/5 },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-aa-gray-border p-6 mb-6 animate-fade-in">
      <h2 className="text-xl font-bold text-aa-blue mb-6">New Expense</h2>

      {/* Amount Input */}
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">$</span>
        <input
          type="number"
          className="w-full bg-gray-50 border border-gray-200 text-3xl text-gray-800 rounded-xl py-4 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-aa-blue focus:border-transparent transition-all"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          className="col-span-2 w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-aa-blue"
          placeholder="Description (e.g. Dinner at Joe's)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <select
          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-aa-blue"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>Food</option>
          <option>Transport</option>
          <option>Utilities</option>
          <option>Entertainment</option>
        </select>
        <input
          type="date"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-aa-blue"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <hr className="my-6 border-gray-100" />

      {/* Split Engine UI */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Quick Split (Your Share)</label>
        <div className="flex gap-2 mb-4">
          {fractions.map((frac) => (
            <button
              key={frac.label}
              onClick={() => setActiveFraction(frac.value)}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFraction === frac.value
                  ? "bg-aa-blue text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {frac.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
          <span className="text-gray-600 font-medium">You Owe:</span>
          <div className="flex items-center">
            <span className="text-gray-400 mr-1">$</span>
            <input
              type="number"
              className="w-24 bg-transparent text-right text-lg font-bold text-aa-red focus:outline-none"
              placeholder="0.00"
              value={myShare}
              onChange={(e) => {
                setMyShare(e.target.value);
                setActiveFraction(null); // Clear fraction if manually edited
              }}
            />
          </div>
        </div>
      </div>

      <button 
        onClick={handleAdd}
        className="w-full bg-aa-blue hover:bg-[#003665] text-white text-lg font-semibold py-4 rounded-xl shadow-lg shadow-aa-blue/30 transition-transform active:scale-95"
      >
        Save Expense
      </button>
    </div>
  );
}