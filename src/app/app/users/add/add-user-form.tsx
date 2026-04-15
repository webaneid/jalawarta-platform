"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTenantMemberAction } from "@/app/actions/users";
import Link from "next/link";

export default function AddUserForm({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const roles = [
    { value: "EDITOR", label: "Editor", description: "Dapat mengelola semua konten (berita, laman, kategori)." },
    { value: "WRITER", label: "Writer", description: "Hanya dapat mengelola berita miliknya sendiri." },
    { value: "SUBSCRIBER", label: "Subscriber", description: "Hanya dapat mengelola profil sendiri." },
    { value: "SUPER_ADMIN", label: "Super Admin", description: "Kontrol penuh terhadap pengaturan tenant dan anggota." },
  ];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const role = formData.get("role") as string;
    const username = formData.get("username") as string;
    const fullName = formData.get("fullName") as string;
    const displayName = formData.get("displayName") as string;
    const password = formData.get("password") as string;

    const res = await addTenantMemberAction({
      email,
      role,
      tenantId,
      username,
      fullName,
      displayName,
      password,
    });

    if (res.success) {
      setMessage({ type: "success", text: "Berhasil menambahkan anggota baru!" });
      setTimeout(() => router.push("/users"), 1500);
    } else {
      setMessage({ type: "error", text: res.error || "Gagal menambahkan anggota." });
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-8 overflow-hidden relative">
      {loading && (
        <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {message && (
        <div className={`p-4 mb-6 rounded-xl border text-sm font-medium ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-gray-300">Email Address *</label>
            <input 
              required
              type="email" 
              name="email"
              id="email"
              placeholder="nama@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-bold text-gray-700 dark:text-gray-300">Username *</label>
            <input 
              required
              type="text" 
              name="username"
              id="username"
              placeholder="username (tanpa spasi)"
              pattern="^[a-zA-Z0-9_.-]*$"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <label htmlFor="fullName" className="block text-sm font-bold text-gray-700 dark:text-gray-300">Nama Lengkap</label>
            <input 
              type="text" 
              name="fullName"
              id="fullName"
              placeholder="Nama Lengkap Admin"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <label htmlFor="displayName" className="block text-sm font-bold text-gray-700 dark:text-gray-300">Nama Publik (Display Name)</label>
            <input 
              type="text" 
              name="displayName"
              id="displayName"
              placeholder="Nama yang muncul di berita"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Password */}
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="password" className="block text-sm font-bold text-gray-700 dark:text-gray-300">Password *</label>
            <input 
              required
              type="password" 
              name="password"
              id="password"
              placeholder="Minimal 6 karakter"
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <p className="text-xs text-gray-400 italic">User akan menggunakan email/username dan password ini untuk login.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Pilih Peran (Role)</label>
          <div className="grid gap-3 sm:grid-cols-2">
            {roles.map((role) => (
              <label 
                key={role.value}
                className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-400 cursor-pointer transition-all has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/10 group"
              >
                <input 
                  type="radio" 
                  name="role" 
                  value={role.value} 
                  defaultChecked={role.value === 'WRITER'}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{role.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{role.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button 
          disabled={loading}
          type="submit"
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 mt-4"
        >
          {loading ? "Menambahkan..." : "Tambah ke Tim"}
        </button>
      </form>
    </div>
  );
}
