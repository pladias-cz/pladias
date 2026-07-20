package zip;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public class Zipper implements AutoCloseable {
    private final ByteArrayOutputStream bos = new ByteArrayOutputStream();
    private final ZipOutputStream zos = new ZipOutputStream(bos);

    private boolean isClosed = false;

    public void addEntry(String filename, byte[] data) throws IOException {
        zos.putNextEntry(new ZipEntry(filename));
        zos.write(data, 0, data.length);
    }

    @Override
    public void close() throws IOException {
        zos.close();
        bos.close();
        isClosed = true;
    }

    public byte[] getBytes() throws IOException {
        if (!isClosed) {
            throw new IOException("Stream is still open!");
        }
        return bos.toByteArray();
    }
}
