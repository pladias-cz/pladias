package service.excel.impl;

import io.ebean.DB;
import io.ebean.ExpressionList;
import models.Author;
import models.Herbarium;
import models.Record;
import org.apache.commons.lang3.mutable.MutableLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.i18n.Messages;
import service.excel.IRecordColumnMapper;
import service.excel.ParsedRecordDetails;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class DuplicationValidationServiceVascular extends DuplicationValidationServiceBase {
    protected static final double GpsPrecision = 0.000001;

    private final Logger _logger = LoggerFactory.getLogger(DuplicationValidationServiceVascular.class);

    public DuplicationValidationServiceVascular(IRecordColumnMapper colMapper, Messages messages) {
        super(colMapper, messages);
    }

    @Override
    protected DuplicationStatus getDuplicationStatus(ParsedRecordDetails recordDetails, MutableLong duplicate) {
        Record record = recordDetails.getRecord();
        if (record.getTaxon() == null)
            return DuplicationStatus.NoDuplicity;

        ExpressionList<Record> expr = DB.find(Record.class).where().eq("taxon.id", record.getTaxon().getId());
        expr = expr.eq("datum", record.getDateSpecifier().getDate());

        //we are dealing with double values so we should not use equality directly:
        if (record.hasCoords()) {
            expr = expr.ge(Latitude, record.getLatitude() - GpsPrecision);
            expr = expr.le(Latitude, record.getLatitude() + GpsPrecision);

            expr = expr.ge(Longitude, record.getLongitude() - GpsPrecision);
            expr = expr.le(Longitude, record.getLongitude() + GpsPrecision);
        } else {
            expr = expr.eq(Latitude, null);
            expr = expr.eq(Longitude, null);
        }

        if (record.getPhytochorion() != null)
            expr = expr.eq("phytochorion_id", record.getPhytochorion().getRowid());
        if (record.getDistrict() != null)
            expr = expr.eq("district_id", record.getDistrict().getId());
        if (record.getLocality() != null)
            expr = expr.eq("locality", record.getLocality());
        try {
            final Set<Author> ownAuthors = new HashSet<>(record.getAuthorsSorted());
            final Set<Herbarium> ownHerbariumSet = new HashSet<>(record.getHerbariums());

            List<Record> candidates = expr.findList();
            _logger.info(String.format("Duplicity test - found %d candidates", candidates.size()));

            for (Record candidate : candidates) {

                //verify that authors match
                Set<Author> candidateAuthors = new HashSet<>(candidate.getAuthorsSorted());

                if (!ownAuthors.equals(candidateAuthors)) {
                    continue;
                }

                //verify that herbariums match
                Set<Herbarium> candidateHerbariumsSet = new HashSet<>(candidate.getHerbariums());
                if (!ownHerbariumSet.equals(candidateHerbariumsSet)) {
                    continue;
                }

                duplicate.setValue(candidate.getId());
                return DuplicationStatus.DuplicityError; //we got as far as here = so there is a match
            }

        } catch (Exception e) {
            _logger.error("Failure during duplicate record search", e);
        }

        return DuplicationStatus.NoDuplicity;
    }
}
