import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

function StatCard({ label, value, accent }) {
  return (
    <div className="stub-card p-4 text-center">
      <p className={`font-display font-700 text-3xl ${accent}`}>{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-inkfaint mt-1">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    api.adminOverview(token).then(setOverview);
  }, [token]);

  useEffect(() => {
    if (tab === "items") api.adminItems(token).then((d) => setItems(d.items));
  }, [tab, token]);

  return (
    <div className="max-w-3xl mx-auto mt-10 px-5 pb-16">
      <span className="inline-block font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm mb-3 bg-stamp/10 text-stamp">
        Security desk
      </span>
      <h1 className="font-display font-700 text-2xl text-ink mb-6">Campus overview</h1>

      {overview && (
        <div className="grid grid-cols-4 gap-3 mb-8">
          <StatCard label="Active lost" value={overview.activeLost} accent="text-mustardDark" />
          <StatCard label="Active found" value={overview.activeFound} accent="text-tealDark" />
          <StatCard label="Resolved" value={overview.resolved} accent="text-ink" />
          <StatCard label="Pending claims" value={overview.pendingClaims} accent="text-stamp" />
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("overview")}
          className={`font-mono text-xs uppercase tracking-widest px-3 py-1.5 rounded-sm border ${tab === "overview" ? "border-ink text-ink" : "border-line text-inkfaint"}`}>
          Overview
        </button>
        <button onClick={() => setTab("items")}
          className={`font-mono text-xs uppercase tracking-widest px-3 py-1.5 rounded-sm border ${tab === "items" ? "border-ink text-ink" : "border-line text-inkfaint"}`}>
          All reports
        </button>
      </div>

      {tab === "items" && (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item._id} className="stub-card p-3 flex items-center justify-between">
              <div>
                <span className={`font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm mr-2 ${item.type === "lost" ? "bg-mustard/20 text-mustardDark" : "bg-teal/20 text-tealDark"}`}>
                  {item.type}
                </span>
                <span className="font-body text-sm text-ink">{item.description}</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-inkfaint">{item.status}</span>
            </div>
          ))}
          {items.length === 0 && <p className="font-body text-sm text-inkfaint">No reports yet.</p>}
        </div>
      )}

      {tab === "overview" && (
        <p className="font-body text-sm text-inkfaint">
          This is the view the security office would use to keep an eye on volume and pending claims,
          without needing to check the physical desk.
        </p>
      )}
    </div>
  );
}
