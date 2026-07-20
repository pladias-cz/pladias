package service.trait.export;

import java.util.Objects;

public class TraitExportResponse {

    private final byte[] bytes;
    private final String filename;

    public TraitExportResponse(byte[] bytes, String filename) {
        this.bytes = Objects.requireNonNull(bytes);
        this.filename = Objects.requireNonNull(filename);
    }

    public byte[] getBytes() {
        return bytes;
    }

    public String getFilename() {
        return filename;
    }
}
