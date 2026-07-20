package db;

import io.ebean.migration.MigrationConfig;
import io.ebean.migration.MigrationRunner;
import play.Logger;
import service.config.IConfigService;
import service.password.IEncryptionService;
import service.password.IHashService;
import service.password.PladiasEncryptionService;
import service.password.PladiasHashService;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Ebean migration runner.
 * Can be called programmatically at application startup or as a standalone program.
 */
public class DbMigrationRunner {

    private static final Logger.ALogger logger = Logger.of(DbMigrationRunner.class);
    private static final String REHASH_TRIGGER_VERSION = "1.4";
    private static final String TABLE_DB_MIGRATION = "db_migration";
    private static final String TABLE_LEGACY_DBMIGRATION = "dbmigration";
    private static final String CONF_FILE = "./conf/common.conf";
    private static final String USERS_TABLE = "public.users";

    /**
     * Runs migrations with configuration from application.conf.
     */
    public static void run(String jdbcUrl, String username, String password) {
        logger.info("Running Ebean migrations...");

        MigrationVersion versionBefore = readCurrentVersion(jdbcUrl, username, password);
        logger.info("DB migration version before run: " + versionBefore);

        MigrationConfig config = new MigrationConfig();
        config.setMigrationPath("dbmigration");
        config.setMigrationInitPath("dbmigration");
        config.setPlatform("postgres");
        config.setDbDriver("org.postgresql.Driver");
        config.setDbUrl(jdbcUrl);
        config.setDbUsername(username);
        config.setDbPassword(password);

        try {
            MigrationRunner runner = new MigrationRunner(config);
            runner.run();

            MigrationVersion versionAfter = readCurrentVersion(jdbcUrl, username, password);
            logger.info("DB migration version after run: " + versionAfter);
            runPostMigrationActions(versionBefore, versionAfter, jdbcUrl, username, password);

            logger.info("Migrations completed successfully");
        } catch (Exception e) {
            logger.error("Error while running migrations", e);
            throw new RuntimeException("Migration failed", e);
        }
    }

    private static void runPostMigrationActions(MigrationVersion before,
                                                MigrationVersion after,
                                                String jdbcUrl,
                                                String username,
                                                String password) {
        checkRehashPasswords(before, after, jdbcUrl, username, password);
    }

    private static void checkRehashPasswords(MigrationVersion before, MigrationVersion after, String jdbcUrl, String username, String password) {
        MigrationVersion triggerVersion = MigrationVersion.parse(REHASH_TRIGGER_VERSION);

        boolean crossedVersion = before.compareTo(triggerVersion) < 0 && after.compareTo(triggerVersion) >= 0;
        if (!crossedVersion) {
            return;
        }

        runPasswordHashBackfill(jdbcUrl, username, password, triggerVersion);
    }

    /**
     * Hook pro jednorázovou migrační akci po dosažení cílové DB verze.
     * Tady připojte reálnou implementaci rehash hesel (idempotentně).
     */
    private static void runPasswordHashBackfill(String jdbcUrl,
                                                String username,
                                                String password,
                                                MigrationVersion triggerVersion) {
        IEncryptionService encryptionService;
        try {
            encryptionService = createEncryptionService();
        } catch (Exception ex) {
            throw new RuntimeException("Unable to initialize PladiasEncryptionService for password backfill", ex);
        }
        IHashService hashService = new PladiasHashService();

        String selectSql = "select id, password from " + USERS_TABLE + " where hashed_password is null";
        String updateSql = "update " + USERS_TABLE + " set hashed_password = ? where id = ? and hashed_password is null";

        int updatedRows = 0;
        try (Connection connection = DriverManager.getConnection(jdbcUrl, username, password);
             PreparedStatement selectStatement = connection.prepareStatement(selectSql);
             PreparedStatement updateStatement = connection.prepareStatement(updateSql)) {

            connection.setAutoCommit(false);

            try {
                try (ResultSet resultSet = selectStatement.executeQuery()) {
                    while (resultSet.next()) {
                        long userId = resultSet.getLong("id");
                        String encryptedPassword = resultSet.getString("password");

                        String plainPassword = encryptionService.decrypt(encryptedPassword);
                        String hashedPassword = hashService.hashPassword(plainPassword);

                        updateStatement.setString(1, hashedPassword);
                        updateStatement.setLong(2, userId);
                        int changed = updateStatement.executeUpdate();
                        updatedRows += changed;
                    }
                }

                connection.commit();
            } catch (Exception ex) {
                connection.rollback();
                throw ex;
            }

            logger.info("Password backfill finished for migration version " + triggerVersion + ". Updated users: " + updatedRows);
        } catch (Exception ex) {
            throw new RuntimeException("Failed to backfill hashed passwords", ex);
        }
    }

