import {
  pgTable,
  text,
  timestamp,
  jsonb,
  primaryKey,
  integer,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccount } from "next-auth/adapters";

// --- NEXT-AUTH V5 SCHEMA ---
export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"), // Nama Lengkap
  username: text("username").unique(), // WordPress-style username
  displayName: text("display_name"), // Publicly visible name
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"), // Foto Profil
  password: text("password"), // Secure Hash
  bio: text("bio"),
  socialLinks: jsonb("social_links"),
  role: text("role").default("TENANT_OWNER"), // Legacy global role (optional)
  isActive: boolean("is_active").default(true), // Status aktif/non-aktif
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// --- JALA WARTA MULTI-TENANT SAAS SCHEMA ---

// Tabel kredensial API global — dikelola oleh PLATFORM_ADMIN, dikonsumsi oleh Add-ons
export const apiCredentials = pgTable("api_credentials", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  category: text("category").notNull(), // cth: 'ai_text_generation', 'payment_gateway', 'analytics'
  provider: text("provider").notNull(), // cth: 'gemini', 'midtrans', 'meta'
  apiKey: text("api_key").notNull(),    // SELALU tersimpan dalam bentuk terenkripsi AES-256
  apiSecret: text("api_secret"),        // Terenkripsi AES-256, opsional (bila ada Client Secret)
  displayName: text("display_name").notNull(), // Label antarmuka, cth: "Gemini Pro API"
  description: text("description"),    // Catatan admin
  isActive: boolean("is_active").default(true),
  lastVerifiedAt: timestamp("last_verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  categoryProviderIdx: uniqueIndex("api_cred_category_provider_idx").on(t.category, t.provider),
}));

export const packages = pgTable("packages", {
  id: text("id").primaryKey(), // misal: "free", "pro", "enterprise"
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull().default(0), // Harga dasar (0 = gratis)
  limits: jsonb("limits").notNull().default({ maxUsers: 1, maxPosts: 10, maxStorage: 52428800 }), // Contoh validasi limits
  features: jsonb("features").notNull().default({ allowedModules: [], allowedAddons: [] }), // Fitur yang diaktifkan
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subdomain: text("subdomain").unique().notNull(), // missal: namaberita
  customDomain: text("custom_domain").unique(),    // misal: namaberita.com
  siteName: text("site_name"),
  themeId: text("theme_id").default("modern-light"),
  analyticsScript: text("analytics_script"),
  schemaConfig: jsonb("schema_config"), // Untuk konfig warna/bahasa dll
  subscriptionId: text("subscription_id").references(() => packages.id, { onDelete: "set null" }), // ID paket / internal
  subscriptionStatus: text("subscription_status").default("TRIAL"), // ACTIVE, EXPIRED, SUSPENDED
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Tenant Members Table
 * Maps users to tenants with specific roles (WordPress style)
 */
export const tenantMembers = pgTable("tenant_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("SUBSCRIBER"), // SUPER_ADMIN, EDITOR, WRITER, SUBSCRIBER
  createdAt: timestamp("created_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }), // Tracking ownership
  slug: text("slug").notNull(),
  title: jsonb("title"), // Menunjang multi-bahasa: { id: "", en: "" }
  content: jsonb("content"),
  featuredImage: text("featured_image"),
  status: text("status").default("DRAFT"), // DRAFT, PUBLISHED
  seoConfig: jsonb("seo_config"), // focusKeyword, seoTitle, seoDescription
  createdAt: timestamp("created_at").defaultNow(),
});

export const pages = pgTable("pages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }), // Tracking ownership
  slug: text("slug").notNull(),
  title: jsonb("title"),
  content: jsonb("content"),
  featuredImage: text("featured_image"),
  seoConfig: jsonb("seo_config"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const media = pgTable("media", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  altText: text("alt_text"),
  caption: text("caption"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postCategories = pgTable(
  "post_categories",
  {
    postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.postId, t.categoryId] }) })
);

// ── Tags ─────────────────────────────────────────────────────
export const tags = pgTable("tags", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postTags = pgTable(
  "post_tags",
  {
    postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.postId, t.tagId] }) })
);

