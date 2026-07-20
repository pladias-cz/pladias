package service.map.publication;

import io.ebean.DB;
import io.ebean.SqlQuery;
import io.ebean.SqlRow;
import models.Taxon;
import service.taxon.IMapRecordSelectionFilter;

import java.util.ArrayList;
import java.util.List;

public class MapRenderDetailsDataProvider {
    public static List<SqlRow> getData(IMapRecordSelectionFilter filter) {

        Taxon taxon = Taxon.find().byId(filter.getCoreTaxonId());

        String sql = MapRenderQueries.getQuery(taxon, filter.getMapType(), filter.getCommonThreshold());
        if (sql != null) {
            SqlQuery sqlQuery = DB.sqlQuery(sql);
            return sqlQuery.findList();
        }
        return new ArrayList<SqlRow>();
    }
}
