export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-sm text-muted-foreground mt-1">Orbit Media by Orbitcore</p>
      <div className="mt-6 space-y-4 text-sm">
        <div className="rounded-xl border p-4">
          <p className="font-medium">Company</p>
          <p>Orbitcore · Orai, Uttar Pradesh</p>
          <p className="text-muted-foreground">GST, bank details, invoice series will come from here</p>
        </div>
      </div>
    </div>
  );
}
