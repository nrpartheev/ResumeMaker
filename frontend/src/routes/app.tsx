import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { AppHeader } from "@/components/app-header";
import { HistorySidebar, useActiveResumeId } from "@/components/history-sidebar";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "Studio — Résumé Lab" }] }),
  component: AppLayout,
});

function AppLayout() {
  const activeId = useActiveResumeId();
  return (
    <RequireAuth requireProfile>
      <div className="flex h-screen flex-col">
        <AppHeader />
        <div className="grid flex-1 overflow-hidden" style={{ gridTemplateColumns: "minmax(220px, 280px) 1fr" }}>
          <HistorySidebar activeId={activeId} />
          <div className="overflow-hidden">
            <Outlet />
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
