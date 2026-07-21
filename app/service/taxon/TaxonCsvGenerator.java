package service.taxon;

import models.Taxon;
import models.TaxonMapSettings;
import play.Logger;

import java.util.ArrayList;
import java.util.List;

public class TaxonCsvGenerator {

    public List<String> getTaxonHeaders() {
        List<String> list = new ArrayList<>();
        list.add("IdPladias");
        list.add("IdDanihelka");
        list.add("NameLat");
        list.add("NameCz");
        list.add("Author");
        list.add("Rank");
        list.add("IsMapped");
        list.add("IsCommon");
        list.add("Left");
        list.add("Right");
        list.add("Suppressed");
        list.add("Comment");
        list.add("HybridParentage");
        return list;
    }

    public List<String> prepareTaxonFields(Taxon taxon) {
        try {
            TaxonMapSettings settings = taxon.getTaxonMapSettings();
            List<String> list = new ArrayList<>();
            list.add(Long.toString(taxon.getId()));

            Long idDanihelka = taxon.getIdDanihelka();
            list.add(idDanihelka != null ? Long.toString(idDanihelka) : "");

            list.add(taxon.getNameLat());
            list.add(taxon.getNameCz());
            list.add(taxon.getAuthor());
            list.add(taxon.getRank().getNameCz());
            list.add(settings != null
                ? Boolean.toString(settings.isMapped())
                : "");
            list.add(settings != null
                ? Boolean.toString(settings.isCommon())
                : "");
            list.add(Integer.toString(taxon.getLeft()));
            list.add(Integer.toString(taxon.getRight()));
            list.add(Boolean.toString(taxon.isSuppressed()));
            list.add(taxon.getComment() != null ? taxon.getComment() : "");
            list.add(taxon.getHybridParentage() != null ? taxon.getHybridParentage() : "");
            return list;
        } catch (Exception e) {
            Logger.info(String.format("Exception while converting taxon %d to CSV data", taxon.getNameLat()));
            throw e;
        }
    }
}
