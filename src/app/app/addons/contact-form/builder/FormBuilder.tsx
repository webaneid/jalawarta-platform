"use client";

import { useState } from "react";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableField } from "./SortableField";
import { saveContactFormAction } from "@/app/actions/contact-forms";
import { useRouter } from "next/navigation";

export default function FormBuilder({ 
    tenantId, 
    formId, 
    initialData,
    isNew
}: { 
    tenantId: string; 
    formId?: string; 
    initialData: any;
    isNew: boolean;
}) {
  const [title, setTitle] = useState(initialData.title);
  const [fields, setFields] = useState(initialData.fields || []);
  const [settings, setSettings] = useState(initialData.settings || {});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"builder" | "settings">("builder");
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fieldTypes = [
    { type: "text", label: "Text Input", icon: "T" },
    { type: "textarea", label: "Long Text", icon: "¶" },
    { type: "number", label: "Number", icon: "#" },
    { type: "phone", label: "Phone Number", icon: "☎" },
  ];

  function addField(type: string) {
    const newField = {
      id: `f-${Math.random().toString(36).substr(2, 9)}`,
      type,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      placeholder: "",
      required: false,
      ...(type === "phone" ? { includeCountry: true } : {})
    };
    setFields([...fields, newField]);
  }

  function deleteField(id: string) {
    setFields(fields.filter((f: any) => f.id !== id));
  }

  function updateField(id: string, updates: any) {
    setFields(fields.map((f: any) => f.id === id ? { ...f, ...updates } : f));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFields((items: any[]) => {
        const oldIndex = items.findIndex((f) => f.id === active.id);
        const newIndex = items.findIndex((f) => f.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  async function handleSave() {
    if (!title) return alert("Harap isi judul formulir.");
    setLoading(true);
    const res = await saveContactFormAction(tenantId, {
      id: formId,
      title,
      fields,
      settings
    });
    if (res.success) {
      router.push("/addons/contact-form");
      router.refresh();
    } else {
      alert("Error: " + res.error);
    }
    setLoading(false);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
      <div className="space-y-6">
        {/* Header UI */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
          <input
            type="text"
            placeholder="Judul Formulir..."
            className="text-2xl font-bold bg-transparent outline-none border-b-2 border-transparent focus:border-blue-500 transition-all w-full pb-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex gap-4 mt-6 border-b border-gray-100 dark:border-gray-900">
            <button 
                onClick={() => setActiveTab("builder")}
                className={`pb-3 text-sm font-bold transition-all px-2 ${activeTab === "builder" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400"}`}
            >
                Builder
            </button>
            <button 
                onClick={() => setActiveTab("settings")}
                className={`pb-3 text-sm font-bold transition-all px-2 ${activeTab === "settings" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400"}`}
            >
                Settings
            </button>
          </div>
        </div>

        {activeTab === "builder" ? (
          <div className="bg-gray-50 dark:bg-gray-900/30 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-6 min-h-[400px]">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={fields.map((f: any) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {fields.map((field: any) => (
                    <SortableField 
                      key={field.id} 
                      field={field} 
                      onDelete={() => deleteField(field.id)}
                      onUpdate={(updates) => updateField(field.id, updates)}
                    />
                  ))}
                  {fields.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                      Belum ada field. Klik tombol di kanan untuk menambah.
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 space-y-6">
             <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Pesan Sukses</label>
                <textarea 
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={settings.successMessage}
                    onChange={(e) => setSettings({...settings, successMessage: e.target.value})}
                />
             </div>
             <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Teks Tombol Submit</label>
                <input 
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.submitButtonText}
                    onChange={(e) => setSettings({...settings, submitButtonText: e.target.value})}
                />
             </div>
             <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Email Notifikasi Admin</label>
                <input 
                    type="email"
                    placeholder="admin@yourportal.com"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.emailNotification}
                    onChange={(e) => setSettings({...settings, emailNotification: e.target.value})}
                />
                <p className="text-[10px] text-gray-400 italic">* Kosongkan jika tidak ingin menerima notifikasi email.</p>
             </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Tool Box */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm sticky top-8">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-widest">Field Toolbox</h3>
          <div className="grid grid-cols-2 gap-3">
            {fieldTypes.map((ft) => (
              <button
                key={ft.type}
                onClick={() => addField(ft.type)}
                className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 rounded-2xl transition-all group"
              >
                <span className="text-xl mb-1 text-gray-400 group-hover:text-blue-500 transition-colors font-mono">{ft.icon}</span>
                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 group-hover:text-blue-600">{ft.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-900">
            <button
               onClick={handleSave}
               disabled={loading}
               className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              )}
              {isNew ? "Simpan Form" : "Perbarui Form"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
