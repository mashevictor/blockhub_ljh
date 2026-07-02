import { pgTable, serial, timestamp, varchar, text, integer, boolean, jsonb, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// L1: Agents - 7 PaaS Agent Runtime
export const agents = pgTable(
  "agents",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    agent_key: varchar("agent_key", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 50 }),
    color: varchar("color", { length: 20 }),
    pipeline: text("pipeline"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    config: jsonb("config"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("agents_key_idx").on(table.agent_key),
    index("agents_status_idx").on(table.status),
  ]
);

// L2: Capabilities - 36 Capability Atomic Functions
export const capabilities = pgTable(
  "capabilities",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    capability_key: varchar("capability_key", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    agent_id: varchar("agent_id", { length: 36 }).notNull().references(() => agents.id),
    category: varchar("category", { length: 50 }),
    widget_type: varchar("widget_type", { length: 50 }),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("capabilities_key_idx").on(table.capability_key),
    index("capabilities_agent_idx").on(table.agent_id),
  ]
);

// L3: Scenarios - 65 Office + 49 Industry Scenarios
export const scenarios = pgTable(
  "scenarios",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    scenario_key: varchar("scenario_key", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }).notNull(),
    sub_category: varchar("sub_category", { length: 50 }),
    pack: varchar("pack", { length: 30 }),
    type: varchar("type", { length: 20 }).notNull(),
    primary_agent: varchar("primary_agent", { length: 50 }),
    required_caps: jsonb("required_caps"),
    form_schema: jsonb("form_schema"),
    workflow_seed: jsonb("workflow_seed"),
    is_standard: boolean("is_standard").default(true),
    sort_order: integer("sort_order").default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("scenarios_key_idx").on(table.scenario_key),
    index("scenarios_type_idx").on(table.type),
    index("scenarios_category_idx").on(table.category),
    index("scenarios_pack_idx").on(table.pack),
  ]
);

// L4: Applications - Created by Smart Creation Wizard
export const applications = pgTable(
  "applications",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    industry: varchar("industry", { length: 50 }),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    selected_scenarios: jsonb("selected_scenarios"),
    page_schema: jsonb("page_schema"),
    publish_url: text("publish_url"),
    created_by: varchar("created_by", { length: 100 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("applications_status_idx").on(table.status),
    index("applications_industry_idx").on(table.industry),
  ]
);

// Conversations for Chat Agent
export const conversations = pgTable(
  "conversations",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 200 }),
    agent_id: varchar("agent_id", { length: 36 }).references(() => agents.id),
    app_id: varchar("app_id", { length: 36 }).references(() => applications.id),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    metadata: jsonb("metadata"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("conversations_agent_idx").on(table.agent_id),
    index("conversations_app_idx").on(table.app_id),
  ]
);

// Messages in Conversations
export const messages = pgTable(
  "messages",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    conversation_id: varchar("conversation_id", { length: 36 }).notNull().references(() => conversations.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("messages_conv_idx").on(table.conversation_id),
    index("messages_created_idx").on(table.created_at),
  ]
);

// Knowledge Bases
export const knowledge_bases = pgTable(
  "knowledge_bases",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    app_id: varchar("app_id", { length: 36 }).references(() => applications.id),
    doc_count: integer("doc_count").default(0),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("kb_app_idx").on(table.app_id),
  ]
);

// Documents in Knowledge Base
export const documents = pgTable(
  "documents",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    kb_id: varchar("kb_id", { length: 36 }).notNull().references(() => knowledge_bases.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    content: text("content"),
    file_url: text("file_url"),
    file_type: varchar("file_type", { length: 50 }),
    file_size: integer("file_size"),
    chunk_count: integer("chunk_count").default(0),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("documents_kb_idx").on(table.kb_id),
    index("documents_status_idx").on(table.status),
  ]
);

// Approval Flows
export const approvals = pgTable(
  "approvals",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 200 }).notNull(),
    app_id: varchar("app_id", { length: 36 }).references(() => applications.id),
    scenario_key: varchar("scenario_key", { length: 50 }),
    form_data: jsonb("form_data"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    current_step: integer("current_step").default(1),
    total_steps: integer("total_steps").default(1),
    applicant: varchar("applicant", { length: 100 }),
    approvers: jsonb("approvers"),
    comments: jsonb("comments"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("approvals_app_idx").on(table.app_id),
    index("approvals_status_idx").on(table.status),
    index("approvals_created_idx").on(table.created_at),
  ]
);

// Notifications
export const notifications = pgTable(
  "notifications",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content"),
    type: varchar("type", { length: 30 }).notNull(),
    channel: varchar("channel", { length: 30 }).notNull().default("inapp"),
    recipient: varchar("recipient", { length: 100 }),
    app_id: varchar("app_id", { length: 36 }).references(() => applications.id),
    is_read: boolean("is_read").default(false),
    metadata: jsonb("metadata"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("notifications_type_idx").on(table.type),
    index("notifications_recipient_idx").on(table.recipient),
    index("notifications_read_idx").on(table.is_read),
  ]
);

// Dashboard / Report Data
export const report_configs = pgTable(
  "report_configs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 200 }).notNull(),
    app_id: varchar("app_id", { length: 36 }).references(() => applications.id),
    chart_type: varchar("chart_type", { length: 30 }),
    data_source: jsonb("data_source"),
    config: jsonb("config"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("reports_app_idx").on(table.app_id),
  ]
);
