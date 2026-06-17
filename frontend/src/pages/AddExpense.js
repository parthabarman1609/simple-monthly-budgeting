import { useState } from "react";
import { apiPost } from "../api/client";

export default function AddExpense() {
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState("");
  const [groupId, setGroupId] = useState("");

  const handleAdd = async () => {
    const res = await apiPost("/expenses", {
      amount: parseFloat(amount),
      payer_id: payerId,
      group_id: groupId
    });

    alert("Expense added");
  };

  return (
    <div>
      <h2>Add Expense</h2>

      <input placeholder="Amount" onChange={(e) => setAmount(e.target.value)} />
      <input placeholder="Payer ID" onChange={(e) => setPayerId(e.target.value)} />
      <input placeholder="Group ID" onChange={(e) => setGroupId(e.target.value)} />

      <button onClick={handleAdd}>Add</button>
    </div>
  );
}