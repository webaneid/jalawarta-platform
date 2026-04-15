"use client";

import { useState } from "react";
import { toggleAddonStatusAction } from "@/app/actions/addons";
import { useRouter } from "next/navigation";

export default function AddonStatusToggle({ 
  tenantId, 
  pluginId, 
  initialStatus 
}: { 
  tenantId: string; 
  pluginId: string; 
  initialStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isActive = initialStatus === "ACTIVE";

  async function handleToggle() {
    setLoading(true);
    const res = await toggleAddonStatusAction(tenantId, pluginId);
    if (!res.success) {
      alert("Error: " + res.error);
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-500 outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-black disabled:opacity-50 ${
        isActive ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-500 ease-in-out ${
          isActive ? "translate-x-6" : "translate-x-1"
        }`}
      />
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
            <svg className="animate-spin h-3 w-3 text-white opacity-40" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        </span>
      )}
    </button>
  );
}
