import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const leads = sqliteTable("leads",{
  id: integer("id").primaryKey({autoIncrement:true}),
  businessName:text("business_name").notNull(), firstName:text("first_name").notNull(),
  email:text("email").notNull(), phone:text("phone"), website:text("website"),
  industry:text("industry").notNull(), challenge:text("challenge"), sourcePath:text("source_path"),
  status:text("status").notNull().default("new"), createdAt:integer("created_at",{mode:"timestamp"}).notNull().$defaultFn(()=>new Date()),
});
