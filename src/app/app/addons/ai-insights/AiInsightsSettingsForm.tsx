"use client";

import { useState, useTransition } from "react";
import { updateAddonConfigAction } from "@/app/actions/addons";

const PLUGIN_ID = "ai-insights";

const PLATFORMS = [
  { id: "tiktok", label: "TikTok Trends" },
  { id: "twitter", label: "Twitter / X Trends" },
  { id: "google_trends", label: "Google Trends" },
];

export default function AiInsightsSettingsForm({
  tenantId,
  initialConfig,
}: {
  tenantId: string;
  initialConfig: { isEnabled: boolean; preferredPlatforms: string[] };
}) {
  const [isPending, startTransition] = useTransition();
  const [isEnabled, setIsEnabled] = useState(initialConfig.isEnabled);
  const [preferredPlatforms, setPreferredPlatforms] = useState<string[]>(initialConfig.preferredPlatforms);
  const [saved, setSaved] = useState(false);

  function togglePlatform(id: string) {
    setPreferredPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateAddonConfigAction(tenantId, PLUGIN_ID, { isEnabled, preferredPlatforms });
      setSaved(true);
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-6">

        {/* isEnabled toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Aktifkan Insights</p>
            <p className="text-xs text-gray-500 mt-0.5">Matikan untuk menyembunyikan fitur riset dari semua editor.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsEnabled((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isEnabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        {/* preferredPlatforms */}
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Platform Riset Tren</p>
          <div className="space-y-2">
            {PLATFORMS.map((p) => (
              <label key={p.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferredPlatforms.includes(p.id)}
                  onChange={() => togglePlatform(p.id)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{p.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all"
        >
          {isPending ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
        {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">Tersimpan.</span>}
      </div>
    </div>
  );
}
