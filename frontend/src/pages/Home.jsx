import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto mt-16 px-5 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-inkfaint mb-3">NSUT · foundEX desk</p>
      <h1 className="font-display font-700 text-4xl text-ink leading-tight mb-4">
        Lost something on campus?<br />Someone may have already turned it in.
      </h1>
              
      <p className="font-body text-inkfaint mb-8">
        Report it, and we'll score it against every found item on the board — category, place, and
        description — and ping you the moment a strong match shows up.
      </p>
      <div className="flex justify-center gap-3">
        <Link to={user ? "/report/lost" : "/register"}
          className="bg-mustard text-ink px-5 py-2.5 rounded-sm font-body font-medium hover:bg-mustardDark hover:text-paper transition-colors">
          I lost something
        </Link>
        <Link to={user ? "/report/found" : "/register"}
          className="bg-teal text-paper px-5 py-2.5 rounded-sm font-body font-medium hover:bg-tealDark transition-colors">
          I found something
        </Link>
      </div>
    </div>
  );
}
