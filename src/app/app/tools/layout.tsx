import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tools - Jala Warta",
  description: "Manajemen import dan eksport data portal berita.",
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}
