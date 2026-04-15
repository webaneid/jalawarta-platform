import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { IconPackage, IconPlugConnected, IconUsersGroup, IconDashboard, IconBox, IconShieldLock } from "@tabler/icons-react";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || !session.email) redirect("/login");

  // Validate Super Admin Role
  const dbUser = await db.query.users.findFirst({
    where: eq(users.email, session.email),
  });

  if (!dbUser || dbUser.role !== "PLATFORM_ADMIN") {
    redirect("/"); // Return to tenant selection if not Platform Admin
  }

  const navLinks = [
    { name: "Dasbor Utama", href: "/platform", icon: IconDashboard },
    { name: "Manajemen Paket", href: "/platform/packages", icon: IconPackage },
    { name: "Core Modules", href: "/platform/modules", icon: IconBox },
    { name: "Add-on Marketplace", href: "/platform/addons", icon: IconPlugConnected },
    { name: "API Key Vault", href: "/platform/api-keys", icon: IconShieldLock },
    { name: "Semua Tenants", href: "/platform/tenants", icon: IconUsersGroup },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col z-20 shrink-0 shadow-sm relative">
        <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-black/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center text-white shadow-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <span className="font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-none text-lg">
              Jala<span className="text-purple-600 dark:text-purple-400">Platform</span>
            </span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Administrasi SaaS</div>
          {navLinks.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-900 transition-all group"
            >
              <item.icon className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800">
            <img src={dbUser.image || "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 shadow-sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{dbUser.name}</p>
              <p className="text-[10px] text-gray-500 font-medium truncate uppercase tracking-wider">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0 overflow-y-auto">
        <div className="absolute top-0 right-0 p-4 z-10 hidden md:block">
          <Link href="/" className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 shadow-sm flex items-center gap-2 transition-colors">
            Keluar ke Portal User <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        <div className="flex-1 p-8 2xl:p-12 w-full max-w-6xl mx-auto mt-4">
          {children}
        </div>
      </main>
    </div>
  );
}
