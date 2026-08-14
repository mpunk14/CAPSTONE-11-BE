CREATE TYPE "public"."cv_analysis_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."menu_upload_status" AS ENUM('success', 'failed');--> statement-breakpoint
CREATE TABLE "cv_analysis_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documentation_id" uuid NOT NULL,
	"status" "cv_analysis_status" DEFAULT 'pending' NOT NULL,
	"detected_foods" text,
	"estimated_calories" numeric(7, 2),
	"estimated_protein" numeric(5, 2),
	"estimated_fat" numeric(5, 2),
	"estimated_carbs" numeric(5, 2),
	"match_score" numeric(5, 2),
	"is_flagged" boolean DEFAULT false NOT NULL,
	"flag_reason" text,
	"processing_time_ms" integer,
	"error_message" text,
	"analyzed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_upload_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sppg_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"status" "menu_upload_status" NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meal_documentation" ADD COLUMN "analysis_status" "cv_analysis_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "fiber" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "photo_url" text;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "student_count" integer;--> statement-breakpoint
ALTER TABLE "sppg" ADD COLUMN "photo_url" text;--> statement-breakpoint
ALTER TABLE "sppg" ADD COLUMN "distributed_portions" integer;--> statement-breakpoint
ALTER TABLE "sppg" ADD COLUMN "staff_count" integer;--> statement-breakpoint
ALTER TABLE "cv_analysis_results" ADD CONSTRAINT "cv_analysis_results_documentation_id_meal_documentation_id_fk" FOREIGN KEY ("documentation_id") REFERENCES "public"."meal_documentation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_upload_history" ADD CONSTRAINT "menu_upload_history_sppg_id_sppg_id_fk" FOREIGN KEY ("sppg_id") REFERENCES "public"."sppg"("id") ON DELETE no action ON UPDATE no action;