// ── Revisions ────────────────────────────────────────────────
export const postRevisions = pgTable("post_revisions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  title: jsonb("title"),
  content: jsonb("content"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Audit Logs ───────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), // e.g., "CREATE_POST", "UPDATE_PAGE", "LOGIN"
  entityType: text("entity_type"), // e.g., "post", "page", "user"
  entityId: text("entity_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Comments ─────────────────────────────────────────────────
export const comments = pgTable("comments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }), // Nullable for guests
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  content: text("content").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING, APPROVED, SPAM, TRASH
  parentId: text("parent_id").references((): any => comments.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Presence ──────────────────────────────────────────────────
export const presence = pgTable("presence", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastActive: timestamp("last_active").defaultNow().notNull(),
});

// ── Plugins ──────────────────────────────────────────────────
export const plugins = pgTable("plugins", {
  id: text("id").primaryKey(), // e.g. "google-analytics"
  name: text("name").notNull(),
  description: text("description"),
  configSchema: jsonb("config_schema"), // JSON Schema definition for config fields
  createdAt: timestamp("created_at").defaultNow(),
});

export const tenantPlugins = pgTable(
  "tenant_plugins",
  {
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    pluginId: text("plugin_id")
      .notNull()
      .references(() => plugins.id, { onDelete: "cascade" }),
    config: jsonb("config"), // Instanced configuration (e.g. { measurementId: "G-XXX" })
    status: text("status").notNull().default("INACTIVE"), // ACTIVE, INACTIVE
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tenantId, t.pluginId] }),
  })
);

// ── Contact Forms Add-on ──────────────────────────────────────
export const contactForms = pgTable("contact_forms", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  fields: jsonb("fields").notNull().default([]), // Dynamic fields: [{id, type, label, required, ...}]
  settings: jsonb("settings").notNull().default({}), // Notifications, success msg, etc
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contactSubmissions = pgTable("contact_submissions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  formId: text("form_id").notNull().references(() => contactForms.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(), // Submitted values: { "f1": "John Doe", "f2": "..." }
  status: text("status").notNull().default("UNREAD"), // UNREAD, READ, SPAM, ARCHIVED
  createdAt: timestamp("created_at").defaultNow(),
});

// ── AI Insights Add-on ───────────────────────────────────────
export const insights = pgTable("insights", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  sourceUrl: text("source_url"),
  sourceType: text("source_type").default("manual"), // manual, news_insight, social_insight
  status: text("status").default("PENDING"), // PENDING, PROCESSING, COMPLETED, FAILED
  articleCount: integer("article_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const newsSearches = pgTable("news_searches", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  source: text("source"),
  theme: text("theme"),
  timeRange: text("time_range"),
  language: text("language"),
  country: text("country"),
  resultsCount: integer("results_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const newsResults = pgTable("news_results", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  searchId: text("search_id").notNull().references(() => newsSearches.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  snippet: text("snippet"),
  publishDate: text("publish_date"), // Format text atau iso date yyyy-mm-dd
  position: integer("position"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const socialSearches = pgTable("social_searches", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  keyword: text("keyword"),
  platform: text("platform").notNull(), // tiktok, twitter, google_trends
  countryCode: text("country_code"),
  language: text("language"),
  totalResults: integer("total_results").default(0),
  status: text("status").default("COMPLETED"), // PENDING, PROCESSING, COMPLETED, FAILED
  createdAt: timestamp("created_at").defaultNow(),
});

export const socialResults = pgTable("social_results", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  searchId: text("search_id").notNull().references(() => socialSearches.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  content: text("content"),
  author: text("author"),
  link: text("link"),
  engagementTotal: integer("engagement_total").default(0), // Agregasi internal UI (likes+shares) untuk rank
  sentiment: text("sentiment").default("unknown"),
  isTrending: boolean("is_trending").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentStrategies = pgTable("content_strategies", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  searchId: text("search_id").notNull().references(() => socialSearches.id, { onDelete: "cascade" }),
  strategyType: text("strategy_type").notNull(), // roundup, hybrid, deep_dive_all
  selectedTopics: jsonb("selected_topics").notNull().default([]), // array of socialResult ids / urls
  expectedArticles: integer("expected_articles").default(1),
  status: text("status").default("PENDING"), // PENDING, GENERATING, COMPLETED, FAILED
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Relasi ────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  tenantMembers: many(tenantMembers),
  authoredPosts: many(posts),
  authoredPages: many(pages),
}));

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  owner: one(users, { fields: [tenants.ownerId], references: [users.id] }),
  package: one(packages, { fields: [tenants.subscriptionId], references: [packages.id] }),
  members: many(tenantMembers),
  posts: many(posts),
  pages: many(pages),
  media: many(media),
  categories: many(categories),
  tags: many(tags),
}));

