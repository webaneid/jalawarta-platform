import { notFound } from "next/navigation";

export default async function TenantPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const domain = (await params).domain;
  const decodedDomain = decodeURIComponent(domain);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white font-sans text-gray-900 dark:bg-black dark:text-gray-100">
      <main className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-blue-600">
          {decodedDomain}
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Domain ini berhasil di-routing oleh Middleware Next.js Multi-Tenant.
        </p>
        <div className="mt-8">
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/40 dark:text-blue-300">
            Jala Warta Tenant Engine v0.0.1
          </span>
        </div>
      </main>
    </div>
  );
}
