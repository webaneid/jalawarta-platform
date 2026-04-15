"use client";
import { useState } from "react";
import MediaLibrary from "./MediaLibrary";

export default function FeaturedImagePicker() {
  const [isLibraryOpen, setLibraryOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gambar Unggulan (Featured Image)</label>
      
      {selectedImage ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 group">
          <img src={selectedImage} alt="Featured" className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-2">
            <button onClick={() => setLibraryOpen(true)} className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100">Ganti</button>
            <button onClick={() => setSelectedImage(null)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Hapus</button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setLibraryOpen(true)}
          className="w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        >
          <span className="text-2xl mb-2">+</span>
          <span className="text-sm font-medium">Set Featured Image</span>
        </button>
      )}

      {/* Komponen Media Library Modals yang Disembunyikan */}
      <MediaLibrary 
        isOpen={isLibraryOpen} 
        onClose={() => setLibraryOpen(false)} 
        onSelect={(url) => setSelectedImage(url)} 
      />
    </div>
  );
}
