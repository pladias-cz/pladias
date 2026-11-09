package mail;

import org.apache.commons.io.FilenameUtils;

import java.util.Locale;

public class MailAttachment {
    private static final String DefaultMimeType = "application/octet-stream";

    private final byte[] data;
    private final String mimeType;
    private final String filename;

    public MailAttachment(byte[] data, String mimeType, String filename) {
        this.data = data;
        this.mimeType = mimeType;
        this.filename = filename;
    }

    /**
     * Creates an attachment whose MIME type is derived from the filename extension.
     */
    public MailAttachment(byte[] data, String filename) {
        this(data, mimeTypeForFilename(filename), filename);
    }

    /**
     * Returns the MIME type for the filename extension (zip, xls, xlsx),
     * or "application/octet-stream" for an unknown or missing extension.
     */
    public static String mimeTypeForFilename(String filename) {
        String extension = FilenameUtils.getExtension(filename);
        if (extension == null) {
            return DefaultMimeType;
        }
        return switch (extension.toLowerCase(Locale.ROOT)) {
            case "zip" -> "application/zip";
            case "xls" -> "application/vnd.ms-excel";
            case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            default -> DefaultMimeType;
        };
    }

    public byte[] getData() {
        return data;
    }

    public String getMimeType() {
        return mimeType;
    }

    public String getFilename() {
        return filename;
    }
}
