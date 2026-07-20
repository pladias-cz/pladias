package utils;

import io.ebean.Query;
import io.ebean.RawSql;
import io.ebean.RawSqlBuilder;
import models.Project;
import models.Record;
import models.Taxon;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class ProjectUtils {

    public static List<Project> getProjectsReferencingTaxon(Taxon taxon) {
        String query = String.format(
            "SELECT id, name, abbrev, institution_id FROM %s WHERE id IN " +
                "(SELECT DISTINCT project_id FROM %s WHERE taxon_id=%d)",
            Project.QualifiedTableName, Record.QualifiedTableName, taxon.getId());

        RawSql rawSql = RawSqlBuilder.parse(query).
            columnMapping("id", "id").
            columnMapping("name", "name").
            columnMapping("abbrev", "abbrev").
            columnMapping("institution_id", "institution.id").
            create();
        Query<Project> q = Project.find().query().setRawSql(rawSql);
        List<Project> projects = q.findList();

        SortByName(projects);
        return projects;
    }

    private static void SortByName(List<Project> projects) {
        Collections.sort(projects, new Comparator<Project>() {
            public int compare(Project o1, Project o2) {
                return o2.getName().compareTo(o1.getName());
            }
        });
    }
}
