CREATE TABLE "api_tokens" (
	"name" text PRIMARY KEY NOT NULL,
	"token_b64" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"tipo" text,
	"anime" text,
	"rareza" text,
	"price" integer NOT NULL,
	"previous_price" integer,
	"claimed_by" text,
	"for_sale" boolean DEFAULT false,
	"seller" text,
	"votes" integer DEFAULT 0,
	"last_removed_time" bigint
);
--> statement-breakpoint
CREATE TABLE "chat_memory" (
	"chat_id" text PRIMARY KEY NOT NULL,
	"history" jsonb,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" text PRIMARY KEY NOT NULL,
	"is_group" boolean DEFAULT true,
	"timestamp" bigint,
	"is_active" boolean DEFAULT true,
	"bot_id" text,
	"joined" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "group_settings" (
	"group_id" text PRIMARY KEY NOT NULL,
	"welcome" boolean DEFAULT true,
	"detect" boolean DEFAULT true,
	"antifake" boolean DEFAULT false,
	"antilink" boolean DEFAULT false,
	"antilink2" boolean DEFAULT false,
	"modohorny" boolean DEFAULT false,
	"audios" boolean DEFAULT false,
	"antistatus" boolean DEFAULT false,
	"modoadmin" boolean DEFAULT false,
	"photowelcome" boolean DEFAULT false,
	"photobye" boolean DEFAULT false,
	"autolevelup" boolean DEFAULT true,
	"antiporn" boolean DEFAULT false,
	"nsfw_horario" text,
	"swelcome" text,
	"sbye" text,
	"spromote" text,
	"sdemote" text,
	"sautorespond" text,
	"banned" boolean DEFAULT false,
	"expired" bigint DEFAULT 0,
	"memory_ttl" integer DEFAULT 86400,
	"primary_bot" text
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"user_id" text NOT NULL,
	"group_id" text NOT NULL,
	"message_count" integer DEFAULT 0,
	CONSTRAINT "messages_user_id_group_id_pk" PRIMARY KEY("user_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "reportes" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" text NOT NULL,
	"sender_name" text,
	"mensaje" text NOT NULL,
	"fecha" timestamp DEFAULT now(),
	"enviado" boolean DEFAULT false,
	"tipo" text DEFAULT 'reporte'
);
--> statement-breakpoint
CREATE TABLE "stats" (
	"command" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "subbots" (
	"id" text PRIMARY KEY NOT NULL,
	"tipo" text DEFAULT 'null',
	"name" text,
	"logo_url" text,
	"prefix" text[] DEFAULT ARRAY['/', '.', '#']::text[],
	"mode" text DEFAULT 'public',
	"owners" text[],
	"anti_private" boolean DEFAULT false,
	"anti_call" boolean DEFAULT true,
	"privacy" boolean DEFAULT false,
	"prestar" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text,
	"registered" boolean DEFAULT false,
	"num" text,
	"lid" text,
	"banned" boolean DEFAULT false,
	"razon_ban" text,
	"avisos_ban" integer DEFAULT 0,
	"warn_pv" boolean DEFAULT false,
	"warn" integer DEFAULT 0,
	"warn_antiporn" integer DEFAULT 0,
	"warn_estado" integer DEFAULT 0,
	"edad" integer,
	"gender" text,
	"birthday" date,
	"money" integer DEFAULT 100,
	"limite" integer DEFAULT 10,
	"exp" integer DEFAULT 0,
	"banco" integer DEFAULT 0,
	"level" integer DEFAULT 0,
	"role" text DEFAULT 'novato',
	"reg_time" timestamp,
	"serial_number" text,
	"sticker_packname" text,
	"sticker_author" text,
	"ry_time" bigint DEFAULT 0,
	"lastwork" bigint DEFAULT 0,
	"lastmiming" bigint DEFAULT 0,
	"lastclaim" bigint DEFAULT 0,
	"dailystreak" bigint DEFAULT 0,
	"lastcofre" bigint DEFAULT 0,
	"lastrob" bigint DEFAULT 0,
	"lastslut" bigint DEFAULT 0,
	"timevot" bigint DEFAULT 0,
	"wait" bigint DEFAULT 0,
	"crime" bigint DEFAULT 0,
	"marry" text,
	"marry_request" text,
	CONSTRAINT "usuarios_lid_unique" UNIQUE("lid")
);
