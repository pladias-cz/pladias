package models.dto;

import play.libs.Files;
import play.mvc.Http.MultipartFormData.FilePart;

import java.io.File;
import java.io.IOException;
import java.nio.file.StandardCopyOption;

public class UploadedFile {
    private File _file;
    private final String _name;

    public UploadedFile(File file, String name) {
        _file = file;
        _name = name;
    }

    public UploadedFile(FilePart<play.libs.Files.TemporaryFile> filePart) throws IOException {
        Files.TemporaryFile oldFile = filePart.getRef();
        _name = filePart.getFilename();
        _file = File.createTempFile("prefix", "." + getFileSuffix(_name));

        java.nio.file.Files.copy(
            oldFile.path(),
            _file.toPath(),
            StandardCopyOption.REPLACE_EXISTING
        );
    }

    private String getFileSuffix(String filename) {
        int lastDot = filename.lastIndexOf('.');
        if (lastDot != -1 && lastDot < filename.length() - 1) {
            return filename.substring(lastDot + 1); // e.g. "xlsx"
        } else {
            return ""; // No extension found
        }
    }

    public File getFile() {
        return _file;
    }

    public String getName() {
        return _name;
    }

    public void delete() {
        if (_file == null)
            return;
        try {
            _file.delete();
            _file = null;
        } catch (Exception e) {
        }
    }
}
