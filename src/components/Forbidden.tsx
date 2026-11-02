"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui";

export function Forbidden({ what }: { what: string }) {
  return (
    <Card>
      <div className="text-center py-12">
        <ShieldAlert className="mx-auto mb-3 muted" size={28} />
        <p className="font-semibold">You don&apos;t have access to {what}</p>
        <p className="text-sm muted mt-1">This area is restricted by role. Permissions are enforced on the server and in the database (row-level security), not just in the UI.</p>
        <Link href="/" className="btn btn-ghost mt-5">Back to Today</Link>
      </div>
    </Card>
  );
}
