import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Point react-pdf at the bundled worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// ---------------------------------------------------------------------------
// WasmTex client-side compilation (pdfLaTeX in browser via WASM)
// ---------------------------------------------------------------------------

import { WasmTexCompiler } from "wasmtex/headless";

let compilerPromise: Promise<InstanceType<typeof WasmTexCompiler>> | null = null;

async function getCompiler(): Promise<InstanceType<typeof WasmTexCompiler>> {
  if (compilerPromise) return compilerPromise;
  compilerPromise = (async () => {
    const compiler = new WasmTexCompiler({
      assetBaseUrl: "/",
      texliveVersion: "2025",
      files: {},
    });
    await compiler.init();
    return compiler;
  })();
  return compilerPromise;
}

async function compileClientSide(latex: string): Promise<Blob> {
  const compiler = await getCompiler();
  await compiler.loadProject({ "main.tex": latex });
  const result = await compiler.compile();
  if (result.success && result.pdf) {
    return new Blob([result.pdf as BlobPart], { type: "application/pdf" });
  }
  throw new Error(result.log?.slice(-2000) || result.errors?.join("\n") || "Compilation failed");
}

// ---------------------------------------------------------------------------
// PdfPreview
// ---------------------------------------------------------------------------

export function PdfPreview({ latex }: { latex: string }) {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<"idle" | "compiling" | "error">("idle");
  const [errorLog, setErrorLog] = useState<string>("");
  const [numPages, setNumPages] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track container width so the PDF page scales to fit
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compile on latex change (debounced)
  useEffect(() => {
    if (!latex.trim()) {
      setPdfBlob(null);
      setStatus("idle");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      let cancelled = false;
      setStatus("compiling");

      compileClientSide(latex)
        .then((blob) => {
          if (cancelled) return;
          setPdfBlob(blob);
          setPage(1);
          setStatus("idle");
          setErrorLog("");
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          setStatus("error");
          setErrorLog(e instanceof Error ? e.message : String(e));
        });

      return () => { cancelled = true; };
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [latex]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (status === "error") {
    return (
      <div className="flex h-full items-start justify-center overflow-auto p-6">
        <div className="max-w-2xl rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">LaTeX compile error</span>
          </div>
          <pre className="mt-3 max-h-[60vh] overflow-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
            {errorLog || "Unknown error"}
          </pre>
        </div>
      </div>
    );
  }

  if (!pdfBlob && status !== "compiling") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Preparing preview…
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-muted/40">
      {/* Recompiling overlay badge */}
      {status === "compiling" && pdfBlob && (
        <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow backdrop-blur">
          <Loader2 className="h-3 w-3 animate-spin" /> Recompiling
        </div>
      )}

      {/* Full-height spinner while first compile in flight */}
      {status === "compiling" && !pdfBlob && (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Compiling LaTeX…
        </div>
      )}

      {/* PDF canvas — fills the container, no browser chrome */}
      {pdfBlob && (
        <>
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto flex flex-col items-center py-4 gap-4"
          >
            <Document
              file={pdfBlob}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                </div>
              }
            >
              <Page
                pageNumber={page}
                width={containerWidth ? containerWidth - 32 : undefined}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            </Document>
          </div>

          {/* Page navigation — only shown for multi-page PDFs */}
          {numPages > 1 && (
            <div className="flex items-center justify-center gap-3 border-t border-border bg-card py-2 text-sm text-muted-foreground">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded p-1 hover:bg-secondary disabled:opacity-30"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>
                {page} / {numPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(numPages, p + 1))}
                disabled={page >= numPages}
                className="rounded p-1 hover:bg-secondary disabled:opacity-30"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook: .tex download blob URL (used by Studio toolbar)
// ---------------------------------------------------------------------------

export function useLatexBlobUrl(latex: string) {
  const [url, setUrl] = useState<string>("");
  const lastUrl = useRef<string>("");
  useEffect(() => {
    const blob = new Blob([latex], { type: "application/x-tex" });
    const u = URL.createObjectURL(blob);
    if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
    lastUrl.current = u;
    setUrl(u);
    return () => { URL.revokeObjectURL(u); };
  }, [latex]);
  return url;
}
