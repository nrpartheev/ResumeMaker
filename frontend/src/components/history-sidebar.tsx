import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, FileText, Trash2 } from "lucide-react";
import { api, type HistoryItem } from "@/lib/api";
import { toast } from "sonner";

export function HistorySidebar({ activeId }: { activeId?: string }) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  function load() {
    api<HistoryItem[] | { items: HistoryItem[] }>("/history")
      .then((res) => setItems(Array.isArray(res) ? res : (res.items ?? [])))
      .catch(() => setItems([]));
  }

  useEffect(() => { load(); }, [activeId]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();   // don't navigate via the <Link>
    e.stopPropagation();

    if (!window.confirm("Delete this résumé? This cannot be undone.")) return;

    setDeletingId(id);
    try {
      await api(`/history/${encodeURIComponent(id)}`, { method: "DELETE" });
      toast.success("Résumé deleted.");
      // If we just deleted the active one, go back to /app
      if (id === activeId) navigate({ to: "/app" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <aside className="flex h-full flex-col border-r border-border bg-card/40">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
          History
        </h2>
        <button
          onClick={() => navigate({ to: "/app", search: { new: "1" } as never })}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground"
        >
          <Plus className="h-3 w-3" /> New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {items === null ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            No résumés yet.
            <br />
            Click <span className="text-foreground">New</span> to start.
          </div>
        ) : (
          <ul className="space-y-1">
            {items.map((it) => {
              const active = it.id === activeId;
              const isDeleting = deletingId === it.id;
              return (
                <li key={it.id} className="group relative">
                  <Link
                    to="/app/$resumeId"
                    params={{ resumeId: it.id }}
                    className={`flex items-start gap-2 rounded-lg px-3 py-2 pr-8 text-sm transition ${
                      active
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    } ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {it.title ?? `Résumé ${it.id.slice(0, 6)}`}
                      </div>
                      <div className="mt-0.5 flex gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {it.template && <span>{it.template}</span>}
                        {it.updated_at && <span>· {formatDate(it.updated_at)}</span>}
                      </div>
                    </div>
                  </Link>

                  {/* Delete button — visible on hover or when active */}
                  <button
                    onClick={(e) => handleDelete(e, it.id)}
                    disabled={isDeleting}
                    aria-label="Delete résumé"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus:opacity-100 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

function formatDate(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function useActiveResumeId() {
  try {
    const p = useParams({ strict: false }) as { resumeId?: string };
    return p.resumeId;
  } catch {
    return undefined;
  }
}
