import { useMemo, useRef } from "react";
import { Download } from "lucide-react";

/** Browser-rendered HTML preview; the browser print dialog can save it as PDF. */
export function PdfPreview({ html }: { html: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(() => {
    const withoutScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
    return withoutScripts.replace(/<head\b([^>]*)>/i, '<head$1><base target="_blank">');
  }, [html]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/40">
      <div className="flex justify-end border-b border-border bg-card px-2 py-2 md:px-3">
        <button
          onClick={() => frameRef.current?.contentWindow?.print()}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-secondary md:px-3"
        >
          <Download className="h-3 w-3" /> Save PDF
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2 md:p-4 md:p-8">
        <iframe
          ref={frameRef}
          title="Résumé preview"
          srcDoc={srcDoc}
          sandbox="allow-same-origin allow-modals"
          className="mx-auto block min-h-[11in] w-full max-w-[8.5in] border-0 bg-white shadow-lg"
        />
      </div>
    </div>
  );
}
