'use client';

export default function ReadmePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 text-sm leading-relaxed">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Orbit Ops</h1>
        <p className="text-muted-foreground mt-1">Internal operations for Orbit Media by Orbitcore</p>
      </header>

      <section>
        <h2 className="font-medium mb-2">What this is</h2>
        <p>Orbit Ops answers one question every morning: what must we do today, and which client is falling behind? It is built for a content-led agency that delivers a fixed number of videos per client every month.</p>
      </section>

      <section>
        <h2 className="font-medium mb-2">Daily rhythm</h2>
        <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
          <li>Open Today — see open tasks and the monthly delivery scorecard.</li>
          <li>Log requests as they arrive from clients.</li>
          <li>Move content through the pipeline and assign tasks.</li>
          <li>On client detail, update progress, record payments and expenses, and review activity.</li>
          <li>At month end, check Revenue and move churned clients to Bin.</li>
        </ol>
      </section>

      <section>
        <h2 className="font-medium mb-2">Sections</h2>
        <ul className="space-y-1 text-muted-foreground">
          <li><strong className="text-foreground">Today</strong> — Daily priority and delivery scorecard</li>
          <li><strong className="text-foreground">Clients</strong> — List, health, onboard date, Bin</li>
          <li><strong className="text-foreground">Revenue</strong> — Received, spent, profit</li>
          <li><strong className="text-foreground">Requests</strong> — Client inbox</li>
          <li><strong className="text-foreground">Content</strong> — Video pipeline</li>
          <li><strong className="text-foreground">Tasks</strong> — Non-video work</li>
          <li><strong className="text-foreground">Team</strong> — People and roles</li>
        </ul>
      </section>

      <section>
        <h2 className="font-medium mb-2">Health</h2>
        <p className="text-muted-foreground">On track (recent activity, on pace), Watch (slowing), At risk (quiet or behind). Churned clients leave the active list and go to Bin.</p>
      </section>

      <section>
        <h2 className="font-medium mb-2">What this is not</h2>
        <p className="text-muted-foreground">Not a client portal, not full accounting, not an asset library. It stays focused on delivery, requests, tasks, and the money attached to each client.</p>
      </section>

      <p className="text-xs text-muted-foreground pt-4">Orbit Media · Orai · orbitcore.in</p>
    </div>
  );
}
