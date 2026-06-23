import DeleteAccountDangerZone from "@/components/DeleteAccountDangerZone";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-6 pt-[110px] text-gray-900">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold">Settings</h1>

        {/* your existing settings content */}

        <DeleteAccountDangerZone />
      </div>
    </div>
  );
}
