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
export const cvAnalysisStatusEnum = pgEnum('cv_analysis_status', ['pending', 'processing', 'completed', 'failed']);

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
  photoUrl: text('photo_url'),
  personInCharge: varchar('person_in_charge', { length: 255 }).notNull(),
  capacityPerDay: integer('capacity_per_day').default(0),
  status: sppgStatusEnum('status').default('active').notNull(),
  lat: decimal('lat', { precision: 10, scale: 7 }),
  lng: decimal('lng', { precision: 10, scale: 7 }),
  distributedPortions: integer('distributed_portions'),
  staffCount: integer('staff_count'),
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
  photoUrl: text('photo_url'),
  lat: decimal('lat', { precision: 10, scale: 7 }),
  lng: decimal('lng', { precision: 10, scale: 7 }),
  studentCount: integer('student_count'),
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
  menuImageUrl: text('image_url'),
  rice: varchar('rice', { length: 255 }),
  sideDish: varchar('side_dish', { length: 255 }),
  fruit: varchar('fruit', { length: 255 }),
  calories: decimal('calories', { precision: 5, scale: 2 }),
  protein: decimal('protein', { precision: 5, scale: 2 }),
  carbohydrate: decimal('carbohydrate', { precision: 5, scale: 2 }),
  fat: decimal('fat', { precision: 5, scale: 2 }),
  fiber: decimal('fiber', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const menuUploadStatusEnum = pgEnum('menu_upload_status', ['success', 'failed']);

export const menuUploadHistory = pgTable('menu_upload_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  sppgId: uuid('sppg_id').references(() => sppg.id).notNull(),
  fileName: text('file_name').notNull(),
  status: menuUploadStatusEnum('status').notNull(),
  rowCount: integer('row_count').default(0).notNull(),
  errorMessage: text('error_message'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
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
  analysisStatus: cvAnalysisStatusEnum('analysis_status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6b. CV Analysis Results (Hasil analisis computer vision per dokumentasi)
export const cvAnalysisResults = pgTable('cv_analysis_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentationId: uuid('documentation_id')
    .references(() => mealDocumentation.id)
    .notNull(),
  status: cvAnalysisStatusEnum('status').default('pending').notNull(),
  // JSON string: [{name: string, confidence: number, portionGrams: number}]
  detectedFoods: text('detected_foods'),
  estimatedCalories: decimal('estimated_calories', { precision: 7, scale: 2 }),
  estimatedProtein: decimal('estimated_protein', { precision: 5, scale: 2 }),
  estimatedFat: decimal('estimated_fat', { precision: 5, scale: 2 }),
  estimatedCarbs: decimal('estimated_carbs', { precision: 5, scale: 2 }),
  // 0–100 cross-check score vs. SPPG-reported menu
  matchScore: decimal('match_score', { precision: 5, scale: 2 }),
  isFlagged: boolean('is_flagged').default(false).notNull(),
  flagReason: text('flag_reason'),
  processingTimeMs: integer('processing_time_ms'),
  errorMessage: text('error_message'),
  analyzedAt: timestamp('analyzed_at'),
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
