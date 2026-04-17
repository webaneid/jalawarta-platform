import { GoogleAnalyticsPlugin } from "@/plugins/google-analytics";
import { MetaPixelPlugin } from "@/plugins/meta-pixel";
import React from "react";

// Tipe untuk definisi plugin
export type PluginDefinition = {
  id: string;
  name: string;
  description?: string;
  component: React.ComponentType<any>;
  supportedSlots: ("header" | "footer" | "sidebar" | "content")[];
};

// Daftar resmi plugin yang terdaftar di sistem
export const PLUGIN_REGISTRY: Record<string, PluginDefinition> = {
  "meta-pixel": {
    id: "meta-pixel",
    name: "Meta Pixel Advanced",
    description: "Analisis konversi dan audience retargeting (Facebook Pixel).",
    component: MetaPixelPlugin,
    supportedSlots: ["header"],
  },
  "google-search-analytics": {
    id: "google-search-analytics",
    name: "Google Search & Analytics",
    description: "Pelacakan pengunjung (GA4) dan verifikasi kepemilikan Google Search Console.",
    component: GoogleAnalyticsPlugin,
    supportedSlots: ["header"],
  },
  "advanced-contact-form": {
    id: "advanced-contact-form",
    name: "Contact Form Advanced",
    description: "Formulir kontak dinamis dengan visual builder dan manajemen pesan masuk.",
    component: () => null, // Placeholder
    supportedSlots: ["content"],
  },
  "ai-insights": {
    id: "ai-insights",
    name: "AI Content Insights",
    description: "Mesin pencari tren berita dan sosial media cerdas untuk riset konten otomatis.",
    component: () => null, // Tidak ada injeksi publik — fitur berjalan di dasbor tenant
    supportedSlots: [],
  },
  // Plugin lain bisa didaftarkan di sini
};

export function getPluginById(id: string) {
  return PLUGIN_REGISTRY[id];
}
