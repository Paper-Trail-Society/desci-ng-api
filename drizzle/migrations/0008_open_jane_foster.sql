CREATE TABLE "desci"."paystack_donations" (
	"id" serial PRIMARY KEY NOT NULL,
	"donor_id" text,
	"donor_name" varchar(255) NOT NULL,
	"donor_email" varchar NOT NULL,
	"amount" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"payment_reference" varchar NOT NULL,
	"payment_status" varchar(10) NOT NULL,
	"payment_method" varchar(10) NOT NULL,
	"paid_at" timestamp NOT NULL,
	"transaction_data" jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "paystack_donations_payment_reference_unique" UNIQUE("payment_reference")
);
--> statement-breakpoint
ALTER TABLE "desci"."paystack_donations" ADD CONSTRAINT "paystack_donations_donor_id_users_id_fk" FOREIGN KEY ("donor_id") REFERENCES "desci"."users"("id") ON DELETE no action ON UPDATE no action;
COMMENT ON COLUMN "desci"."paystack_donations"."amount" IS 'Amount is stored in the lowest denomination of the currency';
