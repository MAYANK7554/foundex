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

const CLAIM_STYLES = {
  pending: "bg-mustard/20 text-mustardDark",
  approved: "bg-teal/20 text-tealDark",
  rejected: "bg-stamp/10 text-stamp",
};

const tag = "font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm";

function ClaimRow({ claim }) {
  const item = claim.foundItem;
  const finder = item?.reporter;
  return (
    <div className="stub-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className={`${tag} ${CLAIM_STYLES[claim.status]}`}>{claim.status}</span>
        {item && <span className={`${tag} text-inkfaint`}>{item.category}</span>}
      </div>
      <p className="font-body text-ink text-[15px]">
        {item ? item.description : "This found item has since been deleted."}
      </p>
      <p className="font-body text-xs text-inkfaint mt-1">You answered: “{claim.answer}”</p>
      {claim.status === "pending" && (
        <p className="font-body text-xs text-inkfaint mt-2">Waiting for {finder?.name || "the finder"} to review.</p>
      )}
      {claim.status === "approved" && finder && (
        <p className="font-body text-sm text-tealDark mt-2">
          Approved! Contact {finder.name}
          {finder.email && <> at <a className="underline" href={`mailto:${finder.email}`}>{finder.email}</a></>} to arrange pickup.
        </p>
      )}
      {claim.status === "rejected" && (
        <p className="font-body text-xs text-inkfaint mt-2">Not approved — keep an eye on the matches feed for other candidates.</p>
      )}
    </div>
  );
}

export default function MyReports() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Load independently so a failure in one section doesn't blank the other.
    Promise.allSettled([api.myItems(token), api.myClaims(token)]).then(([i, c]) => {
      if (i.status === "fulfilled") setItems(i.value.items);
      if (c.status === "fulfilled") setClaims(c.value.claims);
      const failed = [i, c].find((r) => r.status === "rejected");
      if (failed) setError(failed.reason.message);
      setLoading(false);
    });
  }, [token]);

  if (loading) return <p className="max-w-2xl mx-auto mt-10 px-5 font-body text-sm text-inkfaint">Loading…</p>;

  return (
    <div className="max-w-2xl mx-auto mt-10 px-5 pb-16">
      <h1 className="font-display font-700 text-2xl text-ink mb-6">My reports</h1>
      {error && <p className="text-stamp text-sm font-body mb-4">{error}</p>}

      {items.length === 0 ? (
        <div className="stub-card p-6 text-center">
          <p className="font-body text-sm text-inkfaint">You haven't reported anything yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link key={item._id} to={`/item/${item._id}`} className="stub-card flex items-center justify-between p-4 hover:shadow-card transition-shadow gap-3">
              {item.photoUrl && (
                <img src={item.photoUrl} alt="" loading="lazy" className="w-14 h-14 object-cover rounded-sm border border-line shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`${tag} ${item.type === "lost" ? "bg-mustard/20 text-mustardDark" : "bg-teal/20 text-tealDark"}`}>
                    {item.type}
                  </span>
                  <span className={`${tag} ${STATUS_STYLES[item.status]}`}>{item.status}</span>
                  {item.pendingClaims > 0 && (
                    <span className={`${tag} bg-stamp text-paper`}>
                      {item.pendingClaims} claim{item.pendingClaims === 1 ? "" : "s"} to review
                    </span>
                  )}
                </div>
                <p className="font-body text-ink text-[15px]">{item.description}</p>
              </div>
              <span className="font-body text-sm text-teal">View →</span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="font-display font-700 text-xl text-ink mt-10 mb-4">My claims</h2>
      {claims.length === 0 ? (
        <div className="stub-card p-6 text-center">
          <p className="font-body text-sm text-inkfaint">
            You haven't claimed anything. Open one of your lost reports to see found items that might be yours.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((c) => <ClaimRow key={c._id} claim={c} />)}
        </div>
      )}
    </div>
  );
}
