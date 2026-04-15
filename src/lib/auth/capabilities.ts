/**
 * Definisi Capability berbasis WordPress Roles.
 */

export type Role = "SUPER_ADMIN" | "EDITOR" | "WRITER" | "SUBSCRIBER";

export type Capability =
  | "manage_settings"    // Dashboard settings, themes
  | "manage_users"       // Add/remove/edit users
  | "publish_posts"      // Change status to PUBLISHED
  | "edit_posts"         // Edit own posts
  | "edit_others_posts"  // Edit posts by others
  | "delete_posts"       // Delete own posts
  | "delete_others_posts"// Delete others' posts
  | "upload_media"       // Use media library
  | "manage_taxonomy";   // Manage categories & tags

// Map Role -> Capabilities
export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  SUPER_ADMIN: [
    "manage_settings",
    "manage_users",
    "publish_posts",
    "edit_posts",
    "edit_others_posts",
    "delete_posts",
    "delete_others_posts",
    "upload_media",
    "manage_taxonomy",
  ],
  EDITOR: [
    "publish_posts",
    "edit_posts",
    "edit_others_posts",
    "delete_posts",
    "delete_others_posts",
    "upload_media",
    "manage_taxonomy",
  ],
  WRITER: [
    "publish_posts",
    "edit_posts",
    "delete_posts",
    "upload_media",
  ],
  SUBSCRIBER: [],
};

/**
 * Cek apakah role tertentu memiliki capability tertentu.
 */
export function hasCapability(role: Role, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}
