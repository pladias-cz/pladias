package tasks;

import mail.MailAttachment;
import mail.MailMessageBuilder;
import mail.MailService;
import models.Batch;
import models.Excel;
import models.User;
import models.dto.UploadedFile;
import service.csv.CsvDocument;

import javax.mail.MessagingException;
import java.io.*;
import java.nio.charset.Charset;
import java.nio.charset.MalformedInputException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public abstract class CsvBaseTask implements ITask {

    protected static Charset CHARSET = StandardCharsets.UTF_8;

    protected final UploadedFile _sourceFile;
    protected final MailService _mailService;

    public CsvBaseTask(UploadedFile sourceFile, MailService mailService) {
        _sourceFile = sourceFile;
        _mailService = mailService;
    }

    protected Batch populateBatch(User user, boolean isImport) {
        Batch batch = new Batch();
        batch.setAuthor(user);
        batch.setCommitter(user);
        batch.setImported(isImport);
        return batch;
    }

    protected Excel populateExcelTable(byte[] zippedImportFile, String fileName, Batch batch, int recordsCount) {
        Excel excel = new Excel();
        excel.setProcessedFile(zippedImportFile);
        excel.setFilename(fileName);
        excel.setErrors(0);
        excel.setInfos(0);
        excel.setWarnings(0);
        excel.setRecords(recordsCount);
        excel.setBatch(batch);
        return excel;
    }

    protected void sendMessage(EmailMessage message) throws MessagingException {
        MailMessageBuilder builder = new MailMessageBuilder();
        builder.setSubject(message.getSubject());
        builder.setContents(message.getContents());
        for (String recepient : message.getRecepients()) {
            builder.addRecipient(recepient);
        }
        if (message.getAttachment() != null) {
            builder.addAttachment(message.getAttachment());
        }
        _mailService.sendMail(builder.build());
    }

    protected <T> T withCsvDocument(IDocProcessor<T> processor) throws FileNotFoundException, IOException {
        try (InputStream is = new FileInputStream(_sourceFile.getFile())) {
            try (BufferedReader br = Files.newBufferedReader(_sourceFile.getFile().toPath(), CHARSET)) {
                CsvDocument doc = new CsvDocument(br);
                return processor.execute(doc);
            } catch (MalformedInputException ex) {
                String message = String.format(
                    "Failed to read CSV document. Please verify it uses %s encoding.", CHARSET);
                throw new IOException(message, ex);
            }
        }
    }

    protected byte[] zipToBytes(File sourceFile, String zipEntryFileName) throws IOException {
        File zippedResultFile = null;
        zippedResultFile = File.createTempFile(sourceFile.getName(), ".zip");

        try (OutputStream os = new FileOutputStream(zippedResultFile)) {
            try (BufferedOutputStream bos = new BufferedOutputStream(os)) {
                try (ZipOutputStream zos = new ZipOutputStream(bos, CHARSET)) {
                    createZipEntry(sourceFile, zipEntryFileName, zos);
                }
            }
        }

        byte[] bytes = Files.readAllBytes(Paths.get(zippedResultFile.getAbsolutePath()));
        zippedResultFile.delete();
        return bytes;
    }

    private void createZipEntry(File sourceFile, String zipEntryName, ZipOutputStream zos)
        throws IOException, FileNotFoundException {
        ZipEntry e = new ZipEntry(zipEntryName);
        zos.putNextEntry(e);

        try (InputStream is = new FileInputStream(sourceFile)) {
            try (BufferedInputStream bir = new BufferedInputStream(is)) {
                populateZipEntry(zos, bir);
            }
        }
        zos.closeEntry();
    }

    private void populateZipEntry(ZipOutputStream zos, BufferedInputStream bir) throws IOException {
        byte[] bytes = new byte[1024 * 10];
        int len = 0;
        while ((len = bir.read(bytes)) > 0) {
            zos.write(bytes, 0, len);
        }
    }

    class EmailMessage {

        private final String subject;
        private final String contents;
        private final List<String> recepients;
        private final MailAttachment attachment;

        public EmailMessage(String subject, String contents, List<String> recepients) {
            this(subject, contents, recepients, null);
        }

        public EmailMessage(String subject, String contents, List<String> recepients, MailAttachment attachment) {
            this.subject = subject;
            this.contents = contents;
            this.recepients = Collections.unmodifiableList(recepients);
            this.attachment = attachment;
        }

        public String getSubject() {
            return subject;
        }

        public String getContents() {
            return contents;
        }

        public List<String> getRecepients() {
            return recepients;
        }

        public MailAttachment getAttachment() {
            return attachment;
        }
    }
}
