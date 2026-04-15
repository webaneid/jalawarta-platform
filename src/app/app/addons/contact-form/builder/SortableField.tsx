"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

export function SortableField({ 
    field, 
    onDelete, 
    onUpdate 
}: { 
    field: any; 
    onDelete: () => void; 
    onUpdate: (updates: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
        ref={setNodeRef} 
        style={style} 
        className={`bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm transition-all ${isDragging ? "ring-2 ring-blue-500" : ""}`}
    >
      <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-50 dark:border-gray-900 group">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" /></svg>
        </div>
        
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tighter bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                    {field.type}
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {field.label || "Untitled Field"}
                </span>
                {field.required && <span className="text-red-500 text-xs font-bold">*</span>}
            </div>
        </div>

        <div className="flex items-center gap-1">
            <button 
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
            >
                <svg className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <button 
                onClick={onDelete}
                className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
      </div>

      {expanded && (
        <div className="p-5 bg-gray-50/50 dark:bg-gray-900/20 space-y-4 border-t border-gray-100 dark:border-gray-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Label</label>
                <input 
                    type="text"
                    className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={field.label}
                    onChange={(e) => onUpdate({ label: e.target.value })}
                />
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Placeholder</label>
                <input 
                    type="text"
                    className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={field.placeholder || ""}
                    onChange={(e) => onUpdate({ placeholder: e.target.value })}
                />
             </div>
          </div>

          <div className="flex items-center gap-6">
             <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={field.required}
                    onChange={(e) => onUpdate({ required: e.target.checked })}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">Wajib Diisi</span>
             </label>

             {field.type === "phone" && (
                <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={field.includeCountry}
                        onChange={(e) => onUpdate({ includeCountry: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">Pilih Kode Negara</span>
                </label>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
