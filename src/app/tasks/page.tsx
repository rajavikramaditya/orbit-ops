"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Card, EmptyState, Modal, PageHeader, Segmented } from "@/components/ui";
import { TaskRow } from "@/components/TaskRow";
import { QuickAdd } from "@/components/QuickAdd";
import { CsvImport } from "@/components/CsvImport";

type Filter = "mine" | "overdue" | "today" | "waiting" | "all" | "done";

export default function TasksPage() {
  return <Suspense fallback={null}><TasksInner /></Suspense>;
}

function TasksInner() {
  const store = useStore();
  const params = useSearchParams();
  const focus = params.get("focus");
  const [filter, setFilter] = useState<Filter>(store.role === "team" ? "mine" : "all");
  const [quick, setQuick] = useState(false);
  const [importing, setImporting] = useState(false);

  const tasks = useMemo(() => {
    const all = store.state.tasks.filter((t) => !t.deletedAt);
    const open = all.filter((t) => t.status !== "done");
    const list =
      filter === "mine" ? open.filter((t) => t.assigneeId === store.currentUser.id)
        : filter === "overdue" ? open.filter((t) => t.dueOn < store.today)
        : filter === "today" ? open.filter((t) => t.dueOn === store.today)
        : filter === "waiting" ? open.filter((t) => t.status === "waiting_on_client")
        : filter === "done" ? all.filter((t) => t.status === "done")
        : open;
    return list.sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.priority.localeCompare(b.priority));
  }, [store, filter]);

  return (
    <div>
      <PageHeader title="Tasks" subtitle="Generic work not tied to a single video: ad setup, client calls, reports, design jobs." actions={<>
        {store.can("manage_tasks") && store.can("manage_clients") && <Button variant="ghost" onClick={() => setImporting(true)}><Upload size={16} /> Import CSV</Button>}
        {store.can("manage_tasks") && <Button onClick={() => setQuick(true)}><Plus size={16} /> Task</Button>}
      </>} />
      <div className="mb-4 scroll-x">
        <Segmented value={filter} onChange={setFilter} options={[{ id: "mine", label: "Mine" }, { id: "overdue", label: "Overdue" }, { id: "today", label: "Due today" }, { id: "waiting", label: "Waiting on client" }, { id: "all", label: "All open" }, { id: "done", label: "Done" }]} />
      </div>
      <Card padded={false}>
        {tasks.length === 0 ? <EmptyState title="No tasks here" hint="Try another filter or add a task." /> : (
          <ul className="divide-y">{tasks.map((t) => <TaskRow key={t.id} task={t} highlight={focus === t.id} />)}</ul>
        )}
      </Card>
      <QuickAdd open={quick} onClose={() => setQuick(false)} defaultKind="task" />
      <Modal open={importing} onClose={() => setImporting(false)} title="Import tasks from CSV" wide><CsvImport kind="tasks" onDone={() => setImporting(false)} /></Modal>
    </div>
  );
}
