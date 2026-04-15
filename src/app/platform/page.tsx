import { db } from "@/db";
import { tenants, users, packages, plugins } from "@/db/schema";
import { count } from "drizzle-orm";

export default async function PlatformDashboardPage() {
  const [totalTenants] = await db.select({ value: count() }).from(tenants);
  const [totalUsers] = await db.select({ value: count() }).from(users);
  const [totalPackages] = await db.select({ value: count() }).from(packages);
  const [totalAddons] = await db.select({ value: count() }).from(plugins);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Platform Overview</h1>
        <p className="text-gray-500 mt-2">Selamat datang di Pusat Komando Jala Warta SaaS.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Active Tenants", val: totalTenants.value, color: "bg-blue-500" },
          { label: "Total Users", val: totalUsers.value, color: "bg-purple-500" },
          { label: "Packages/Plans", val: totalPackages.value, color: "bg-emerald-500" },
          { label: "Global Add-ons", val: totalAddons.value, color: "bg-orange-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-950 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold opacity-90 ${stat.color}`}>
              {stat.val}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{stat.val}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-950 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
           <h3 className="text-lg font-bold mb-4">Sistem Operasional</h3>
           <p className="text-sm text-gray-500">
             Menu di sidebar sebelah kiri didesain untuk mengatur fondasi arsitektur multi-tenant. 
             Pastikan Paket Berlangganan (Packages) telah dibuat sebelum Anda mengaktifkan Tenant baru.
           </p>
        </div>
      </div>
    </div>
  );
}
