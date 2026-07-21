package sql;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.db.Database;
import serializers.IPrinter;

import javax.inject.Inject;
import java.io.IOException;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class SqlExecutor {

    private final Logger _logger = LoggerFactory.getLogger(SqlExecutor.class);
    private final Database database;

    @Inject
    public SqlExecutor(Database database) {
        this.database = database;
    }

    public Iterable<String> getMaterializedViewColumnNames(String qualifiedTableName) throws SQLException {
        String[] components = splitQualifiedTableName(qualifiedTableName);

        String query = "SELECT " +
            " ns.nspname as schema_name, " +
            " cls.relname as table_name, " +
            " attr.attname as column_name, " +
            " trim(leading '_' from tp.typname) as datatype " +
            " from pg_catalog.pg_attribute as attr " +
            " join pg_catalog.pg_class as cls on cls.oid = attr.attrelid " +
            " join pg_catalog.pg_namespace as ns on ns.oid = cls.relnamespace " +
            " join pg_catalog.pg_type as tp on tp.typelem = attr.atttypid " +
            " where " +
            " ns.nspname = '" + components[0] + "' and " +
            " cls.relname = '" + components[1] + "' and " +
            " not attr.attisdropped and " +
            " cast(tp.typanalyze as text) = 'array_typanalyze' and " +
            " attr.attnum > 0 " +
            " order by " +
            " attr.attnum ";

        return getColumnNamesFromQuery(query);
    }

    public Iterable<String> getColumnNames(String qualifiedTableName) throws SQLException {
        String[] components = splitQualifiedTableName(qualifiedTableName);
        String query = " SELECT * " +
            " FROM information_schema.columns " +
            " WHERE table_schema = '" + components[0] + "' " +
            " AND table_name   = '" + components[1] + "';";

        return getColumnNamesFromQuery(query);
    }

    public void executeCommand(String command) throws SQLException {
        try (Connection connection = database.getConnection()) {
            Statement statement = connection.createStatement();
            statement.execute(command);
            _logger.info(String.format("statement executed: '%s'", command));
        }
    }

    public void printTableDetails(String qualifiedTableName, String primaryKeyColName, String startingPrimaryKey, IPrinter printer) throws SQLException, IOException {

        try (Connection connection = database.getConnection()) {

            while (true) {
                String sql = createSql(qualifiedTableName, primaryKeyColName, startingPrimaryKey);
                ResultSet rs = executeQuery(connection, sql);
                int columnCount = rs.getMetaData().getColumnCount();

                int rowCount = 0;
                while (rs.next()) {
                    rowCount++;
                    Iterable<String> row = buildRow(rs, columnCount);
                    startingPrimaryKey = rs.getString(primaryKeyColName);
                    printer.printLine(row);
                }

                if (rowCount == 0)
                    return;
            }
        }
    }

    private String createSql(String qualifiedTableName, String primaryKey, String startingPrimaryKey) {
        int BATCH_RECORDS_SIZE = 5000;
        return " SELECT * FROM " + qualifiedTableName +
            " WHERE " + primaryKey + " > " + startingPrimaryKey +
            " ORDER BY " + primaryKey +
            " LIMIT " + BATCH_RECORDS_SIZE + ";";
    }

    private Iterable<String> getColumnNamesFromQuery(String sql) throws SQLException {

        try (Connection connection = database.getConnection()) {
            ResultSet rs = executeQuery(connection, sql);
            List<String> columnNames = new ArrayList<>();
            while (rs.next()) {
                String COLUMN_NAME = "column_name";
                String colName = rs.getString(COLUMN_NAME);
                columnNames.add(colName);
            }

            return columnNames;
        }
    }

    private String[] splitQualifiedTableName(String qualifiedTableName) {
        return qualifiedTableName.split("\\.");
    }


    private ResultSet executeQuery(Connection connection, String query) throws SQLException {
        Statement statement = connection.createStatement();
        ResultSet resultSet = statement.executeQuery(query);
        _logger.trace(String.format("query executed: '%s'", query));
        return resultSet;
    }

    private List<String> buildRow(ResultSet rs, int columnCount) throws SQLException {
        List<String> row = new ArrayList<>();
        for (int i = 1; i <= columnCount; i++) {
            row.add(rs.getString(i));
        }
        return row;
    }
}
