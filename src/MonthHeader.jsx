import React from "react";

export default function MonthHeader({ monthKey, monthNames, year, style }) {
  if (!monthKey) return null;
  const [y, m] = monthKey.split("-");
  const monthIdx = parseInt(m, 10) - 1;
  const monthName = monthNames[monthIdx];
  return (
    <div style={{ padding: "18px 0 8px", textAlign: "center", ...style }}>
      <span style={{ fontSize: 18, fontWeight: 600, color: "#4F46E5", letterSpacing: "-1px" }}>
        {monthName} {y}
      </span>
    </div>
  );
}
