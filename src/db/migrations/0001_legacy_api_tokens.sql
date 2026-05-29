DO $$
BEGIN
    IF to_regclass('tokens') IS NOT NULL THEN
        INSERT INTO api_tokens (name, token_b64)
        SELECT id, encode(convert_to(value, 'UTF8'), 'base64')
        FROM tokens
        WHERE id IS NOT NULL
          AND value IS NOT NULL
        ON CONFLICT (name) DO NOTHING;
    END IF;
END $$;
