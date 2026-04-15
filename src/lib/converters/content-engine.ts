import { generateJSON, generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { JSDOM } from "jsdom";
import { htmlToText } from "html-to-text";

/**
 * Tiptap Extensions used across Jala Warta
 */
const extensions = [
  StarterKit,
  Image.configure({
    inline: false,
    allowBase64: true,
  }),
];

/**
 * Convert HTML string to Tiptap JSON (For WordPress Import)
 */
export function htmlToTiptap(html: string): any {
  if (!html) return { type: "doc", content: [] };
  
  // JSDOM is required as a polyfill for the browser DOM on the server
  const dom = new JSDOM(html);
  
  try {
    return generateJSON(html, extensions);
  } catch (error) {
    console.error("Error converting HTML to Tiptap JSON:", error);
    return { type: "doc", content: [{ type: "paragraph", text: "Error converting content." }] };
  }
}

/**
 * Convert Tiptap JSON to HTML string (For WordPress Export)
 */
export function tiptapToHtml(json: any): string {
  if (!json) return "";
  
  try {
    return generateHTML(json, extensions);
  } catch (error) {
    console.error("Error converting Tiptap JSON to HTML:", error);
    return "";
  }
}

/**
 * Helper to get plain text from HTML (For fallback description/SEO)
 */
export function htmlToPlain(html: string): string {
  return htmlToText(html, {
    wordwrap: false,
    selectors: [
      { selector: "img", format: "skip" },
      { selector: "a", options: { ignoreHref: true } },
    ],
  });
}

/**
 * Helper to get plain text from Tiptap JSON
 */
export function tiptapToPlain(json: any): string {
  const html = tiptapToHtml(json);
  return htmlToPlain(html);
}
