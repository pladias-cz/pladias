package db;

import io.ebean.annotation.Platform;
import io.ebean.dbmigration.DbMigration;
import play.Logger;

import java.io.IOException;

/**
 * Generator of DDL migration files from Ebean models.
 * Compares the current model state with the previous version and creates migration scripts.
 */
public class DDLGenerator {

    private static final Logger.ALogger logger = Logger.of(DDLGenerator.class);

    /**
     * Generates a new migration based on model changes.
     */
    public static void generate() throws IOException {
        logger.info("Generating DDL migration...");

        DbMigration dbMigration = DbMigration.create();

        // Platform configuration
        dbMigration.setPlatform(Platform.POSTGRES);

        // Path to migration files
        dbMigration.setPathToResources("conf");

        // Generate migration
        dbMigration.generateMigration();

        logger.info("DDL migration generated in conf/dbmigration/");
    }

    /**
     * Generates DDL for the current model state (baseline for an existing DB).
     * Use this ONLY once during the first migration setup for an existing DB.
     */
    public static void generateBaseline() throws IOException {
        logger.info("Generating baseline DDL...");

        DbMigration dbMigration = DbMigration.create();
        dbMigration.setPlatform(Platform.POSTGRES);
        dbMigration.setPathToResources("conf");

        // Baseline version
        dbMigration.setVersion("1.0");
        dbMigration.setName("baseline");

        // Generate DDL only, not migrations (for documentation)
        dbMigration.generateMigration();

        logger.info("Baseline DDL generated");
    }

    public static void main(String[] args) throws IOException {
        if (args.length > 0) {
            switch (args[0]) {
                case "baseline":
                    System.out.println("Generating baseline...");
                    generateBaseline();
                    break;
                case "generate":
                    System.out.println("Generating migration...");
                    generate();
                    break;
                default:
                    System.err.println("Unknown command: " + args[0]);
                    System.err.println("Usage: DDLGenerator [baseline|generate]");
                    System.exit(1);
            }
        } else {
            generate();
        }
        System.out.println("Done!");
    }
}
