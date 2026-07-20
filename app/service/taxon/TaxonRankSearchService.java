package service.taxon;

import dto.TaxonRankDto;
import models.TaxonRank;
import utils.TaxonRanksUtils;

import java.util.List;

public class TaxonRankSearchService {

    public static List<TaxonRankDto> getAllDto() {
        return TaxonRank.find().query()
            .select("id, nameEng")
            .where()
            .orderBy("nameEng")
            .findList()
            .stream()
            .map(t -> new TaxonRankDto(
                t.getId(),
                t.getNameEng(),
                t.getNameCz()
            ))
            .toList();
    }

    public static List<TaxonRankDto> getExportableDto() {
        List<TaxonRank> ranks = TaxonRanksUtils.getExportableRanks();
        return ranks
            .stream()
            .map(t -> new TaxonRankDto(
                t.getId(),
                t.getNameEng(),
                t.getNameCz()
            ))
            .toList();
    }


    public static TaxonRank find(int id) {
        return TaxonRank.find().byId(id);
    }

    public static TaxonRankDto getDto(int id) {
        TaxonRank t = TaxonRank.find().byId(id);
        if (t == null) {
            return null;
        }

        return new TaxonRankDto(
            t.getId(),
            t.getNameEng(),
            t.getNameCz()
        );
    }
}
