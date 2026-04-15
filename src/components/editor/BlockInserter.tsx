import { useState, useEffect } from "react";
import { getContactForms } from "@/app/actions/contact-forms";

interface BlockInserterProps {
  tenantId: string;
  onInsert: (type: string, id: string, title?: string) => void;
}

export default function BlockInserter({ tenantId, onInsert }: BlockInserterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [forms, setForms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && forms.length === 0) {
      loadForms();
    }
  }, [isOpen]);

  async function loadForms() {
    setIsLoading(true);
    const result = await getContactForms(tenantId);
    if (result.success && result.forms) {
      setForms(result.forms);
    }
    setIsLoading(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold transition-all ${
          isOpen
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
            : "bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
        Add Block
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[100] bg-black/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" 
            onClick={() => setIsOpen(false)}
          >
            {/* Modal Box */}
            <div 
              className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 bg-gray-50/50 dark:bg-black/40 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Sisipkan Add-on</h4>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto">
                
                <div className="px-3 pt-2 pb-1 text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">Contact Forms</div>
                
                {isLoading ? (
                  <div className="py-8 text-center text-xs font-medium text-gray-400">Memuat data...</div>
                ) : forms.length === 0 ? (
                  <div className="py-8 text-center text-xs font-medium text-gray-400 border-2 border-dashed rounded-2xl mx-1 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">Belum ada formulir</div>
                ) : (
                  forms.map((form) => (
                    <button
                      key={form.id}
                      onClick={() => {
                        onInsert("contact-form", form.id, form.title);
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-4 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate mb-0.5">{form.title}</div>
                        <div className="text-[10px] text-gray-500 font-mono truncate">ID: {form.id}</div>
                      </div>
                    </button>
                  ))
                )}

              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
