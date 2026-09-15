import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import MatchTicket from "../components/MatchTicket.jsx";

function ClaimForm({ foundItem, lostItemId, matchScore, onDone }) {
  const { token } = useAuth();
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.submitClaim({ foundItemId: foundItem._id, lostItemId, answer, matchScore }, token);
      setSent(true);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return <p className="font-body text-sm text-teal mt-2">Claim sent — the finder will review your answer.</p>;
  }

  return (
    <form onSubmit={submit} className="mt-3 stub-card p-4 bg-paper">
      <p className="font-mono text-[11px] uppercase tracking-widest text-inkfaint mb-1">Ownership check</p>
      <p className="font-body text-sm text-ink mb-2">{foundItem.verificationQuestion}</p>
      <input required value={answer} onChange={(e) => setAnswer(e.target.value)}
        placeholder="Your answer"
        className="w-full border border-line rounded-sm px-3 py-2 bg-card font-body text-ink" />
      {error && <p className="text-stamp text-sm font-body mt-1">{error}</p>}
      <button disabled={loading}
        className="mt-2 bg-ink text-paper px-3 py-1.5 rounded-sm text-sm font-body hover:bg-tealDark transition-colors disabled:opacity-60">
        {loading ? "Sending…" : "Submit claim"}
      </button>
    </form>
  );
}

function ClaimsReview({ itemId }) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.claimsForItem(itemId, token).then(setData).catch((e) => setError(e.message));
  }, [itemId, token]);

  async function decide(id, decision) {
    await api.decideClaim(id, decision, token);
    const refreshed = await api.claimsForItem(itemId, token);
    setData(refreshed);
  }

  if (error) return null;
  if (!data || data.claims.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="font-display font-700 text-lg text-ink mb-3">Claims on this item</h2>
      <p className="font-body text-xs text-inkfaint mb-3">Question asked: “{data.verificationQuestion}”</p>
      <div className="space-y-3">
        {data.claims.map((c) => (
          <div key={c._id} className="stub-card p-4">
            <p className="font-body text-sm text-ink"><span className="font-medium">{c.claimant.name}</span> answered:</p>
            <p className="font-body text-sm text-ink italic mt-1">“{c.answer}”</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-inkfaint mt-2">Status: {c.status}</p>
            {c.status === "pending" && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => decide(c._id, "approved")}
                  className="text-xs font-mono uppercase tracking-widest px-2 py-1 rounded-sm bg-teal/20 text-tealDark hover:bg-teal/30">
                  Approve
                </button>
                <button onClick={() => decide(c._id, "rejected")}
                  className="text-xs font-mono uppercase tracking-widest px-2 py-1 rounded-sm bg-stamp/10 text-stamp hover:bg-stamp/20">
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ItemDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [claimingId, setClaimingId] = useState(null);

  useEffect(() => {
    api.getItem(id, token).then(setData).catch((e) => setError(e.message));
  }, [id, token]);

  if (error) return <p className="max-w-2xl mx-auto mt-10 px-5 font-body text-stamp">{error}</p>;
  if (!data) return <p className="max-w-2xl mx-auto mt-10 px-5 font-body text-inkfaint">Loading…</p>;

  const { item, matches } = data;
  const isLost = item.type === "lost";
  const isOwnFoundItem = !isLost && item.reporter?._id === user?.id;

  return (
    <div className="max-w-2xl mx-auto mt-10 px-5 pb-16">
      <span className={`inline-block font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm mb-3 ${isLost ? "bg-mustard/20 text-mustardDark" : "bg-teal/20 text-tealDark"}`}>
        {isLost ? "Lost" : "Found"} · {item.category} · {item.status}
      </span>
      {item.photoUrl && (
        <img src={item.photoUrl} alt="" className="w-full max-w-xs rounded-sm border border-line mb-4" />
      )}
      <h1 className="font-display font-700 text-2xl text-ink mb-1">{item.description}</h1>
      <p className="font-mono text-xs text-inkfaint mb-6">
        {item.location} · {new Date(item.date).toLocaleDateString()} · reported by {item.reporter?.name}
      </p>

      <h2 className="font-display font-700 text-lg text-ink mb-3">
        {isLost ? "Possible matches among found items" : "Possible matches among lost reports"}
      </h2>

      {matches.length === 0 ? (
        <div className="stub-card p-6 text-center">
          <p className="font-body text-sm text-inkfaint">No candidates above the match threshold yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((m) => (
            <div key={m.item._id}>
              <MatchTicket
                item={m.item}
                score={m.score}
                breakdown={m.breakdown}
                onClaim={
                  isLost && m.item.verificationQuestion
                    ? () => setClaimingId(claimingId === m.item._id ? null : m.item._id)
                    : null
                }
              />
              {claimingId === m.item._id && (
                <ClaimForm foundItem={m.item} lostItemId={item._id} matchScore={m.score} onDone={() => setClaimingId(null)} />
              )}
            </div>
          ))}
        </div>
      )}

      {isOwnFoundItem && <ClaimsReview itemId={item._id} />}
    </div>
  );
}
