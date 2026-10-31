import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { AppHeader } from "@/components/app-header";
import { HistorySidebar, useActiveResumeId } from "@/components/history-sidebar";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "Studio — Résumé Lab" }] }),
  component: AppLayout,
});

function AppLayout() {
  const activeId = useActiveResumeId();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RequireAuth requireProfile>
      <div className="flex h-screen flex-col">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex items-center gap-2 border-b border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur md:hidden"
        >
          <Menu className="h-4 w-4" /> History
        </button>

        <div className="flex flex-1 overflow-hidden">
          {/* Desktop sidebar */}
          <div className="hidden md:block" style={{ width: "minmax(220px, 280px)" }}>
            <HistorySidebar activeId={activeId} />
          </div>

          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div
                className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="absolute left-0 top-0 h-full w-[280px] max-w-[85vw]">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="absolute right-2 top-2 z-10 rounded-full bg-card p-1.5 shadow-soft"
                >
                  <X className="h-4 w-4" />
                </button>
                <HistorySidebar activeId={activeId} />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <Outlet />
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
