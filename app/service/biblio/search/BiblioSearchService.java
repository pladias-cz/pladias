package service.biblio.search;

import io.ebean.*;
import models.biblio.Bibliography;
import org.apache.commons.lang3.StringUtils;
import utils.SqlUtils;

import java.util.List;

public class BiblioSearchService implements IBiblioSearchService {

    @Override
    public List<Bibliography> search(BiblioSearchForm form) {

        sanitize(form);
        String query = buildQuery(form);
        List<Bibliography> result = executeQuery(query);
        return result;
    }

    private void sanitize(BiblioSearchForm form) {
        form.author = SqlUtils.sanitize(form.author);
        form.etc = SqlUtils.sanitize(form.etc);
        form.excerpted = SqlUtils.sanitize(form.excerpted);
        form.journal = SqlUtils.sanitize(form.journal);
        form.maxYear = SqlUtils.sanitize(form.maxYear);
        form.minYear = SqlUtils.sanitize(form.minYear);
        form.title = SqlUtils.sanitize(form.title);
    }

    private List<Bibliography> executeQuery(String query) {
        RawSql rawSql = RawSqlBuilder.parse(query)
            .create();

        Query<Bibliography> sqlQuery = DB.find(Bibliography.class);
        sqlQuery.setRawSql(rawSql);
        return sqlQuery.findList();
    }

    private String buildQuery(BiblioSearchForm form) {
        StringBuilder builder = new StringBuilder();
        builder.append("SELECT id FROM ").append(Bibliography.QualifiedTableName);
        builder.append(" WHERE TRUE AND ");

        if (StringUtils.isNotBlank(form.title)) {
            String title = form.title.replace("*", "%");
            builder.append(" title LIKE '").append(title).append("' AND ");
        }
        if (StringUtils.isNotBlank(form.author)) {
            String author = form.author.replace("*", "%");
            builder.append(" lower(authors) LIKE '").append(author.toLowerCase()).append("' AND ");
        }
        if (StringUtils.isNotBlank(form.etc)) {
            String etc = form.etc.replace("*", "%");
            builder.append(" etc LIKE '").append(etc).append("' AND ");
        }
        if (StringUtils.isNotBlank(form.minYear)) {
            builder.append(" year >= ").append(form.minYear).append(" AND ");
        }
        if (StringUtils.isNotBlank(form.maxYear)) {
            builder.append(" year <= ").append(form.maxYear).append(" AND ");
        }
        if (StringUtils.isNotBlank(form.excerpted)) {
            String excerptedLowercase = form.excerpted.toLowerCase();
            if ("true".equals(excerptedLowercase) || "false".equals(excerptedLowercase))
                builder.append(" excerpted = ").append(excerptedLowercase).append(" AND ");
        }
        if (StringUtils.isNotBlank(form.journal) && !"all".equals(form.journal)) {
            builder.append(" journal= '").append(form.journal).append("' AND ");
        }

        builder.append(" TRUE ");
        return builder.toString();
    }
}
