-- apply alter tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_collation WHERE collname = 'cs_cz_icu') THEN
        CREATE COLLATION cs_cz_icu (
            provider = icu,
            locale = 'cs-CZ'
        );
    END IF;
END $$;