    private static IEncryptionService createEncryptionService() throws Exception {
        IConfigService configService = createConfigService();
        return new PladiasEncryptionService(configService);
    }

    private static IConfigService createConfigService() {
        return new DBMigrationConfigService(CONF_FILE);
    }

    private static MigrationVersion readCurrentVersion(String jdbcUrl, String username, String password) {
        try (Connection connection = DriverManager.getConnection(jdbcUrl, username, password)) {
            String migrationTable = resolveMigrationTable(connection);
            if (migrationTable == null) {
                logger.warn("Migration table not found (expected '" + TABLE_DB_MIGRATION + "' or '" + TABLE_LEGACY_DBMIGRATION + "').");
                return MigrationVersion.ZERO;
            }

            String sql = "select mversion from public." + migrationTable + " where mversion is not null";
            try (PreparedStatement statement = connection.prepareStatement(sql);
                 ResultSet resultSet = statement.executeQuery()) {

                MigrationVersion max = MigrationVersion.ZERO;
                while (resultSet.next()) {
                    MigrationVersion version = MigrationVersion.parse(resultSet.getString(1));
                    if (version.compareTo(max) > 0) {
                        max = version;
                    }
                }
                return max;
            }
        } catch (Exception ex) {
            logger.warn("Unable to detect current migration version. Falling back to 0.0", ex);
            return MigrationVersion.ZERO;
        }
    }

    private static String resolveMigrationTable(Connection connection) {
        if (tableExists(connection, TABLE_DB_MIGRATION)) {
            return TABLE_DB_MIGRATION;
        }
        if (tableExists(connection, TABLE_LEGACY_DBMIGRATION)) {
            return TABLE_LEGACY_DBMIGRATION;
        }
        return null;
    }

    private static boolean tableExists(Connection connection, String tableName) {
        try {
            DatabaseMetaData metaData = connection.getMetaData();
            try (ResultSet tables = metaData.getTables(null, "public", tableName, new String[]{"TABLE"})) {
                return tables.next();
            }
        } catch (Exception ex) {
            logger.warn("Unable to inspect table " + tableName, ex);
            return false;
        }
    }

    /**
     * Main method for running as a standalone program.
     * Usage:
     * 1) java -cp ... db.DbMigrationRunner <jdbcUrl> <username> <password>
     */
    public static void main(String[] args) {
        if (args.length == 3) {
            String jdbcUrl = args[0];
            String username = args[1];
            String password = args[2];

            System.out.println("Running migrations for: " + jdbcUrl);
            run(jdbcUrl, username, password);
            System.out.println("Migrations completed");
            return;
        }

        System.err.println("Usage:");
        System.err.println("  DbMigrationRunner <jdbcUrl> <username> <password> [rehashFromVersion]");
        System.err.println("Examples:");
        System.err.println("  DbMigrationRunner jdbc:postgresql://localhost:5432/pladias play play 1.4");
        System.exit(1);
    }

    private static final class MigrationVersion implements Comparable<MigrationVersion> {
        private static final MigrationVersion ZERO = new MigrationVersion(List.of(0));
        private final List<Integer> parts;

        private MigrationVersion(List<Integer> parts) {
            this.parts = parts;
        }

        private static MigrationVersion parse(String raw) {
            if (raw == null || raw.isBlank()) {
                return ZERO;
            }

            String[] tokens = raw.trim().split("\\.");
            List<Integer> parsed = new ArrayList<>(tokens.length);
            for (String token : tokens) {
                try {
                    parsed.add(Integer.parseInt(token));
                } catch (NumberFormatException ignored) {
                    parsed.add(0);
                }
            }
            return new MigrationVersion(parsed);
        }

        @Override
        public int compareTo(MigrationVersion other) {
            int maxLen = Math.max(parts.size(), other.parts.size());
            for (int i = 0; i < maxLen; i++) {
                int left = i < parts.size() ? parts.get(i) : 0;
                int right = i < other.parts.size() ? other.parts.get(i) : 0;
                if (left != right) {
                    return Integer.compare(left, right);
                }
            }
            return 0;
        }

        @Override
        public String toString() {
            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < parts.size(); i++) {
                if (i > 0) {
                    builder.append('.');
                }
                builder.append(parts.get(i));
            }
            return builder.toString();
        }
    }
}
