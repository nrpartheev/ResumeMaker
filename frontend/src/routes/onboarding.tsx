import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { RequireAuth } from "@/components/require-auth";
import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Set up your profile — Résumé Lab" }] }),
  component: () => (
    <RequireAuth>
      <div className="min-h-screen">
        <AppHeader />
        <Onboarding />
      </div>
    </RequireAuth>
  ),
});

function Onboarding() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"upload" | "text">("text");
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (mode === "text" && summary.trim().length < 20) {
      toast.error("Tell us a bit more — at least a couple of sentences.");
      return;
    }
    if (mode === "upload" && !file) {
      toast.error("Pick a résumé file to upload.");
      return;
    }
    setSubmitting(true);
    try {
      let res: { success: boolean; profile?: unknown };
      if (mode === "text") {
        res = await api<{ success: boolean; profile?: unknown }>("/createprofile", {
          method: "POST",
          json: { summary },
        });
      } else {
        const fd = new FormData();
        fd.append("resume", file!);
        res = await api<{ success: boolean; profile?: unknown }>("/createprofile", {
          method: "POST",
          body: fd,
        });
      }
      if (!res?.success) {
        toast.error("That doesn't look like a real résumé. Please share genuine details about your background.");
        return;
      }
      await refreshProfile();
      toast.success("Profile created.");
      navigate({ to: "/app" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="font-display text-4xl tracking-tight">Welcome.</h1>
        <p className="mt-3 text-muted-foreground">
          Help us bootstrap your profile. Upload an old résumé, or just tell us about yourself —
          we'll structure the rest.
        </p>

        <div className="mt-8 inline-flex rounded-full border border-border bg-card p-1 text-sm">
          {(["text", "upload"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 transition ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {m === "text" ? "Write a summary" : "Upload résumé"}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {mode === "text" ? (
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="I'm a senior backend engineer with 6 years building distributed systems at..."
              className="min-h-[220px] w-full rounded-2xl border border-border bg-card p-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card p-10 text-sm text-muted-foreground hover:bg-secondary">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.tex"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <span className="font-medium text-foreground">{file.name}</span>
              ) : (
                <>
                  <span className="font-medium text-foreground">Drop your résumé here</span>
                  <span>PDF, DOCX, TXT or TEX</span>
                </>
              )}
            </label>
          )}
        </div>

        <button
          onClick={submit}
          disabled={submitting}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create profile →"}
        </button>
      </motion.div>
    </main>
  );
}
