package utils;

import helpers.parsers.TaxonNormalizer;
import io.ebean.DB;
import io.ebean.SqlQuery;
import io.ebean.SqlRow;
import models.Taxon;
import models.TaxonMapSettings;
import play.Logger;

import java.util.List;
import java.util.Set;
import java.util.TreeSet;

public class TaxonUtils {

    private static final String SPECIES = " sp.";
    private static Set<String> presliaSet = null;

    public static void aggregateLock(long taxonId) {
        TaxonMapSettings settings = TaxonMapSettings.find().byId(taxonId);
        if (settings == null) {
            Logger.error(String.format("Taxon #%d is not mappable. It cannot be locked", taxonId));
            return;
        }
        settings.setLocked(true);
        settings.save();
        Taxon taxon = Taxon.find().byId(settings.getId());
        Logger.info(String.format("Taxon %s locked", taxon.getNameLat()));

        if (settings.isAggregateRoot()) {
            List<TaxonMapSettings> settingsList = settings.getAggregatedChildren();
            for (TaxonMapSettings s : settingsList) {
                s.setLocked(true);
                s.update();
                Taxon t = Taxon.find().byId(s.getId());
                Logger.info(String.format("Taxon %s locked by parent map taxon.", t.getNameLat()));
            }
        }
    }

    public static String normalizeTaxonName(String taxonName) {
        if (taxonName == null)
            return null;

        taxonName = taxonName.trim();
        if (taxonName.endsWith(SPECIES)) {
            taxonName = taxonName.substring(0, taxonName.length() - SPECIES.length());
        }
        return TaxonNormalizer.normalize(taxonName);
    }

    public static boolean canBeMapped(Taxon taxon) {
        int rankValue = taxon.getRank().getId();
        return (rankValue > 2 && rankValue < 7) ||
            (rankValue > 33 && rankValue < 40) ||
            (rankValue > 45 && rankValue < 52) ||
            (rankValue > 52 && rankValue < 58);
    }

    public static Set<String> getPresliaList() {
        if (presliaSet != null)
            return presliaSet;

        presliaSet = new TreeSet<String>();
        String sql = "SELECT DISTINCT preslia FROM atlas.taxon_mapsettings";
        SqlQuery query = DB.sqlQuery(sql);
        List<SqlRow> rows = query.findList();
        for (SqlRow row : rows) {
            String preslia = row.getString("preslia");
            if (preslia != null) {
                presliaSet.add(preslia);
            }
        }
        return presliaSet;
    }

    public static Set<Integer> getTaxonsIdsWithTraitData() {
        Set<Integer> taxonIds = new TreeSet<Integer>();
        String sql = "SELECT taxon_id FROM measurements.taxons_having_traitdata";
        SqlQuery query = DB.sqlQuery(sql);
        List<SqlRow> rows = query.findList();
        for (SqlRow row : rows) {
            int taxonId = row.getInteger("taxon_id");
            taxonIds.add(taxonId);
        }
        return taxonIds;
    }

    public static int getTraitCountForTaxon(long taxonId) {
        String sql = String.format("SELECT count(*) as total FROM measurements.traits_including_taxon WHERE taxon=%d", taxonId);
        SqlQuery query = DB.sqlQuery(sql);
        SqlRow row = query.findOne();
        return row.getInteger("total");
    }

    public static void aggregateUnlock(long taxonId) {
        TaxonMapSettings settings = TaxonMapSettings.find().byId(taxonId);
        if (settings == null) {
            Logger.error(String.format("Taxon #%d is not mappable. It cannot be unlocked", taxonId));
            return;
        }
        settings.setLocked(false);
        settings.save();

        if (settings.isAggregateRoot()) {
            List<TaxonMapSettings> settingsList = settings.getAggregatedChildren();
            for (TaxonMapSettings s : settingsList) {
                s.setLocked(false);
                s.save();
                Taxon t = Taxon.find().byId(s.getId());
                Logger.info("Taxon %s unlocked by parent map taxon.", t.getNameLat());
            }
        }
    }
}
