import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50 font-sans">
      <main className="flex w-full max-w-4xl flex-col items-center justify-center space-y-8 px-6 text-center">
        <h1 className="bg-gradient-to-r from-blue-700 to-indigo-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl">
          Jala Warta SaaS
        </h1>
        <p className="max-w-2xl text-lg text-gray-600 dark:text-gray-400 sm:text-xl">
          Platform web berita multi-tenant tercanggih. Super cepat, didukung arsitektur modern TypeScript dan Bun.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <a
            href="/daftar"
            className="rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-blue-600 transition-all hover:bg-blue-700 hover:ring-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Mulai Sekarang ➞
          </a>
          <a
            href="http://app.localhost:3000"
            className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 transition-all hover:bg-gray-50 dark:bg-gray-900 dark:text-white dark:ring-gray-700 dark:hover:bg-gray-800"
          >
            Masuk Tenant
          </a>
        </div>
      </main>
    </div>
  );
}

