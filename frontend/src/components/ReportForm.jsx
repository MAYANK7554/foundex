import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import MatchTicket from "./MatchTicket.jsx";

export default function ReportForm({ type }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [meta, setMeta] = useState({ categories: [], locations: [] });
  const [form, setForm] = useState({
    category: "", description: "", location: "", date: "",
    verificationQuestion: "", verificationAnswer: "", photoUrl: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [photoProcessing, setPhotoProcessing] = useState(false);

  // Resize + compress the image in the browser before storing it, so a
  // 4000x3000 phone photo doesn't turn into a multi-MB database document.
  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setPhotoProcessing(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 800;
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setForm((f) => ({ ...f, photoUrl: dataUrl }));
        setPhotoProcessing(false);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setForm((f) => ({ ...f, photoUrl: "" }));
  }

  useEffect(() => {
    api.meta(token).then(setMeta).catch(() => {});
  }, [token]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.createItem({ type, ...form }, token);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const isLost = type === "lost";
  const borderDarkClass = isLost ? "border-mustardDark" : "border-tealDark";
  const tagBgClass = isLost ? "bg-mustard/20" : "bg-teal/20";
  const tagTextClass = isLost ? "text-mustardDark" : "text-tealDark";
  const hoverBtnClass = isLost ? "hover:bg-mustardDark" : "hover:bg-tealDark";

  if (result) {
    return (
      <div className="max-w-2xl mx-auto mt-12 px-5">
        <div className={`stub-card p-5 border-l-4 ${borderDarkClass}`}>
          <h2 className="font-display font-700 text-xl text-ink">Report posted.</h2>
          <p className="font-body text-sm text-inkfaint mt-1">
            {result.autoNotified
              ? "We found a strong match and emailed both sides already."
              : result.matches.length > 0
              ? "A few possible matches turned up below — take a look."
              : "No matches yet. We'll keep watching new reports for one."}
          </p>
        </div>

        {result.matches.length > 0 && (
          <div className="mt-6 space-y-4">
            {result.matches.map((m) => (
              <MatchTicket key={m.item._id} item={m.item} score={m.score} breakdown={m.breakdown} />
            ))}
          </div>
        )}

        <button
          onClick={() => navigate("/feed")}
          className="mt-6 bg-ink text-paper px-4 py-2 rounded-sm font-body hover:bg-tealDark transition-colors"
        >
          Go to matches feed
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-10 px-5 pb-16">
      <div className={`inline-block font-mono text-[11px] uppercase tracking-widest px-2 py-1 rounded-sm mb-3 ${tagBgClass} ${tagTextClass}`}>
        {type === "lost" ? "Report a lost item" : "Report a found item"}
      </div>
      <h1 className="font-display font-700 text-2xl text-ink mb-6">
        {type === "lost" ? "What did you lose?" : "What did you find?"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">Category</label>
          <select required value={form.category} onChange={update("category")}
            className="mt-1 w-full border border-line rounded-sm px-3 py-2 bg-card font-body text-ink">
            <option value="" disabled>Choose a category</option>
            {meta.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">
            Description
          </label>
          <textarea required maxLength={500} rows={3} value={form.description} onChange={update("description")}
            placeholder={type === "lost" ? "e.g. black leather wallet with a college ID inside" : "e.g. dark brown wallet, found near the canteen"}
            className="mt-1 w-full border border-line rounded-sm px-3 py-2 bg-card font-body text-ink" />
          <p className="font-body text-xs text-inkfaint mt-1">Specific details (color, brand, stickers) help the matcher a lot.</p>
        </div>

        <div>
          <label className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">
            Photo <span className="normal-case text-inkfaint/70">(optional)</span>
          </label>
          {form.photoUrl ? (
            <div className="mt-1 flex items-center gap-3">
              <img src={form.photoUrl} alt="Preview" className="w-24 h-24 object-cover rounded-sm border border-line" />
              <button type="button" onClick={removePhoto}
                className="font-body text-xs text-stamp hover:underline underline-offset-2">
                Remove photo
              </button>
            </div>
          ) : (
            <input type="file" accept="image/*" onChange={handlePhotoChange}
              className="mt-1 w-full border border-line rounded-sm px-3 py-2 bg-card font-body text-ink text-sm file:mr-3 file:border-0 file:bg-paper file:px-2 file:py-1 file:rounded-sm file:font-mono file:text-[11px] file:uppercase file:tracking-widest" />
          )}
          {photoProcessing && <p className="font-body text-xs text-inkfaint mt-1">Processing photo…</p>}
          <p className="font-body text-xs text-inkfaint mt-1">
            Shown to whoever's reviewing a match, for a visual double-check — not used in the matching score itself.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">
              {type === "lost" ? "Last seen" : "Found at"}
            </label>
            <select required value={form.location} onChange={update("location")}
              className="mt-1 w-full border border-line rounded-sm px-3 py-2 bg-card font-body text-ink">
              <option value="" disabled>Choose a location</option>
              {meta.locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest text-inkfaint">Date</label>
            <input type="date" required value={form.date} onChange={update("date")}
              max={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full border border-line rounded-sm px-3 py-2 bg-card font-body text-ink" />
          </div>
        </div>

        {type === "found" && (
          <div className="border-t border-line pt-4 mt-2">
            <p className="font-mono text-[11px] uppercase tracking-widest text-inkfaint mb-2">
              Ownership check
            </p>
            <p className="font-body text-xs text-inkfaint mb-3">
              Ask something only the real owner would know (a sticker, a name inside, what's saved in it).
              Claimants must answer this before you see their contact info.
            </p>
            <input required value={form.verificationQuestion} onChange={update("verificationQuestion")}
              placeholder="Question, e.g. 'What sticker is on the back?'"
              className="w-full border border-line rounded-sm px-3 py-2 bg-card font-body text-ink mb-2" />
            <input required value={form.verificationAnswer} onChange={update("verificationAnswer")}
              placeholder="Expected answer (only you and the desk can see this)"
              className="w-full border border-line rounded-sm px-3 py-2 bg-card font-body text-ink" />
          </div>
        )}

        {error && <p className="text-stamp text-sm font-body">{error}</p>}

        <button disabled={loading}
          className={`w-full bg-ink text-paper py-2.5 rounded-sm font-body font-medium ${hoverBtnClass} transition-colors disabled:opacity-60`}>
          {loading ? "Posting…" : `Post ${type} report`}
        </button>
      </form>
    </div>
  );
}
