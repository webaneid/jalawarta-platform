"use client";

import { useState, useRef, useEffect } from "react";

export type TagItem = {
  id: string;
  name: string;
};

type TagInputProps = {
  allTags: TagItem[];
  selectedTags: TagItem[];
  onChange: (tags: TagItem[]) => void;
};

export default function TagInput({ allTags, selectedTags, onChange }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const availableTags = allTags.filter(
    (tag) =>
      !selectedTags.some((st) => st.id === tag.id) &&
      tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  function addTag(tagText: string) {
    const text = tagText.trim();
    if (!text) return;

    // Cek apakah tag sudah ada (case-insensitive)
    const existing = allTags.find((t) => t.name.toLowerCase() === text.toLowerCase());
    
    // Cegah penambahan jika sudah ada di _selectedTags_
    if (selectedTags.some((st) => st.name.toLowerCase() === text.toLowerCase())) {
      setInputValue("");
      return; 
    }

    if (existing) {
      onChange([...selectedTags, existing]);
    } else {
      // Tag baru di-generate dengan id sementara "new-..."
      onChange([...selectedTags, { id: `new-${Date.now()}`, name: text }]);
    }
    setInputValue("");
  }

  function removeTag(id: string) {
    onChange(selectedTags.filter((t) => t.id !== id));
  }

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Container Input + Pills */}
      <div 
        className={`flex flex-wrap gap-2 p-2 border rounded-lg bg-white dark:bg-black transition-colors ${
          isFocused ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-200 dark:border-gray-800"
        }`}
        onClick={() => setIsFocused(true)}
      >
        {selectedTags.map((tag) => (
          <span 
            key={tag.id} 
            className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 text-xs rounded-md font-medium"
          >
            {tag.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag.id);
              }}
              className="text-gray-400 hover:text-red-500 focus:outline-none"
            >
              ×
            </button>
          </span>
        ))}
        
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(inputValue);
            } else if (e.key === "Backspace" && inputValue === "" && selectedTags.length > 0) {
              // Hapus tag terakhir jika menekan backspace pada input yang kosong
              onChange(selectedTags.slice(0, -1));
            }
          }}
          placeholder={selectedTags.length === 0 ? "Tambahkan tag baru..." : ""}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
        />
      </div>
      
      {/* Dropdown Bantuan Auto-Complete */}
      {isFocused && (inputValue.length > 0 || availableTags.length > 0) && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {availableTags.length > 0 ? (
            <ul className="py-1">
              {availableTags.map((tag) => (
                <li
                  key={tag.id}
                  onMouseDown={(e) => {
                    e.preventDefault(); // cegah blur pada input agar onFocus tetap
                    addTag(tag.name);
                  }}
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {tag.name}
                </li>
              ))}
            </ul>
          ) : (
            inputValue.trim() !== "" && (
              <div 
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(inputValue);
                }}
                className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Buat tag baru: <span className="font-bold">"{inputValue}"</span> <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded ml-2">Enter</span>
              </div>
            )
          )}
        </div>
      )}
      <p className="text-xs text-gray-500 mt-2 font-medium">Pisahkan dengan koma (,) atau tekan Enter.</p>
    </div>
  );
}
