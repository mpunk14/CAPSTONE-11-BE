import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  date,
  pgEnum,
  boolean,
} from 'drizzle-orm/pg-core';

// --- ENUMS ---
export const roleEnum = pgEnum('role', ['sppg', 'school']);
export const sppgStatusEnum = pgEnum('sppg_status', ['active', 'inactive', 'maintenance']);
export const reportStatusEnum = pgEnum('report_status', ['submitted', 'received', 'reviewed']);
export const notificationTypeEnum = pgEnum('notification_type', ['notification', 'feedback', 'complaint']);
export const notificationStatusEnum = pgEnum('notification_status', ['new', 'received', 'reviewed']);

// --- TABLES ---

// 1. Users (Auth & Account)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: roleEnum('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. SPPG (Dapur Umum)
export const sppg = pgTable('sppg', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(), // Relasi ke tabel users
  name: varchar('name', { length: 255 }).notNull(),
  sppgCode: varchar('sppg_code', { length: 50 }).notNull().unique(),
  address: text('address').notNull(),
  personInCharge: varchar('person_in_charge', { length: 255 }).notNull(),
  capacityPerDay: integer('capacity_per_day').default(0),
  status: sppgStatusEnum('status').default('active').notNull(),
  lat: decimal('lat', { precision: 10, scale: 7 }),
  lng: decimal('lng', { precision: 10, scale: 7 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Schools (Sekolah)
export const schools = pgTable('schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(), // Relasi ke tabel users
  sppgId: uuid('sppg_id').references(() => sppg.id), // Relasi ke SPPG partner (Bisa null jika belum punya partner)
  schoolName: varchar('school_name', { length: 255 }).notNull(),
  npsn: varchar('npsn', { length: 50 }).notNull().unique(),
  address: text('address').notNull(),
  lat: decimal('lat', { precision: 10, scale: 7 }),
  lng: decimal('lng', { precision: 10, scale: 7 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. Articles (Public Content)
export const articles = pgTable('articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  summary: text('summary').notNull(),
  content: text('content').notNull(),
  coverImageUrl: text('cover_image_url'),
  author: varchar('author', { length: 255 }),
  publishedAt: timestamp('published_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Menus (Menu Mingguan/Harian)
export const menus = pgTable('menus', {
  id: uuid('id').primaryKey().defaultRandom(),
  sppgId: uuid('sppg_id').references(() => sppg.id).notNull(),
  menuDate: date('menu_date').notNull(),
  rice: varchar('rice', { length: 255 }),
  sideDish: varchar('side_dish', { length: 255 }),
  fruit: varchar('fruit', { length: 255 }),
  calories: decimal('calories', { precision: 5, scale: 2 }),
  protein: decimal('protein', { precision: 5, scale: 2 }),
  carbohydrate: decimal('carbohydrate', { precision: 5, scale: 2 }),
  fat: decimal('fat', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 6. Meal Documentation (Bukti dari SPPG & Sekolah)
export const mealDocumentation = pgTable('meal_documentation', {
  id: uuid('id').primaryKey().defaultRandom(),
  sppgId: uuid('sppg_id').references(() => sppg.id).notNull(),
  targetSchoolId: uuid('target_school_id').references(() => schools.id), // Bisa null jika foto umum untuk semua sekolah
  productionDate: date('production_date').notNull(),
  photoUrl: text('photo_url').notNull(),
  notes: text('notes'),
  uploadedByRole: roleEnum('uploaded_by_role').notNull(), // Membedakan apakah diupload oleh SPPG atau Sekolah
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. School Reports (Laporan & Rating dari Sekolah)
export const schoolReports = pgTable('school_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').references(() => schools.id).notNull(),
  sppgId: uuid('sppg_id').references(() => sppg.id).notNull(),
  note: text('note').notNull(),
  rating: integer('rating'), // 1 sampai 5
  status: reportStatusEnum('status').default('submitted').notNull(),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 8. Notifications & Feedback
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  sppgId: uuid('sppg_id').references(() => sppg.id).notNull(),
  schoolId: uuid('school_id').references(() => schools.id).notNull(), // Sekolah yang mengirim/terkait
  type: notificationTypeEnum('type').notNull(),
  message: text('message').notNull(),
  status: notificationStatusEnum('status').default('new').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});