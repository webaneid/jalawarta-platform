"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Role, hasCapability } from "@/lib/auth/capabilities";

type NavItem = {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: {
    label: string;
    href: string;
    badge?: string;
  }[];
  badge?: string;
  disabled?: boolean;
  requiredCapability?: any; // Import would cause issues in type unless strictly matched
};

const NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "Posts",
    requiredCapability: "edit_posts",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
    children: [
      { label: "All Posts", href: "/posts" },
      { label: "Create New", href: "/posts/editor" },
      { label: "Categories", href: "/categories" },
      { label: "Tags", href: "/tags" },
    ],
  },
  {
    label: "Insights",
    requiredCapability: "edit_posts",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    children: [
      { label: "Saved Insights", href: "/insights" },
      { label: "News Insight", href: "/insights/news" },
      { label: "Social Insight", href: "/insights/social" },
      { label: "Kompetitor Monitor", href: "/insights/competitor" },
    ],
  },
  {
    label: "Pages",
    requiredCapability: "manage_taxonomy",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    children: [
      { label: "All Pages", href: "/pages" },
      { label: "Create New", href: "/pages/editor" },
      { label: "Page Templates", href: "#", badge: "Soon" },
    ],
  },
  {
    label: "Media Library",
    href: "/media",
    requiredCapability: "upload_media",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Tools",
    href: "/tools",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: "Users",
    href: "/users",
    requiredCapability: "manage_users",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    label: "Add-Ons",
    href: "/addons",
    requiredCapability: "manage_settings",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 11-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ),
  },
];

export default function SidebarNav({ role = "SUBSCRIBER", activeAddonIds = [] }: { role?: Role; activeAddonIds?: string[] }) {
  const pathname = usePathname();

  // Filter NAV based on capabilities and active addons
  const filteredNav = NAV.filter(item => {
    if (item.label === "Insights" && !activeAddonIds.includes("ai-insights")) return false;
    if (!item.requiredCapability) return true;
    return hasCapability(role, item.requiredCapability);
  });

  // Tentukan grup mana yang harus terbuka secara default berdasarkan path aktif
  function isGroupActive(item: NavItem) {
    if (!item.children) return false;
    return item.children.some((c) => pathname.startsWith(c.href) && c.href !== "#");
  }

  const [openGroups, setOpenGroups] = useState<string[]>(
    NAV.filter(isGroupActive).map((i) => i.label)
  );

  function toggleGroup(label: string) {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <ul className="space-y-0.5 px-3">
      {filteredNav.map((item) => {
        // ── Item dengan submenu ──────────────────────────────
        if (item.children) {
          const isOpen = openGroups.includes(item.label);
          const groupActive = isGroupActive(item);
          return (
            <li key={item.label}>
              <button
                onClick={() => toggleGroup(item.label)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left group ${
                  groupActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-900"
                }`}
              >
                <span className={groupActive ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500"}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {/* Chevron */}
                <svg
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Submenu */}
              {isOpen && (
                <ul className="mt-0.5 ml-4 pl-4 border-l border-gray-200 dark:border-gray-800 space-y-0.5 pb-1">
                  {item.children.map((child) => (
                    <li key={child.label}>
                      {child.href === "#" || child.badge ? (
                        <span className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed select-none">
                          {child.label}
                          {child.badge && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 font-medium">
                              {child.badge}
                            </span>
                          )}
                        </span>
                      ) : (
                        <Link
                          href={child.href}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive(child.href)
                              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold"
                              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-900"
                          }`}
                        >
                          {child.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        }

        // ── Item tunggal ────────────────────────────────────
        const active = item.href ? isActive(item.href) : false;
        return (
          <li key={item.label}>
            {item.disabled ? (
              <span className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed select-none">
                <span className="text-gray-300 dark:text-gray-700">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 font-medium">
                    {item.badge}
                  </span>
                )}
              </span>
            ) : (
              <Link
                href={item.href!}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                  active
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-900"
                }`}
              >
                <span className={active ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500"}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 font-medium">
                    {item.badge}
                  </span>
                )}
              </Link>
            )}
          </li>
        );
      })}

      {/* Settings — selalu di bawah */}
      {hasCapability(role, "manage_settings") && (
        <li className="pt-4">
          <div className="px-3 py-1 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">System</span>
          </div>
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
              pathname.startsWith("/settings")
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-900"
            }`}
          >
            <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        </li>
      )}
    </ul>
  );
}
