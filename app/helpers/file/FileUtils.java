package helpers.file;

import java.io.Closeable;

public class FileUtils {

    public static void closeSafely(Closeable... closables) {
        for (Closeable c : closables) {
            try {
                if (c != null) {
                    c.close();
                    c = null;
                }
            } catch (Exception e) {
            }
        }
    }
}