export const packagesRelations = relations(packages, ({ many }) => ({
  tenants: many(tenants),
}));

export const tenantMembersRelations = relations(tenantMembers, ({ one }) => ({
  user: one(users, { fields: [tenantMembers.userId], references: [users.id] }),
  tenant: one(tenants, { fields: [tenantMembers.tenantId], references: [tenants.id] }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  tenant: one(tenants, { fields: [posts.tenantId], references: [tenants.id] }),
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  postCategories: many(postCategories),
  postTags: many(postTags),
}));

export const pagesRelations = relations(pages, ({ one }) => ({
  tenant: one(tenants, { fields: [pages.tenantId], references: [tenants.id] }),
  author: one(users, { fields: [pages.authorId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  tenant: one(tenants, { fields: [categories.tenantId], references: [tenants.id] }),
  postCategories: many(postCategories),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  tenant: one(tenants, { fields: [tags.tenantId], references: [tenants.id] }),
  postTags: many(postTags),
}));

export const postCategoriesRelations = relations(postCategories, ({ one }) => ({
  post: one(posts, { fields: [postCategories.postId], references: [posts.id] }),
  category: one(categories, { fields: [postCategories.categoryId], references: [categories.id] }),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
    post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
    tag: one(tags, { fields: [postTags.tagId], references: [tags.id] }),
  })
);

export const postRevisionsRelations = relations(postRevisions, ({ one }) => ({
  post: one(posts, { fields: [postRevisions.postId], references: [posts.id] }),
  author: one(users, { fields: [postRevisions.authorId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [auditLogs.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  tenant: one(tenants, { fields: [comments.tenantId], references: [tenants.id] }),
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "replies",
  }),
  replies: many(comments, { relationName: "replies" }),
}));

export const pluginsRelations = relations(plugins, ({ many }) => ({
  tenantPlugins: many(tenantPlugins),
}));

export const tenantPluginsRelations = relations(tenantPlugins, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantPlugins.tenantId], references: [tenants.id] }),
  plugin: one(plugins, { fields: [tenantPlugins.pluginId], references: [plugins.id] }),
}));

export const presenceRelations = relations(presence, ({ one }) => ({
  tenant: one(tenants, { fields: [presence.tenantId], references: [tenants.id] }),
  post: one(posts, { fields: [presence.postId], references: [posts.id] }),
  user: one(users, { fields: [presence.userId], references: [users.id] }),
}));

// ── AI Insights Relations ────────────────────────────────────────
export const insightsRelations = relations(insights, ({ one }) => ({
  tenant: one(tenants, { fields: [insights.tenantId], references: [tenants.id] }),
}));

export const newsSearchesRelations = relations(newsSearches, ({ one, many }) => ({
  tenant: one(tenants, { fields: [newsSearches.tenantId], references: [tenants.id] }),
  results: many(newsResults),
}));

export const newsResultsRelations = relations(newsResults, ({ one }) => ({
  search: one(newsSearches, { fields: [newsResults.searchId], references: [newsSearches.id] }),
}));

export const socialSearchesRelations = relations(socialSearches, ({ one, many }) => ({
  tenant: one(tenants, { fields: [socialSearches.tenantId], references: [tenants.id] }),
  results: many(socialResults),
  strategies: many(contentStrategies),
}));

export const socialResultsRelations = relations(socialResults, ({ one }) => ({
  search: one(socialSearches, { fields: [socialResults.searchId], references: [socialSearches.id] }),
}));

export const contentStrategiesRelations = relations(contentStrategies, ({ one }) => ({
  tenant: one(tenants, { fields: [contentStrategies.tenantId], references: [tenants.id] }),
  search: one(socialSearches, { fields: [contentStrategies.searchId], references: [socialSearches.id] }),
}));
