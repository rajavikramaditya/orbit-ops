"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Textarea } from "@/components/ui";

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = split(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((l) => {
    const cells = split(l);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

export const CLIENT_CSV_TEMPLATE = `official_name,display_name,aliases,wrong_spellings,status,engagement_type,industry,city,address,maps_url,gst_no,website,tagline,language_pref,onboarded_on,owner,package,videos_per_cycle,monthly_fee_rupees,cycle_day,gst_applicable
Maa Sharda Jewellers,Maa Sharda Jewellers,MSJ|Sharda Jewellers,Ma Sharda Jewellers|Maa Sharda Jewelers,active,retainer,Jewellery showroom,Orai,Sadar Bazar,https://maps.google.com/?q=Maa+Sharda+Jewellers,,,Vishwas ki chamak,Hinglish,2026-06-12,Ram,12 videos / month,12,35000,12,yes
Haven Solutions,Haven Solutions,Jagannath Modular Furniture Door,Heaven Solutions,active,retainer,Furniture & interiors,Orai,Kalpi Road,,,,,Hinglish,2026-07-05,Vikas,8 videos / month,8,25000,5,yes`;

export const TASK_CSV_TEMPLATE = `title,client,assignee,priority,due_on,description,estimated_hours
Set up Dhanteras ad campaign,Maa Sharda Jewellers,Shahil,P1,2026-11-05,Budget ₹5000,2
Share monthly report,Haven Solutions,Tanvi,P2,2026-11-06,,1`;

export function CsvImport({ kind, onDone }: { kind: "clients" | "tasks"; onDone: () => void }) {
  const store = useStore();
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const template = kind === "clients" ? CLIENT_CSV_TEMPLATE : TASK_CSV_TEMPLATE;

  const download = () => {
    const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `orbit-ops-${kind}-template.csv`;
    a.click();
  };

  const run = () => {
    const rows = parseCsv(text);
    if (rows.length === 0) {
      setResult("No rows found. Paste CSV with a header row.");
      return;
    }
    const n = kind === "clients" ? store.importClientsCsv(rows) : store.importTasksCsv(rows);
    setResult(`Imported ${n} ${kind}.`);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm muted">Paste CSV below or upload a file. Columns follow the template (UTF-8, Hindi text supported). Use <code>|</code> to separate multiple aliases.</p>
      <div className="flex gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={download}>Download template</Button>
        <label className="btn btn-ghost btn-sm cursor-pointer">
          Upload .csv
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }} />
        </label>
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={template.split("\n")[0]} className="font-mono text-xs min-h-[160px]" />
      {result && <p className="text-sm font-medium">{result}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Close</Button>
        <Button onClick={run} disabled={!text.trim()}>Import</Button>
      </div>
    </div>
  );
}
