import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import AddonNodeView from "../views/AddonNodeView";

export interface AddonBlockOptions {
  HTMLAttributes: Record<string, any>;
}

export const AddonBlockExtension = Node.create<AddonBlockOptions>({
  name: "addonBlock",
  group: "block",
  atom: true, // This node is a single uneditable block in the editor

  addOptions() {
    return {
      HTMLAttributes: {
        class: "addon-block-wrapper",
      },
    };
  },

  addAttributes() {
    return {
      addonType: {
        default: null,
      },
      addonId: {
        default: null,
      },
      title: {
        default: "Plugin Block",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "plugin-block",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["plugin-block", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AddonNodeView);
  },

  addCommands() {
    return {
      insertAddonBlock:
        (options: { addonType: string; addonId: string; title: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});

// Agar command bisa terbaca di typescript Tiptap
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    addonBlock: {
      insertAddonBlock: (options: { addonType: string; addonId: string; title: string }) => ReturnType;
    };
  }
}
