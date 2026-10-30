import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Studio } from "@/components/studio";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/$resumeId")({
  component: ResumePage,
});

function ResumePage() {
  const { resumeId } = Route.useParams();
  const [latex, setLatex] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLatex(null);
    api<string | { latex: string }>(`/history/${encodeURIComponent(resumeId)}`)
      .then((res) => {
        if (!alive) return;
        const value = typeof res === "string" ? res : (res?.latex ?? "");
        setLatex(value);
      })
      .catch((e) => {
        if (!alive) return;
        toast.error(e instanceof Error ? e.message : "Failed to load résumé");
        setLatex("");
      });
    return () => { alive = false; };
  }, [resumeId]);

  if (latex === null) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }
  return <Studio resumeId={resumeId} initialLatex={latex} />;
}
