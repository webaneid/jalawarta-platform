"use client";

import { useState } from "react";
import { submitContactFormAction } from "@/app/actions/contact-public";

const COUNTRY_CODES = [
  { code: "62", name: "ID", label: "🇮🇩 +62" },
  { code: "1", name: "US/CA", label: "🇺🇸 +1" },
  { code: "44", name: "UK", label: "🇬🇧 +44" },
  { code: "65", name: "SG", label: "🇸🇬 +65" },
  { code: "61", name: "AU", label: "🇦🇺 +61" },
  { code: "81", name: "JP", label: "🇯🇵 +81" },
];

export default function FormRenderer({ 
    tenantId, 
    form 
}: { 
    tenantId: string; 
    form: any 
}) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = form.fields as any[];
  const settings = form.settings as any;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await submitContactFormAction(tenantId, form.id, formData);

    if (res.success) {
      setSubmitted(true);
    } else {
      setError(res.error || "Gagal mengirim pesan.");
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900 p-8 rounded-3xl text-center">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 scale-110">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-300 mb-2">Pesan Terkirim!</h3>
        <p className="text-emerald-700 dark:text-emerald-400 text-sm">
            {settings.successMessage || "Terima kasih telah menghubungi kami."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 p-8 rounded-3xl shadow-xl">
      <div className="space-y-1 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{form.title}</h2>
        <p className="text-xs text-gray-500">Silakan lengkapi data di bawah ini.</p>
      </div>

      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300 pl-1 flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </label>

          {field.type === "textarea" ? (
            <textarea
              name={field.id}
              required={field.required}
              placeholder={field.placeholder}
              rows={4}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
            />
          ) : field.type === "phone" ? (
            <div className="flex gap-2">
              {field.includeCountry && (
                <div className="relative">
                  <select
                    name={`${field.id}_country`}
                    className="appearance-none bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl pl-3 pr-8 py-3 text-sm font-medium outline-none h-full"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              )}
              <input
                type="tel"
                name={field.id}
                required={field.required}
                placeholder={field.placeholder || "812 3456 ..."}
                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
              />
            </div>
          ) : (
            <input
              type={field.type === "number" ? "number" : "text"}
              name={field.id}
              required={field.required}
              placeholder={field.placeholder}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all leading-relaxed"
            />
          )}
        </div>
      ))}

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {error}
        </div>
      )}

      <div className="pt-4">
        <button
          disabled={loading}
          type="submit"
          className="w-full bg-gray-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white font-extrabold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
             <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
             settings.submitButtonText || "Kirim Pesan"
          )}
        </button>
      </div>
    </form>
  );
}
