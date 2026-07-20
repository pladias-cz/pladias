package mail;

public class MailAttachment {
    private final byte[] data;
    private final String mimeType;
    private final String filename;

    public MailAttachment(byte[] data, String mimeType, String filename) {
        this.data = data;
        this.mimeType = mimeType;
        this.filename = filename;
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
