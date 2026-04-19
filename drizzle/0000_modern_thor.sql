CREATE TYPE "public"."notification_status" AS ENUM('new', 'received', 'reviewed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('notification', 'feedback', 'complaint');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('submitted', 'received', 'reviewed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('sppg', 'school');--> statement-breakpoint
CREATE TYPE "public"."sppg_status" AS ENUM('active', 'inactive', 'maintenance');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"summary" text NOT NULL,
	"content" text NOT NULL,
	"cover_image_url" text,
	"author" varchar(255),
	"published_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_documentation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sppg_id" uuid NOT NULL,
	"target_school_id" uuid,
	"production_date" date NOT NULL,
	"photo_url" text NOT NULL,
	"notes" text,
	"uploaded_by_role" "role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sppg_id" uuid NOT NULL,
	"menu_date" date NOT NULL,
	"rice" varchar(255),
	"side_dish" varchar(255),
	"fruit" varchar(255),
	"calories" numeric(5, 2),
	"protein" numeric(5, 2),
	"carbohydrate" numeric(5, 2),
	"fat" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sppg_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"message" text NOT NULL,
	"status" "notification_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"sppg_id" uuid NOT NULL,
	"note" text NOT NULL,
	"rating" integer,
	"status" "report_status" DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sppg_id" uuid,
	"school_name" varchar(255) NOT NULL,
	"npsn" varchar(50) NOT NULL,
	"address" text NOT NULL,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "schools_npsn_unique" UNIQUE("npsn")
);
--> statement-breakpoint
CREATE TABLE "sppg" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"sppg_code" varchar(50) NOT NULL,
	"address" text NOT NULL,
	"person_in_charge" varchar(255) NOT NULL,
	"capacity_per_day" integer DEFAULT 0,
	"status" "sppg_status" DEFAULT 'active' NOT NULL,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sppg_sppg_code_unique" UNIQUE("sppg_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "meal_documentation" ADD CONSTRAINT "meal_documentation_sppg_id_sppg_id_fk" FOREIGN KEY ("sppg_id") REFERENCES "public"."sppg"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_documentation" ADD CONSTRAINT "meal_documentation_target_school_id_schools_id_fk" FOREIGN KEY ("target_school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menus" ADD CONSTRAINT "menus_sppg_id_sppg_id_fk" FOREIGN KEY ("sppg_id") REFERENCES "public"."sppg"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sppg_id_sppg_id_fk" FOREIGN KEY ("sppg_id") REFERENCES "public"."sppg"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_reports" ADD CONSTRAINT "school_reports_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_reports" ADD CONSTRAINT "school_reports_sppg_id_sppg_id_fk" FOREIGN KEY ("sppg_id") REFERENCES "public"."sppg"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_sppg_id_sppg_id_fk" FOREIGN KEY ("sppg_id") REFERENCES "public"."sppg"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sppg" ADD CONSTRAINT "sppg_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;