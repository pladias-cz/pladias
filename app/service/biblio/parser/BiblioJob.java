package service.biblio.parser;

import io.ebean.DB;
import io.ebean.SqlUpdate;
import io.ebean.Transaction;
import mail.MailMessageBuilder;
import mail.MailService;
import models.Record;
import models.User;
import models.biblio.Bibliography;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import service.config.IConfigService;

import javax.mail.MessagingException;
import java.util.List;

public class BiblioJob extends Thread {
    private final Logger _logger = LoggerFactory.getLogger(BiblioJob.class);
    private final User user;
    private final List<Bibliography> biblioList;
    private final IConfigService _configService;


    public BiblioJob(User user, List<Bibliography> biblioList, IConfigService configService) {
        this.user = user;
        this.biblioList = biblioList;
        _configService = configService;
    }

    public void run() {
        try (Transaction transaction = DB.beginTransaction()) {
            purgeDb();
            importData();
            reportResultByEmail(true, "");
            transaction.commit();
        } catch (Exception e) {
            try {
                reportResultByEmail(false, e.getMessage());
            } catch (Exception ex) {
            }
        }
    }

    private void purgeDb() {
        String q1 = String.format("DELETE FROM %s;", Bibliography.QualifiedTableName);
        SqlUpdate sql1 = DB.sqlUpdate(q1.toString());
        sql1.execute();
        _logger.info("Purged " + Bibliography.QualifiedTableName + " table.");

        String q2 = String.format("UPDATE %s SET biblio_id=null WHERE biblio_id NOTNULL;", Record.QualifiedTableName);
        SqlUpdate sql2 = DB.sqlUpdate(q2.toString());
        sql2.execute();
        _logger.info("Purged " + Record.QualifiedTableName + " table with biblio_id references.");

    }

    private void importData() {
        for (Bibliography b : biblioList) {
            b.save();
			/*
			if (b.getOriginalSourceKey() != null)
			{
				String query = String.format("SELECT id FROM %s WHERE  lower(source) LIKE lower('%s')",
						Record.QualifiedTableName,
						b.getOriginalSourceKey());


		    	RawSql rawSql = RawSqlBuilder.parse(query).create();
		    	Query<Record> sqlQuery = DB.find(Record.class);
		 	    sqlQuery.query().setRawSql(rawSql);
		 	    List<Record> records = sqlQuery.findList();

		 	    Logger.info("Processing biblio record #" + b.getId());

		 	    for (Record r : records)
				{
					r.setBibliography(b);
					r.save();
				}
			}*/
        }
    }

    private void reportResultByEmail(boolean success, String errorMessage) throws MessagingException {
        MailMessageBuilder builder = new MailMessageBuilder();
        builder.setSubject("Import bibliografie PLADIAS");
        builder.setContents(generateMailcontents(success, errorMessage));
        builder.addRecipient(user.getEmail());
        new MailService(_configService).sendMail(builder.build());
    }

    private String generateMailcontents(boolean success, String errorMessage) {
        StringBuilder message = new StringBuilder();
        if (success) {
            message.append("Import byl uspesny.");
        } else {
            message.append("Import nebyl uspesny. Popis chyby: \n").append(errorMessage);
        }
        return message.toString();
    }


}
