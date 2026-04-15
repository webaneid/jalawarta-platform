"use client";

import { useState } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import MediaLibrary from './MediaLibrary';

export default function Editor() {
  const [isLibraryOpen, setLibraryOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    immediatelyRender: false,
    content: `
      <h2>Memulai Karir Sebagai Penulis Berita Jala Warta</h2>
      <p>Kini editor ini mampu menginjeksi gambar langsung dari Pustaka Media.</p>
    `,
    editorProps: {
      attributes: {
        class: 'prose prose-blue dark:prose-invert prose-sm sm:prose-base focus:outline-none max-w-none min-h-[500px]',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-black shadow-sm">
      {/* Editor Toolbar Minimalis */}
      <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-3 bg-gray-50 dark:bg-gray-900 flex flex-wrap gap-2 sticky top-0 z-10">
        <button 
          onClick={() => editor.chain().focus().toggleBold().run()} 
          className="px-3 py-1.5 border rounded-lg text-sm font-semibold bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
        >
          Bold
        </button>
        <button 
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          className="px-3 py-1.5 border rounded-lg text-sm font-semibold italic bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
        >
          Italic
        </button>
        <div className="w-px h-8 bg-gray-300 dark:bg-gray-700 mx-2"></div>
        <button 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
          className="px-3 py-1.5 border rounded-lg text-sm font-semibold bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
        >
          H2
        </button>
        <button 
          onClick={() => editor.chain().focus().toggleBlockquote().run()} 
          className="px-3 py-1.5 border rounded-lg text-sm font-semibold bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
        >
          Quote
        </button>
        
        {/* Tombol Sisipkan Gambar (Media Library Plugin) */}
        <button 
          onClick={() => setLibraryOpen(true)} 
          className="ml-auto px-4 py-1.5 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          Sisipkan Gambar
        </button>
      </div>
      
      {/* Editor Content Area */}
      <div className="p-8 cursor-text bg-white dark:bg-black" onClick={() => editor.commands.focus()}>
        <EditorContent editor={editor} />
      </div>

      {/* Komponen Modal Media Library */}
      <MediaLibrary 
        isOpen={isLibraryOpen} 
        onClose={() => setLibraryOpen(false)} 
        onSelect={(url) => {
          editor.chain().focus().setImage({ src: url }).run();
        }}
      />
    </div>
  );
}
