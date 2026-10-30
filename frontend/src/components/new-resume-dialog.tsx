import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, templateImageUrl, type Template } from "@/lib/api";
import { toast } from "sonner";

export function NewResumeDialog({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (result: { id?: string; latex: string; template: string }) => void;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api<Template[] | { templates: Template[] }>("/api/templates")
      .then((res) => {
        const list = Array.isArray(res) ? res : res.templates ?? [];
        setTemplates(list);
        if (list[0]) setSelected(list[0].name);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't load templates"))
      .finally(() => setLoading(false));
  }, [open]);

  async function generate() {
    if (!selected) return toast.error("Pick a template");
    setSubmitting(true);
    try {
      const res = await api<{ id?: string; latex: string }>("/generate", {
        method: "POST",
        json: { template: selected, jd: jd || undefined },
      });
      onCreated({ id: res.id, latex: res.latex, template: selected });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-island"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-display text-xl">New résumé</h2>
                <p className="text-xs text-muted-foreground">Pick a template. Optionally tailor to a JD.</p>
              </div>
              <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-muted-foreground hover:bg-secondary">Esc</button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Template</h3>
              {loading ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No templates available from the backend yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {templates.map((t) => {
                    const active = selected === t.name;
                    return (
                      <button
                        key={t.name}
                        onClick={() => setSelected(t.name)}
                        className={`group overflow-hidden rounded-xl border bg-background text-left transition ${active ? "border-accent ring-2 ring-accent/40" : "border-border hover:border-foreground/30"}`}
                      >
                        <div className="aspect-[3/4] overflow-hidden bg-muted">
                          <img
                            src={templateImageUrl(t.image)}
                            alt={t.label ?? t.name}
                            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                            onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
                          />
                        </div>
                        <div className="p-3">
                          <div className="text-sm font-medium">{t.label ?? t.name}</div>
                          {t.description && <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{t.description}</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <h3 className="mt-8 mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Job description <span className="lowercase text-muted-foreground/70">(optional)</span></h3>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste a job description to tailor the résumé to it…"
                className="min-h-[140px] w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-center justify-between border-t border-border bg-secondary/40 px-6 py-3">
              <span className="text-xs text-muted-foreground">{selected ? `Selected: ${selected}` : "No template selected"}</span>
              <div className="flex gap-2">
                <button onClick={onClose} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">Cancel</button>
                <button
                  onClick={generate}
                  disabled={submitting || !selected}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {submitting ? "Generating…" : "Generate"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
