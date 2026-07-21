package repositories;

import io.ebean.DB;
import io.ebean.SqlRow;
import models.Taxon;
import org.joda.time.Instant;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class TaxonRepository {

    private final static TaxonRepository INSTANCE = new TaxonRepository();
    private final Map<String, Taxon> mapByName;
    private final Map<Long, Taxon> mapById;
    private Instant lastUpdate = new Instant(0);

    private TaxonRepository() {
        mapByName = new HashMap<>();
        mapById = new HashMap<>();
    }

    public static final TaxonRepository getInstance() {
        return INSTANCE;
    }

    private void CheckValidity() {
        long expirationTime = 1000 * 60 * 60;
        Instant expirationThreshold = lastUpdate.plus(expirationTime);
        Instant now = new Instant();
        boolean isValid = expirationThreshold.isAfter(now);

        if (isValid) {
            return;
        }

        lastUpdate = now;

        mapByName.clear();
        mapById.clear();

        List<Taxon> taxons = Taxon.find().all();
        register(taxons);
    }

    private void register(List<Taxon> taxons) {
        for (Taxon t : taxons) {
            mapByName.put(t.getNameLat(), t);
            mapById.put(t.getId(), t);
        }
    }

    public Taxon getByName(String name) {
        CheckValidity();

        Taxon t = mapByName.get(name);
        return t;
    }

    public Taxon getById(long id) {
        CheckValidity();

        Taxon t = mapById.get(id);
        return t;
    }

    public List<Long> getTaxonIdsWithInheritedSupervisors(int supervisorlevelDetail) {
        String query = "";
        TaxonSupervisorListDetail detail = TaxonSupervisorListDetail.fromValue(supervisorlevelDetail);
        query = switch (detail) {
            case LOW -> "SELECT TID FROM " +
                " (SELECT DISTINCT T.id as TID, T.name_lat " +
                "  FROM public.taxons as T " +
                "  INNER JOIN atlas.taxon_mapsettings as TMS on T.id = TMS.taxon_id " +
                "  WHERE EXISTS (SELECT T2.id FROM public.taxons as T2 " +
                "                INNER JOIN atlas.taxons_users as TU2 on T2.id = TU2.taxons_id " +
                "                WHERE T2.lft <=T.lft and T2.rgt >= T.rgt) " +
                "  ORDER BY T.name_lat) as taxonIds;";
            case NORMAL -> "SELECT TID FROM " +
                " (SELECT DISTINCT T.id as TID, T.name_lat " +
                "  FROM public.taxons as T " +
                "  INNER JOIN atlas.taxon_mapsettings as TMS on T.id = TMS.taxon_id " +
                "  WHERE EXISTS (SELECT T2.id FROM public.taxons as T2 " +
                "                INNER JOIN atlas.taxons_users as TU2 on T2.id = TU2.taxons_id " +
                "                WHERE T2.lft <=T.lft and T2.rgt >= T.rgt) " +
                " AND TMS.revision_status > 1 OR TMS.publication_status > 0 " +
                "  ORDER BY T.name_lat) as taxonIds;";
            case DETAILED -> "SELECT TID FROM " +
                " (SELECT DISTINCT T.id as TID, T.name_lat " +
                "  FROM public.taxons as T " +
                "  INNER JOIN atlas.taxon_mapsettings as TMS on T.id = TMS.taxon_id " +
                "  WHERE EXISTS (SELECT T2.id FROM public.taxons as T2 " +
                "                INNER JOIN atlas.taxons_users as TU2 on T2.id = TU2.taxons_id " +
                "                WHERE T2.lft <=T.lft and T2.rgt >= T.rgt) " +
                " AND TMS.revision_status > 1 AND TMS.publication_status IN (1,2,3) " +
                "  ORDER BY T.name_lat) as taxonIds;";
        };

        List<SqlRow> rows = DB.sqlQuery(query).findList();
        List<Long> result = new ArrayList<>();

        for (SqlRow row : rows) {
            result.add(row.getLong("TID"));
        }

        return result;
    }
}
