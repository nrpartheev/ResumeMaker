import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, Sparkles } from "lucide-react";
import { LatexEditor } from "./latex-editor";
import { PdfPreview, useLatexBlobUrl } from "./pdf-preview";
import { IslandToggle, type IslandMode } from "./island-toggle";
import { ChangeBar } from "./change-bar";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function Studio({
  resumeId,
  initialLatex,
}: {
  resumeId?: string;
  initialLatex: string;
}) {
  const [latex, setLatex] = useState(initialLatex);
  const [mode, setMode] = useState<IslandMode>("pdf");
  const [busy, setBusy] = useState(false);
  const blobUrl = useLatexBlobUrl(latex);

  useEffect(() => { setLatex(initialLatex); }, [initialLatex]);

  const askChange = useCallback(
    async (instruction: string) => {
      setBusy(true);
      try {
        const res = await api<{ latex: string }>("/change", {
          method: "POST",
          json: { instruction, latex, resume_id: resumeId },
        });
        if (res?.latex) {
          setLatex(res.latex);
          toast.success("Updated.");
        } else {
          toast.error("Empty response from /change");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Change failed");
      } finally {
        setBusy(false);
      }
    },
    [latex, resumeId]
  );

  return (
    <section className="flex h-full flex-col">
      {/* Top bar: toggle + download */}
      <div className="relative flex items-center justify-center px-4 pt-3">
        <IslandToggle value={mode} onChange={setMode} />
        <div className="absolute right-4 top-3 flex items-center gap-2">
          <a
            href={blobUrl}
            download={`resume-${resumeId ?? "draft"}.tex`}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-secondary"
          >
            <Download className="h-3 w-3" /> .tex
          </a>
        </div>
      </div>

      {/* Viewer surface */}
      <div className="relative mx-3 my-3 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <AnimatePresence mode="wait">
          {mode === "code" ? (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0"
            >
              <LatexEditor value={latex} onChange={setLatex} readOnly={busy} />
            </motion.div>
          ) : (
            <motion.div
              key="pdf"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0"
            >
              <PdfPreview latex={latex} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI processing overlay — covers the entire viewer panel */}
        <AnimatePresence>
          {busy && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/80 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 shadow-soft border border-border">
                <Sparkles className="h-4 w-4 text-accent animate-pulse" />
                <span className="text-sm font-medium text-foreground">AI is updating your résumé…</span>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">This usually takes a few seconds</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ChangeBar busy={busy} onSubmit={askChange} />
    </section>
  );
}
