import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";

export default function AddonNodeView(props: NodeViewProps) {
  const { node, deleteNode } = props;
  const addonType = node.attrs.addonType;
  const addonId = node.attrs.addonId;
  const title = node.attrs.title || "Add-on Block";

  return (
    <NodeViewWrapper className="my-6">
      <div 
        className="w-full border-2 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-5 flex items-center justify-between group relative transition-colors hover:border-blue-300 dark:hover:border-blue-800"
        contentEditable={false}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
             {addonType === "contact-form" ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
             ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
             )}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-base m-0 leading-none mb-1">{title}</h4>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded">
                    {addonType.replace("-", " ")}
                </span>
                <span className="text-xs font-mono text-gray-500">ID: {addonId}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={deleteNode}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
          title="Hapus Blok"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    </NodeViewWrapper>
  );
}
