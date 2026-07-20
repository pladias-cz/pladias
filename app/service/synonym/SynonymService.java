package service.synonym;

import dto.SynonymDto;
import models.Publication;
import models.Taxon;
import models.TaxonSynonym;
import org.apache.commons.lang3.StringUtils;

public class SynonymService {

    public void add(SynonymDto synonym) throws Exception {
        if (synonym.getTaxonId() == null)
            throw new Exception("Taxon id not defined.");

        if (StringUtils.isBlank(synonym.getName()))
            throw new Exception("Synonym name not specified.");

        Taxon targetTaxon = Taxon.find().byId(synonym.getTaxonId());
        if (targetTaxon == null)
            throw new Exception(
                String.format("Taxon %d does not exist", synonym.getTaxonId()));

        TaxonSynonym syn = new TaxonSynonym();
        syn.setTaxon(targetTaxon);
        syn.setNameLat(synonym.getName());
        syn.setSuffix(synonym.getSuffix());

        syn.setNameHtml(resolveNameHtml(synonym));
        syn.setAutocomplete(synonym.getAutocomplete());

        syn.setPublication(Publication.getEmpty());
        syn.save();
    }


    public void modify(SynonymDto synonymDto) throws Exception {
        TaxonSynonym syn = getSynonymOrThrow(synonymDto.getId());
        if (synonymDto.getName() != null) {
            syn.setNameLat(synonymDto.getName());
        }
        if (synonymDto.getNameHtml() != null) {
            syn.setNameHtml(synonymDto.getNameHtml());
        }
        if (synonymDto.getPublication() != null) {
            Publication publication = Publication.find().byId(synonymDto.getPublication());
            syn.setPublication(publication);
        }
        if (synonymDto.getSuffix() != null) {
            syn.setSuffix(synonymDto.getSuffix());
        }
        syn.setAutocomplete(synonymDto.getAutocomplete());
        syn.save();
    }

    private TaxonSynonym getSynonymOrThrow(Long id) throws Exception {
        TaxonSynonym syn = TaxonSynonym.find().byId(id);
        if (syn == null)
            throw new Exception(
                String.format("Synonym %s does not exist", id));
        return syn;
    }


    public void delete(long id) throws Exception {
        TaxonSynonym syn = getSynonymOrThrow(id);
        syn.delete();
    }

    private String resolveNameHtml(SynonymDto synonymDef) {
        String html;
        if (StringUtils.isBlank(synonymDef.getNameHtml())) {
            html = String.format("<i>%s</i>", synonymDef.getName());
        } else {
            html = synonymDef.getNameHtml();
        }
        return html;
    }


}
