'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store';

export default function ReadmePage() {
  const { settings } = useStore();
  return (
    <div className="max-w-2xl mx-auto space-y-8 text-sm leading-relaxed">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Orbit Ops</h1>
        <p className="text-muted-foreground mt-1">Internal operations for {settings.companyName}</p>
      </header>

      <section>
        <h2 className="font-medium mb-2">What this is</h2>
        <p className="text-muted-foreground">One question every morning: what must we do today, and which client is falling behind? Built for a content agency that promises each client a fixed number of videos every month.</p>
      </section>

      <section>
        <h2 className="font-medium mb-2">Daily rhythm</h2>
        <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
          <li>Open <Link href="/today" className="text-foreground underline">Today</Link>. Clear overdue tasks first, then triage new requests.</li>
          <li>Log every call and WhatsApp as a request the moment it arrives. Turn it into a task or a content item from the same card.</li>
          <li>Move content across the board. Reaching <em>Posted</em> adds one to the client&apos;s monthly count; moving it back removes one.</li>
          <li>Each client&apos;s month opens on their own date, shown on the card as Cycle. When that date comes around again, the count archives itself and resets. Nothing to close manually.</li>
          <li>At month end, the Owner checks <Link href="/revenue" className="text-foreground underline">Revenue</Link> for who has not paid, and moves churned clients to the Bin.</li>
        </ol>
      </section>

      <section>
        <h2 className="font-medium mb-2">Health</h2>
        <p className="text-muted-foreground"><strong className="text-foreground">On track</strong> means recent activity and delivery matching the pace of that client&apos;s cycle. <strong className="text-foreground">Watch</strong> means slowing down or a couple of videos behind. <strong className="text-foreground">At risk</strong> means a week of silence or well behind the pace their start date implies. A client whose month began this week is not behind just because the calendar is mid-month. Health refreshes on its own every time the app opens.</p>
      </section>

      <section>
        <h2 className="font-medium mb-2">Roles</h2>
        <p className="text-muted-foreground">Owner sees payments, expenses and revenue. Manager and Team do not. Set an Owner PIN in <Link href="/settings" className="text-foreground underline">Settings</Link> so switching to Owner needs it. The role is per device.</p>
      </section>

      <section>
        <h2 className="font-medium mb-2">Your data</h2>
        <p className="text-muted-foreground">When the database is connected, open the browser that already has your clients and choose Save to database. Other phones then ask for the team access key and load the same records. Payments and expenses are not sent to a device until the Owner PIN is entered there. Until a database is connected, everything stays in this browser: download a backup from Settings before clearing it.</p>
      </section>

      <section>
        <h2 className="font-medium mb-2">Install it</h2>
        <p className="text-muted-foreground">On a phone, open the site in the browser, then Share → Add to Home Screen (iPhone) or the browser menu → Install app (Android). It opens full screen like a native app.</p>
      </section>

      <p className="text-xs text-muted-foreground pt-4">Orbit Ops · Orai · orbitcore.in</p>
    </div>
  );
}
