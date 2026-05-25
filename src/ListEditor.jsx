import React, { useState } from "react";

export default function ListEditor({ txns, onAdd, onDelete, monthName, fmt, categories, getCatLabel }) {
  const [form, setForm] = useState({ amount: "", category: categories[0].value, note: "" });
  const [error, setError] = useState("");

  const handleAdd = () => {
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    onAdd({ ...form, amount: amt });
    setForm({ amount: "", category: categories[0].value, note: "" });
    setError("");
  };

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{monthName}</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
          style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #E2E8F0" }}
        />
        <select
          value={form.category}
          onChange={e => setForm({ ...form, category: e.target.value })}
          style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #E2E8F0" }}
        >
          {categories.map(c => (
            <option key={c.value} value={c.value}>{getCatLabel(c.value)}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Note"
          value={form.note}
          onChange={e => setForm({ ...form, note: e.target.value })}
          style={{ flex: 2, padding: 8, borderRadius: 8, border: "1px solid #E2E8F0" }}
        />
        <button onClick={handleAdd} style={{ padding: "8px 14px", borderRadius: 8, background: "#4F46E5", color: "#fff", border: "none" }}>Add</button>
      </div>
      {error && <div style={{ color: "#EF4444", marginBottom: 10 }}>{error}</div>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {txns.map((tx, idx) => (
          <li key={tx.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ flex: 1 }}>{fmt(tx.amount)} - {getCatLabel(tx.category)} - {tx.note}</span>
            <button onClick={() => onDelete(tx.id)} style={{ color: "#EF4444", border: "none", background: "none", cursor: "pointer" }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
