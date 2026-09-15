import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

function ItemRow({ item }) {
  const isLost = item.type === "lost";
  return (
    <Link
      to={`/item/${item._id}`}
      className="stub-card flex items-center justify-between p-4 hover:shadow-card transition-shadow gap-3"
    >
      {item.photoUrl && (
        <img src={item.photoUrl} alt="" className="w-14 h-14 object-cover rounded-sm border border-line shrink-0" />
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${isLost ? "bg-mustard/20 text-mustardDark" : "bg-teal/20 text-tealDark"}`}>
            {isLost ? "Lost" : "Found"}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-inkfaint">{item.category}</span>
        </div>
        <p className="font-body text-ink text-[15px]">{item.description}</p>
        <p className="font-mono text-[11px] text-inkfaint mt-1">{item.location} · {new Date(item.date).toLocaleDateString()}</p>
      </div>
      <span className="font-body text-sm text-teal">View →</span>
    </Link>
  );
}

export default function MatchesFeed() {
  const { token } = useAuth();
  const [tab, setTab] = useState("lost");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.listItems({ type: tab, status: "active" }, token)
      .then((d) => setItems(d.items))
      .finally(() => setLoading(false));
  }, [tab, token]);

  return (
    <div className="max-w-2xl mx-auto mt-10 px-5 pb-16">
      <h1 className="font-display font-700 text-2xl text-ink mb-1">Matches feed</h1>
      <p className="font-body text-sm text-inkfaint mb-6">
        Browse what's currently reported. Open one to see its scored matches on the other side.
      </p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("lost")}
          className={`font-mono text-xs uppercase tracking-widest px-3 py-1.5 rounded-sm border ${tab === "lost" ? "bg-mustard/20 border-mustardDark text-mustardDark" : "border-line text-inkfaint"}`}
        >
          Lost items
        </button>
        <button
          onClick={() => setTab("found")}
          className={`font-mono text-xs uppercase tracking-widest px-3 py-1.5 rounded-sm border ${tab === "found" ? "bg-teal/20 border-tealDark text-tealDark" : "border-line text-inkfaint"}`}
        >
          Found items
        </button>
      </div>

      {loading ? (
        <p className="font-body text-sm text-inkfaint">Loading…</p>
      ) : items.length === 0 ? (
        <div className="stub-card p-6 text-center">
          <p className="font-body text-sm text-inkfaint">Nothing active here right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => <ItemRow key={item._id} item={item} />)}
        </div>
      )}
    </div>
  );
}
