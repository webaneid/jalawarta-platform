"use client";

import { useTransition } from "react";
import { deletePageAction } from "@/app/actions/pages";

export default function DeletePageButton({ id, tenantId }: { id: string; tenantId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Hapus halaman ini? Tindakan tidak bisa dibatalkan.")) return;
    startTransition(async () => {
      await deletePageAction(id, tenantId);
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-40"
    >
      {isPending ? "Menghapus..." : "Delete"}
    </button>
  );
}
