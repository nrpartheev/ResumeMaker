import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowUp } from "lucide-react";

export function ChangeBar({
  busy, onSubmit,
}: {
  busy?: boolean;
  onSubmit: (instruction: string) => void;
}) {
  const [v, setV] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [v]);

  function send() {
    const t = v.trim();
    if (!t || busy) return;
    onSubmit(t);
    setV("");
  }

  return (
    <div className="border-t border-border bg-card/60 p-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-background p-2 shadow-soft focus-within:ring-2 focus-within:ring-ring">
        <Sparkles className="ml-2 mb-2 h-4 w-4 shrink-0 text-accent" />
        <textarea
          ref={ref}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Ask AI to tweak the résumé… e.g. ‘shorten the summary, emphasize Python’"
          disabled={busy}
          className="max-h-40 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={send}
          disabled={busy || !v.trim()}
          className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
