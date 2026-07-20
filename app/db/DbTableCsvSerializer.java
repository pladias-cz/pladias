package db;

import org.postgresql.copy.CopyManager;
import org.postgresql.jdbc.PgConnection;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.Objects;

public class DbTableCsvSerializer implements AutoCloseable {
    private final Connection _connection;

    private final Logger logger = LoggerFactory.getLogger(DbTableCsvSerializer.class);

    public DbTableCsvSerializer(java.sql.Connection connection) throws SQLException {
        _connection = Objects.requireNonNull(connection);
    }

    public byte[] serialize(String table) {
        try {
            DatabaseMetaData metaData = _connection.getMetaData();
            PgConnection pgConnection = (PgConnection) metaData.getConnection();

            CopyManager cm = new CopyManager(pgConnection);
            String query = "COPY (SELECT * FROM " + table + ") TO STDOUT WITH (FORMAT CSV, HEADER TRUE)";
            ByteArrayOutputStream os = new ByteArrayOutputStream();
            cm.copyOut(query, os);
            return os.toByteArray();
        } catch (SQLException | IOException ex) {
            logger.error("Unable to read DB table " + table, ex);
            return new byte[0];
        }
    }

    @Override
    public void close() throws Exception {
        _connection.close();
    }
}
