import SignOutButton from "@/components/SignOutButton";
import SidebarNav from "@/components/SidebarNav";
import Link from "next/link";
import { auth } from "@/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user as any;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-black overflow-y-auto flex-shrink-0 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <Link href="/">
            <span className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent tracking-tight">
              Jala Warta
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <SidebarNav role={user?.role} />
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-black flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.displayName?.[0] || user?.name?.[0] || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user?.displayName || user?.name || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto w-full">
        <header className="h-16 flex items-center px-8 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black sticky top-0 z-10">
          <div className="flex-1" />
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
