package service.comment;

import io.ebean.DB;
import io.ebean.SqlUpdate;
import models.Taxon;
import models.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.text.MessageFormat;

public class CommentService implements ICommentService {
    private final Logger logger = LoggerFactory.getLogger(CommentService.class);

    public int bindRevisorsToUnresolvedComments(User[] revisors, Taxon rootSupervisedTaxon) {
        int processedComments = 0;
        for (User revisor : revisors) {
            processedComments += bindRevisorToUnresolvedComments(revisor, rootSupervisedTaxon);
        }
        return processedComments;
    }

    private int bindRevisorToUnresolvedComments(User revisor, Taxon rootSupervisedTaxon) {
        String sql = MessageFormat.format(
            "WITH taxa AS (SELECT pladias_functions.descendant_taxon({1,number,#}) as taxon_id)" +
                " " +
                "INSERT INTO atlas.users_comments (users_id, comments_id) " +
                "SELECT  {0,number,#}, C.id " +
                "FROM atlas.comments as C " +
                "INNER JOIN atlas.records as R ON (R.id = C.record_id)  " +
                "INNER JOIN taxa as TAXA_SUBTREE ON (TAXA_SUBTREE.taxon_id = R.taxon_id) " +
                "INNER JOIN public.users U ON (U.id = C.author_id) " +
                "WHERE C.author_id != {0,number,#} AND C.resolved = false AND C.deleted = false " +
                " AND NOT EXISTS " +
                "    (SELECT 1 " +
                "     FROM atlas.users_comments as UC " +
                "     WHERE UC.comments_id = C.id AND UC.users_id={0,number,#}) " +
                " AND NOT EXISTS " +
                //this guarantees that a revisor re-assigned to the same taxon will not have to resolve once declined/deleted request
                "    (SELECT 1 \r\n" +
                "     FROM atlas.records_history " +
                "     WHERE record_id=r.id " +
                "        AND change_type=''comment'' " +
                "        AND field_desc=''marked as read'' " +
                "        AND comment_id=c.id " +
                "        AND user_id={0,number,#})",
            new Object[]{revisor.getId(), rootSupervisedTaxon.getId()});

        try {
            SqlUpdate insert = DB.sqlUpdate(sql);
            int rowsInserted = insert.execute();
            logger.info(String.format("User %s,%s bound to %d comments",
                revisor.getSurname(),
                revisor.getName(),
                rowsInserted));
            return rowsInserted;
        } catch (Exception e) {
            logger.info("Failed to bind user " + revisor.getSurname() + " with unresolved comments ", e);
            return 0;
        }
    }
}
