package service.taxon;

import io.ebean.Expr;
import io.ebean.ExpressionList;
import io.ebean.Junction;
import models.*;
import models.Record;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import utils.records.RecordQuadrantDistribution;

import java.util.*;

public class RecordRetrievalService {
    final static Logger logger = LoggerFactory.getLogger(RecordRetrievalService.class);

    private static List<Record> getRecords(TaxonMapSettings settings) {
        ExpressionList<Record> exprList = Record.find().query().where();

        if (settings.isCommon()) {
            //(accepted or unprocessed)
            Junction<Record> junction = exprList.disjunction();
            junction.add(Expr.eq("validation_status", RecordValidationStatus.Accepted));
            junction.add(Expr.eq("validation_status", RecordValidationStatus.Unprocessed));
            exprList = junction.endJunction();
        } else {
            //(include_in_map && (accepted || uncertain))
            exprList = exprList
                .conjunction()
                .eq("include_in_map", true)
                .disjunction()
                .eq("validation_status", RecordValidationStatus.Accepted)
                .eq("validation_status", RecordValidationStatus.Uncertain)
                .endJunction()
                .endJunction();
        }

        if (settings.isAggregateRoot()) {
            List<TaxonMapSettings> listSettings = settings.getAggregatedChildren();
            listSettings.add(settings);
            Junction<Record> disjunction = exprList.disjunction();
            for (TaxonMapSettings s : listSettings) {
                disjunction.add(Expr.eq("taxon.id", s.getId()));
            }
            exprList = disjunction.endJunction();
        } else {
            exprList = exprList.eq("taxon.id", settings.getId());
        }
        return exprList.findList();
    }

    public List<RecordQuadrantDistribution> getIncludedInMapByQuadrant(TaxonMapSettings settings) throws Exception {
        List<Record> records = getRecords(settings);
        if (records.size() == 0) {
            throw new Exception("No records collected. Is the taxon correctly configured?");
        }
        logger.info(records.size() + " records collected");
        records = filterRecordsWithOneQuadrant(records);
        logger.info("records with one quadrant filtered");
        records = sort(records);
        logger.info("records sorted");
        return partitionIntoQuadrantSlots(records, settings);
    }

    private List<RecordQuadrantDistribution> partitionIntoQuadrantSlots(List<Record> records, TaxonMapSettings settings) {
        List<RecordQuadrantDistribution> result = new ArrayList<RecordQuadrantDistribution>();

        logger.info("partitining records into quadrant slots");
        QuadrantNew currentQuadrant = null;
        List<Record> currentRecords = new ArrayList<Record>();
        for (Record r : records) {
            if (currentQuadrant == null && !r.getQuadrant().isPresent()) {
                continue;
            }
            if (currentQuadrant == null) {
                currentQuadrant = r.getQuadrant().get();
                logger.info(String.format("processing quadrant %s", currentQuadrant.getCode()));
            }

            if (currentQuadrant.equals(r.getQuadrant().get())) {
                currentRecords.add(r);
            } else {
                logger.info("Computing quadrant highest validation status");
                RecordQuadrantDistribution distribution =
                    new RecordQuadrantDistribution(currentQuadrant, currentRecords, settings);
                if (distribution.getHighestValidationStatus().getId() == RecordValidationStatus.Accepted ||
                    distribution.getHighestValidationStatus().getId() == RecordValidationStatus.Uncertain) {
                    result.add(distribution);
                }
                currentQuadrant = r.getQuadrant().get();
                currentRecords = new ArrayList<Record>();
                currentRecords.add(r);
            }
        }
        if (currentRecords.size() > 0) {
            logger.info("Computing last quadrant highest validation status");
            RecordQuadrantDistribution distribution =
                new RecordQuadrantDistribution(currentQuadrant, currentRecords, settings);
            if (distribution.getHighestValidationStatus().getId() == RecordValidationStatus.Accepted ||
                distribution.getHighestValidationStatus().getId() == RecordValidationStatus.Uncertain) {
                result.add(distribution);
            }
        }
        return result;
    }

    private List<Record> filterRecordsWithOneQuadrant(List<Record> records) {
        List<Record> recordsWithOneQuadrant = new ArrayList<Record>();
        for (Record r : records) {
            if (r.hasCoords())
                recordsWithOneQuadrant.add(r);
        }
        records = null; // don't need them any more
        return recordsWithOneQuadrant;
    }

    private List<Record> sort(List<Record> records) {
        Collections.sort(records, new Comparator<Record>() {

            @Override
            public int compare(Record arg0, Record arg1) {
                QuadrantNew q0 = arg0.getQuadrant().get();
                QuadrantNew q1 = arg1.getQuadrant().get();

                if (!q0.equals(q1)) {
                    return q0.getCode().compareTo(q1.getCode());
                }
                if (arg1.getProject().getCredibility() != arg0.getProject().getCredibility()) {
                    //descending
                    return arg1.getProject().getCredibility() - arg0.getProject().getCredibility();
                }

                long t1 = arg1.getBatch().getCreateTimestamp().getTime();
                long t0 = arg0.getBatch().getCreateTimestamp().getTime();
                if (t1 != t0) {
                    //ascending
                    return (int)
                        Math.signum(
                            arg0.getBatch().getCreateTimestamp().getTime() -
                                arg1.getBatch().getCreateTimestamp().getTime());
                }
                DateSpecifier ds0 = arg0.getDateSpecifier();
                DateSpecifier ds1 = arg1.getDateSpecifier();

                if (ds0.getDate() != null && ds1.getDate() != null) {
                    Calendar cal0 = Calendar.getInstance();
                    Calendar cal1 = Calendar.getInstance();
                    cal0.setTime(ds0.getDate());
                    cal1.setTime(ds1.getDate());
                    //descending
                    return cal1.get(Calendar.YEAR) - cal0.get(Calendar.YEAR);
                } else if (ds0.getDate() == null && ds1.getDate() != null) {
                    return 1;
                } else if (ds0.getDate() != null && ds1.getDate() == null) {
                    return -1;
                }
                return 0;
            }

        });
        return records;
    }
}
