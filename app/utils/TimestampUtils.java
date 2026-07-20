package utils;

import java.sql.Timestamp;
import java.text.SimpleDateFormat;

public class TimestampUtils {

    public static String toSqlTimestampString(Timestamp timestamp) {
        return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(timestamp);
    }

    public static Timestamp getTimestamp(java.util.Date date) {
        return new Timestamp(date.getTime());
    }
}
