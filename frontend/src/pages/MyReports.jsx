import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

const STATUS_STYLES = {
  active: "bg-mustard/20 text-mustardDark",
  matched: "bg-teal/20 text-tealDark",
  resolved: "bg-ink/10 text-ink",
  closed: "bg-line text-inkfaint",
};

export default function MyReports() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.myItems(token).then((d) => setItems(d.items)).finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="max-w-2xl mx-auto mt-10 px-5 pb-16">
      <h1 className="font-display font-700 text-2xl text-ink mb-6">My reports</h1>

      {loading ? (
        <p className="font-body text-sm text-inkfaint">Loading…</p>
      ) : items.length === 0 ? (
        <div className="stub-card p-6 text-center">
          <p className="font-body text-sm text-inkfaint">You haven't reported anything yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link key={item._id} to={`/item/${item._id}`} className="stub-card flex items-center justify-between p-4 hover:shadow-card transition-shadow">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${item.type === "lost" ? "bg-mustard/20 text-mustardDark" : "bg-teal/20 text-tealDark"}`}>
                    {item.type}
                  </span>
                  <span className={`font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${STATUS_STYLES[item.status]}`}>
                    {item.status}
                  </span>
                </div>
                <p className="font-body text-ink text-[15px]">{item.description}</p>
              </div>
              <span className="font-body text-sm text-teal">View →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
