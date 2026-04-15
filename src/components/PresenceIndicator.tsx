"use client";

import { useEffect, useState } from "react";
import { pingPresence, getPresence } from "@/app/actions/presence";
import Image from "next/image";

type PresenceUser = {
  id: string;
  name: string | null;
  displayName: string | null;
  image: string | null;
};

type PresenceIndicatorProps = {
  postId: string;
  tenantId: string;
};

export default function PresenceIndicator({ postId, tenantId }: PresenceIndicatorProps) {
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!postId || !tenantId) return;

    // Fungsi untuk memicu ping dan mengambil data terbaru
    const tick = async () => {
      // 1. Kirim Ping kita sendiri
      await pingPresence(postId, tenantId);
      
      // 2. Ambil data semua orang yang aktif
      const result = await getPresence(postId, tenantId);
      if (result.success && result.data) {
        setActiveUsers(result.data);
      }
    };

    // Jalankan pertama kali
    tick();

    // Jalankan setiap 15 detik (lebih hemat daripada 10 detik tapi tetap responsif)
    const interval = setInterval(tick, 15000);

    return () => clearInterval(interval);
  }, [postId, tenantId]);

  if (activeUsers.length <= 1) return null; // Jika hanya kita sendiri, sembunyikan

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-full shadow-sm">
      <div className="flex -space-x-2 overflow-hidden">
        {activeUsers.map((user) => (
          <div 
            key={user.id} 
            className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-950 overflow-hidden relative group"
            title={user.displayName || user.name || "Anonymous"}
          >
            {user.image ? (
              <Image 
                src={user.image} 
                alt={user.name || "User"} 
                width={24} 
                height={24} 
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold uppercase">
                {(user.displayName || user.name || "A").charAt(0)}
              </div>
            )}
            
            {/* Tooltip on Hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
              <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-xl">
                {user.displayName || user.name} sedang mengedit
              </div>
            </div>
          </div>
        ))}
      </div>
      <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">
        {activeUsers.length} sedang mengedit
      </span>
    </div>
  );
}
