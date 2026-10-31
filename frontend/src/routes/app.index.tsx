import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { NewResumeDialog } from "@/components/new-resume-dialog";
import { Studio } from "@/components/studio";
import { Sparkles } from "lucide-react";

type AppSearch = { new?: string };

export const Route = createFileRoute("/app/")({
  validateSearch: (s: Record<string, unknown>): AppSearch => ({ new: typeof s.new === "string" ? s.new : undefined }),
  component: AppIndex,
});

function AppIndex() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(!!search.new);
  const [draftHtml, setDraftHtml] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | undefined>(undefined);

  useEffect(() => { if (search.new) setOpen(true); }, [search.new]);

  if (draftHtml !== null) {
    return (
      <Studio resumeId={draftId} initialHtml={draftHtml} />
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="max-w-md text-center"
      >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-accent">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="mt-5 font-display text-3xl tracking-tight">Start a new résumé</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pick a template, optionally tailor to a job description, and we'll draft your résumé.</p>
        <button
          onClick={() => setOpen(true)}
          className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          New résumé
        </button>
      </motion.div>

      <NewResumeDialog
        open={open}
        onClose={() => {
          setOpen(false);
          if (search.new) navigate({ to: "/app", search: {} as never });
        }}
        onCreated={({ id, html }) => {
          setDraftId(id);
          setDraftHtml(html);
          if (id) navigate({ to: "/app/$resumeId", params: { resumeId: id } });
        }}
      />
    </div>
  );
}
