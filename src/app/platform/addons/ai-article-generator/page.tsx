import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { getTenantsAiUsage } from "@/app/actions/ai-generate";
import PlatformAiConfigClient from "./PlatformAiConfigClient";

export default async function PlatformAiGeneratorSettingsPage() {
  const session = await getSession();
  if (!session || !session.email) redirect("/login");

  const user = await db.query.users.findFirst({ where: eq(users.email, session.email) });
  if (!user || user.role !== "PLATFORM_ADMIN") {
      redirect("/dashboard");
  }

  const tenantsUsage = await getTenantsAiUsage();

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">
      <div className="mb-10 space-y-2">
        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-2">
            <Link href="/platform/addons" className="text-xs font-bold uppercase tracking-wider hover:underline">Platform Add-ons</Link>
            <span className="text-gray-400">/</span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">AI Article Generator</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">AI Kuota & Setup Global</h1>
        <p className="text-gray-500 dark:text-gray-400">Pantau pemakaian token AI milik tenant secara keseluruhan dan atur batas kredit untuk mencegah kebocoran biaya (Anti-boncos).</p>
      </div>

      <PlatformAiConfigClient tenants={tenantsUsage} />
      
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 p-6 rounded-3xl text-sm text-blue-800 dark:text-blue-300">
        <h4 className="font-bold uppercase tracking-widest text-[10px] mb-2">Perhatian</h4>
        <p>1 Kredit bernilai 1.000 Token. Harap pastikan batas kredit yang Anda berikan kepada tenant sesuai dengan paket langganan mereka untuk menjaga profitabilitas platform.</p>
        <p className="mt-2 text-xs opacity-80">Catatan: UI ini baru bisa mengatur konfigurasi spesifik per tenant. Pengaturan batas kredit default bawaan ditarik dari schema tabel plugins.</p>
      </div>
    </div>
  );
}
