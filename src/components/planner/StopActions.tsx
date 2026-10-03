import { useState } from "react";
import { ThumbsUp, ThumbsDown, Shuffle } from "lucide-react";
import type { PlanStop } from "@/lib/planner-engine";
import { recordFeedback } from "@/lib/planner-learning";

/** Like / not for me / swap under each stop. Every tap teaches the planner. */
export function StopActions({
  stop,
  onSwap,
  children,
}: {
  stop: PlanStop;
  onSwap: () => void;
  children?: React.ReactNode;
}) {
  // The vote belongs to one place, so it resets by itself when the stop is swapped.
  const [vote, setVote] = useState<{ id: string; v: "like" | "dislike" } | null>(null);
  const liked = vote?.id === stop.location.id && vote.v === "like";

  function rate(v: "like" | "dislike") {
    setVote({ id: stop.location.id, v });
    void recordFeedback(v, stop.location);
    if (v === "dislike") onSwap();
  }

  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition";
  const idle = "border-border/70 text-muted-foreground hover:border-gold/40 hover:text-foreground";
  return (
    <div data-html2canvas-ignore="true" className="mt-3 flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        aria-pressed={liked}
        onClick={() => rate("like")}
        className={`${base} ${liked ? "border-gold bg-gold/10 text-foreground" : idle}`}
      >
        <ThumbsUp className="h-3.5 w-3.5" /> Like
      </button>
      <button type="button" onClick={() => rate("dislike")} className={`${base} ${idle}`}>
        <ThumbsDown className="h-3.5 w-3.5" /> Not for me
      </button>
      <button
        type="button"
        onClick={() => {
          void recordFeedback("swap_out", stop.location);
          onSwap();
        }}
        className={`${base} ${idle}`}
      >
        <Shuffle className="h-3.5 w-3.5" /> Swap
      </button>
      {children}
    </div>
  );
}
