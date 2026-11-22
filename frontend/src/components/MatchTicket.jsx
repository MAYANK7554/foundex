import React from "react";
import { Link } from "react-router-dom";

function scoreColor(score) {
  if (score >= 0.7) return "text-teal";
  if (score >= 0.5) return "text-mustardDark";
  return "text-inkfaint";
}

// A "claim ticket" -- the main body describes the candidate item, and a
// torn-off stub on the right shows the match % and its breakdown, like a
// raffle ticket. This is the page's signature element: item matching is
// literally the product, so the UI treats a match as a physical ticket
// you'd tear off a lost & found board.
export default function MatchTicket({ item, score, breakdown, onClaim }) {
  return (
    <div className="stub-card flex shadow-card overflow-hidden">
      {item.photoUrl && (
        <Link to={`/item/${item._id}`} className="shrink-0 m-4 mr-0" tabIndex={-1} aria-hidden="true">
          <img src={item.photoUrl} alt="" loading="lazy" className="w-20 h-20 object-cover rounded-sm border border-line hover:opacity-90" />
        </Link>
      )}
      <div className="flex-1 p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm bg-paper text-inkfaint">
            {item.category}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-inkfaint">
            {item.location}
          </span>
        </div>
        <Link to={`/item/${item._id}`} className="font-body text-ink text-[15px] leading-snug hover:text-tealDark hover:underline underline-offset-2">
          {item.description}
        </Link>
        <p className="font-mono text-[11px] text-inkfaint mt-2">
          reported by {item.reporter?.name || "a student"} · {new Date(item.date).toLocaleDateString()} ·{" "}
          <Link to={`/item/${item._id}`} className="text-teal hover:text-tealDark">view →</Link>
        </p>
        {onClaim && (
          <button
            onClick={onClaim}
            className="mt-3 text-sm font-body text-teal hover:text-tealDark underline underline-offset-2"
          >
            This found item might be mine — claim it
          </button>
        )}
      </div>

      <div className="stub-tear w-28 shrink-0 flex flex-col items-center justify-center px-2 py-4 bg-paper">
        <span className={`font-display font-700 text-2xl ${scoreColor(score)}`}>
          {Math.round(score * 100)}%
        </span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-inkfaint mb-2">match</span>
        {breakdown && (
          <div className="w-full font-mono text-[9px] text-inkfaint space-y-0.5">
            <div className="flex justify-between"><span>text</span><span>{Math.round(breakdown.text * 100)}%</span></div>
            <div className="flex justify-between"><span>place</span><span>{Math.round(breakdown.location * 100)}%</span></div>
            <div className="flex justify-between"><span>time</span><span>{Math.round(breakdown.time * 100)}%</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
