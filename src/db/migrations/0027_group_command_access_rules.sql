CREATE TABLE IF NOT EXISTS "group_command_access_rules" (
    "group_id" text NOT NULL,
    "scope" text NOT NULL,
    "target" text NOT NULL,
    "enabled" boolean NOT NULL DEFAULT true,
    "access_mode" text NOT NULL DEFAULT 'all',
    "updated_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "group_command_access_rules_group_id_scope_target_pk"
        PRIMARY KEY ("group_id", "scope", "target"),
    CONSTRAINT "group_command_access_rules_scope_check"
        CHECK ("scope" IN ('family', 'command')),
    CONSTRAINT "group_command_access_rules_access_mode_check"
        CHECK ("access_mode" IN ('all', 'admin', 'superadmin', 'owner'))
);

CREATE INDEX IF NOT EXISTS "group_command_access_rules_group_scope_idx"
    ON "group_command_access_rules" ("group_id", "scope");

INSERT INTO "group_command_access_rules" ("group_id", "scope", "target", "enabled", "access_mode")
SELECT gs."group_id", 'family', feature_values."target", feature_values."enabled",
       CASE WHEN feature_values."access_mode" IN ('all', 'admin', 'superadmin', 'owner')
            THEN feature_values."access_mode"
            WHEN feature_values."target" IN ('nsfw', 'nsfw-gifs') THEN 'owner'
            ELSE 'all' END
FROM "group_settings" gs
CROSS JOIN LATERAL (VALUES
    ('games', true, COALESCE(gs."games_access_mode", 'all')),
    ('tools', true, COALESCE(gs."tools_access_mode", 'all')),
    ('rpg', true, COALESCE(gs."rpg_access_mode", 'all')),
    ('downloads', true, COALESCE(gs."downloads_access_mode", 'all')),
    ('search', true, COALESCE(gs."search_access_mode", 'all')),
    ('stickers', true, COALESCE(gs."stickers_access_mode", 'all')),
    ('converters', true, COALESCE(gs."converters_access_mode", 'all')),
    ('fun', true, COALESCE(gs."fun_access_mode", 'all')),
    ('audio', COALESCE(gs."audios", false), 'all'),
    ('gifs', true, 'all'),
    ('nsfw', COALESCE(gs."modohorny", false), COALESCE(gs."nsfw_access_mode", 'owner')),
    ('nsfw-gifs', COALESCE(gs."nsfw_gif_enabled", false), COALESCE(gs."nsfw_gif_access_mode", 'owner'))
) AS feature_values("target", "enabled", "access_mode")
ON CONFLICT ("group_id", "scope", "target") DO NOTHING;
