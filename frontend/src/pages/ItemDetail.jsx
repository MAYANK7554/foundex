import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import MatchTicket from "../components/MatchTicket.jsx";

function ClaimForm({ foundItem, lostItemId, matchScore }) {
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <p className="font-body text-sm text-teal mt-2">
        Claim sent — the finder will review your answer. Track it under My reports → My claims.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 stub-card p-4 bg-paper">
      <p className="font-mono text-[11px] uppercase tracking-widest text-inkfaint mb-1">Ownership check</p>
      <p className="font-body text-sm text-ink mb-2">{foundItem.verificationQuestion}</p>
      <input required maxLength={500} value={answer} onChange={(e) => setAnswer(e.target.value)}
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

const CLAIM_STATUS_STYLES = {
  pending: "text-mustardDark",
  approved: "text-tealDark",
  rejected: "text-stamp",
};

function ClaimsReview({ itemId, onChanged }) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(
    () => api.claimsForItem(itemId, token).then(setData).catch((e) => setError(e.message)),
    [itemId, token]
  );

  useEffect(() => { load(); }, [load]);

  async function decide(id, decision) {
    if (decision === "approved" && !window.confirm("Approve this claim? The item will be marked returned and any other claims rejected.")) return;
    setError("");
    setBusyId(id);
    try {
      await api.decideClaim(id, decision, token);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!data) return error ? <p className="mt-8 text-stamp text-sm font-body">{error}</p> : null;

  return (
    <div className="mt-8">
      <h2 className="font-display font-700 text-lg text-ink mb-3">Claims on this item</h2>
      {data.claims.length === 0 ? (
        <div className="stub-card p-6 text-center">
          <p className="font-body text-sm text-inkfaint">No one has claimed this yet.</p>
        </div>
      ) : (
        <>
          <div className="stub-card p-3 mb-3 bg-paper">
            <p className="font-body text-xs text-inkfaint">Question asked: “{data.verificationQuestion}”</p>
            {data.verificationAnswer && (
              <p className="font-body text-xs text-ink mt-1">
                Your expected answer: <span className="font-medium">“{data.verificationAnswer}”</span>
              </p>
            )}
          </div>
          {error && <p className="text-stamp text-sm font-body mb-2">{error}</p>}
          <div className="space-y-3">
            {data.claims.map((c) => (
              <div key={c._id} className="stub-card p-4">
                <p className="font-body text-sm text-ink"><span className="font-medium">{c.claimant?.name}</span> answered:</p>
                <p className="font-body text-sm text-ink italic mt-1">“{c.answer}”</p>
                <p className={`font-mono text-[10px] uppercase tracking-widest mt-2 ${CLAIM_STATUS_STYLES[c.status] || "text-inkfaint"}`}>
                  Status: {c.status}
                  {c.status === "approved" && c.claimant?.email && (
                    <span className="normal-case tracking-normal font-body text-xs text-ink ml-2">
                      — contact them at <a className="underline" href={`mailto:${c.claimant.email}`}>{c.claimant.email}</a>
                    </span>
                  )}
                </p>
                {c.status === "pending" && (
                  <div className="flex gap-2 mt-2">
                    <button disabled={busyId === c._id} onClick={() => decide(c._id, "approved")}
                      className="text-xs font-mono uppercase tracking-widest px-2 py-1 rounded-sm bg-teal/20 text-tealDark hover:bg-teal/30 disabled:opacity-60">
                      Approve
                    </button>
                    <button disabled={busyId === c._id} onClick={() => decide(c._id, "rejected")}
                      className="text-xs font-mono uppercase tracking-widest px-2 py-1 rounded-sm bg-stamp/10 text-stamp hover:bg-stamp/20 disabled:opacity-60">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OwnerControls({ item, onChanged }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isLost = item.type === "lost";

  async function run(fn) {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const setStatus = (status, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    run(async () => { await api.setItemStatus(item._id, status, token); onChanged(); });
  };

  const remove = () => {
    if (!window.confirm("Delete this report permanently? This can't be undone.")) return;
    run(async () => {
      await api.deleteItem(item._id, token);
      navigate("/mine", { replace: true });
    });
  };

  const btn = "text-xs font-mono uppercase tracking-widest px-2.5 py-1.5 rounded-sm border disabled:opacity-60";

  return (
    <div className="stub-card p-4 mb-8 bg-paper">
      <p className="font-mono text-[11px] uppercase tracking-widest text-inkfaint mb-2">
        Your report
      </p>
      <div className="flex flex-wrap gap-2">
        {item.status === "active" ? (
          <>
            <button disabled={busy} className={`${btn} border-tealDark text-tealDark hover:bg-teal/10`}
              onClick={() => setStatus("resolved", isLost ? null : "Mark as returned? Any pending claims will be rejected.")}>
              {isLost ? "I got it back" : "Returned to owner"}
            </button>
            <button disabled={busy} className={`${btn} border-line text-inkfaint hover:text-ink`}
              onClick={() => setStatus("closed", isLost ? null : "Close this report? Any pending claims will be rejected.")}>
              Close report
            </button>
          </>
        ) : (
          <button disabled={busy} className={`${btn} border-line text-ink hover:bg-card`} onClick={() => setStatus("active")}>
            Reopen
          </button>
        )}
        <button disabled={busy} className={`${btn} border-stamp/40 text-stamp hover:bg-stamp/10`} onClick={remove}>
          Delete
        </button>
      </div>
      {error && <p className="text-stamp text-sm font-body mt-2">{error}</p>}
    </div>
  );
}

export default function ItemDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [claimingId, setClaimingId] = useState(null);

  const load = useCallback(
    () => api.getItem(id, token).then(setData).catch((e) => setError(e.message)),
    [id, token]
  );

  // Reset when navigating from one item to another (match cards link here).
  useEffect(() => {
    setData(null);
    setError("");
    setClaimingId(null);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (error) return <p className="max-w-2xl mx-auto mt-10 px-5 font-body text-stamp">{error}</p>;
  if (!data) return <p className="max-w-2xl mx-auto mt-10 px-5 font-body text-inkfaint">Loading…</p>;

  const { item, matches } = data;
  const isLost = item.type === "lost";
  const isMine = item.reporter?._id === user?.id;
  const isOwnLostReport = isLost && isMine;
  const canReviewClaims = !isLost && isMine;
  const isActive = item.status === "active";

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

      {isMine && <OwnerControls item={item} onChanged={load} />}

      {isActive ? (
        <>
          <h2 className="font-display font-700 text-lg text-ink mb-3">
            {isLost ? "Possible matches among found items" : "Possible matches among lost reports"}
          </h2>
          {isOwnLostReport && (
            <p className="font-body text-xs text-inkfaint -mt-2 mb-4">
              If one of these found items is yours, start a claim and answer the finder's question to prove it.
            </p>
          )}

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
                      isOwnLostReport && m.item.verificationQuestion
                        ? () => setClaimingId(claimingId === m.item._id ? null : m.item._id)
                        : null
                    }
                  />
                  {claimingId === m.item._id && (
                    <ClaimForm foundItem={m.item} lostItemId={item._id} matchScore={m.score} />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="stub-card p-6 text-center">
          <p className="font-body text-sm text-inkfaint">
            This report is {item.status}, so it's no longer being matched.
          </p>
        </div>
      )}

      {canReviewClaims && <ClaimsReview itemId={item._id} onChanged={load} />}
    </div>
  );
}
