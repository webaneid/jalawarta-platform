import { Editor } from "@tiptap/react";
import BlockInserter from "./BlockInserter";

interface EditorToolbarProps {
  editor: Editor;
  isAiLoading: boolean;
  onAiFix: () => void;
  onAiExpand: () => void;
  tenantId: string;
}

export default function EditorToolbar({ editor, isAiLoading, onAiFix, onAiExpand, tenantId }: EditorToolbarProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 flex flex-wrap items-center gap-1.5 sticky top-0 z-10">
      {[
        { label: "B", action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), title: "Bold", cls: "font-bold" },
        { label: "I", action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), title: "Italic", cls: "italic" },
        { label: "S", action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), title: "Strikethrough", cls: "line-through" },
      ].map((btn) => (
        <button key={btn.title} onClick={btn.action} title={btn.title} type="button"
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm border transition-all ${btn.cls} ${btn.active ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300" : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"}`}
        >{btn.label}</button>
      ))}

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5" />

      {([2, 3] as const).map((level) => (
        <button key={level} onClick={() => editor.chain().focus().toggleHeading({ level }).run()} title={`Heading ${level}`} type="button"
          className={`px-2.5 h-8 rounded-lg text-xs font-bold border transition-all ${editor.isActive("heading", { level }) ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300" : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"}`}
        >H{level}</button>
      ))}

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5" />

      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`px-2.5 h-8 rounded-lg text-xs font-semibold border transition-all ${editor.isActive("bulletList") ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300" : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"}`}>• List</button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`px-2.5 h-8 rounded-lg text-xs font-semibold border transition-all ${editor.isActive("orderedList") ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300" : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"}`}>1. List</button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`px-2.5 h-8 rounded-lg text-xs font-semibold border transition-all ${editor.isActive("blockquote") ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300" : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"}`}>" Quote</button>
      <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={`px-2.5 h-8 rounded-lg text-xs font-mono border transition-all ${editor.isActive("code") ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300" : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"}`}>{`</>`}</button>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5" />

      {/* AI Toolbar Buttons */}
      <button 
        type="button"
        disabled={isAiLoading}
        onClick={onAiFix}
        className="flex items-center gap-1.5 px-3 h-8 bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold transition-all hover:bg-purple-100 disabled:opacity-50"
      >
        ✨ AI Fix
      </button>
      <button 
        type="button"
        disabled={isAiLoading}
        onClick={onAiExpand}
        className="flex items-center gap-1.5 px-3 h-8 bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold transition-all hover:bg-purple-100 disabled:opacity-50"
      >
        🚀 AI Expand
      </button>

      <div className="flex-1" />

      {/* Block Inserter */}
      <BlockInserter 
        tenantId={tenantId}
        onInsert={(type, id, blockTitle) => {
          editor.commands.insertAddonBlock({
            addonType: type,
            addonId: id,
            title: blockTitle || "Add-on Terpasang",
          });
        }}
      />
    </div>
  );
}
