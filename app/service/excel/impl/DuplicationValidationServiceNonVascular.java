package service.excel.impl;

import geom.Coordinates;
import io.ebean.DB;
import io.ebean.Query;
import io.ebean.RawSql;
import io.ebean.RawSqlBuilder;
import models.Author;
import models.Record;
import models.Taxon;
import models.nonvascular.NonVascularRecordExtension;
import models.nonvascular.Substrate2;
import org.apache.commons.lang3.Range;
import org.apache.commons.lang3.mutable.MutableLong;
import org.joda.time.LocalDate;
import org.joda.time.ReadablePartial;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import platform.Srid;
import play.i18n.Messages;
import service.excel.IRecordColumnMapper;
import service.excel.ParsedRecordDetails;

import java.util.*;
import java.util.stream.Collectors;

public class DuplicationValidationServiceNonVascular extends DuplicationValidationServiceBase {
    private final int BufferLengthMetersWarning = 2000;
    private final int BufferLengthMetersError = 50;

    private final Logger _logger = LoggerFactory.getLogger(DuplicationValidationServiceNonVascular.class);

    public DuplicationValidationServiceNonVascular(IRecordColumnMapper colMapper, Messages messages) {
        super(colMapper, messages);
    }

    @Override
    protected DuplicationStatus getDuplicationStatus(ParsedRecordDetails wrapper, MutableLong duplicate) {
        Record record = wrapper.getRecord();
        if (record.getTaxon() == null)
            return DuplicationStatus.NoDuplicity;

        final List<String> authorsSurnames = getAuthorSurnames(record);

        Optional<Substrate2> noSubstrate = Optional.empty();
        Optional<Integer> year = getYear(record);
        Optional<Range<ReadablePartial>> softValidationRange = Optional.empty();
        if (year.isPresent()) {
            int currentYear = year.get();
            softValidationRange = yearRange(currentYear - 1, currentYear + 1);
        }
        StringBuilder builder = createFromClause(authorsSurnames);
        populateWhereClause(builder, record, softValidationRange, authorsSurnames, noSubstrate,
            BufferLengthMetersWarning);

        try {
            Optional<Record> dupWarn = searchForDuplicates(builder);
            if (dupWarn.isPresent()) {
                final Optional<Substrate2> substrate2 = getSubstrate2(wrapper.getNonVascularExtension());

                builder = createFromClause(authorsSurnames);

                Optional<Range<ReadablePartial>> hardValidationRange = Optional.empty();
                if (year.isPresent()) {
                    int currentYear = year.get();
                    hardValidationRange = yearRange(currentYear, currentYear);
                }

                populateWhereClause(builder, record, hardValidationRange, authorsSurnames, substrate2,
                    BufferLengthMetersError);
                Optional<Record> dupError = searchForDuplicates(builder);

                long duplicateId = dupError.isPresent()
                    ? dupError.get().getId()
                    : dupWarn.get().getId();

                duplicate.setValue(duplicateId);

                DuplicationStatus status = dupError.isPresent()
                    ? DuplicationStatus.DuplicityError
                    : DuplicationStatus.DuplicityWarning;
                _logger.info(String.format("Duplicate entry: %d, status: %s", duplicateId, status));
                return status;
            }
        } catch (Exception e) {
            _logger.error("Failure during duplicate record search", e);
            throw e;
        }

        return DuplicationStatus.NoDuplicity;
    }

    private Optional<Range<ReadablePartial>> yearRange(int startYear, int endYear) {

        LocalDate ld = new LocalDate(startYear, 1, 1);
        LocalDate from = new LocalDate(startYear, 1, 1);
        LocalDate to = new LocalDate(endYear, 12, 31);
        Range<ReadablePartial> range = Range.between(from, to);
        return Optional.of(range);
    }

    private Optional<Substrate2> getSubstrate2(NonVascularRecordExtension nonVascular) {
        if (nonVascular == null) {
            return Optional.empty();
        }

        Substrate2 substrate2 = nonVascular.getSubstrate2();
        return (substrate2 == null)
            ? Optional.empty()
            : Optional.of(substrate2);
    }

    private Optional<Record> searchForDuplicates(StringBuilder builder) {
        _logger.debug(String.format("Find Duplicates query: %s", builder.toString()));
        RawSql rawSql = RawSqlBuilder.parse(builder.toString())
            .columnMapping("R.id", "id")
            .create();

        Query<Record> sqlQuery = DB.find(Record.class);
        sqlQuery.setRawSql(rawSql);
        List<Record> duplicates = sqlQuery.findList();
        return duplicates.isEmpty()
            ? Optional.empty()
            : Optional.of(duplicates.get(0));
    }

    private List<String> getAuthorSurnames(Record record) {
        return record.getAuthorsSorted()
            .stream()
            .map(Author::getSurname)
            .collect(Collectors.toList());
    }

    private StringBuilder createFromClause(List<String> authorsSurnames) {
        StringBuilder builder = new StringBuilder();
        builder.append("SELECT distinct R.id ");
        builder.append(" FROM ").append(Record.QualifiedTableName).append(" AS R ");
        builder.append(" INNER JOIN ").append(Taxon.QualifiedName).append(" AS T on R.taxon_id=T.id ");

        if (!authorsSurnames.isEmpty()) {
            builder.append(" INNER JOIN ").append("atlas.records_authors").append(" AS RA ON R.id=RA.records_id ");
            builder.append(" INNER JOIN ").append(Author.QualifiedTableName).append(" AS A ON RA.authors_id=A.id ");
        }

        builder.append(" INNER JOIN ").append(NonVascularRecordExtension.QualifiedTableName)
            .append(" AS NonVasc ON R.id=NonVasc.record_id ");
        return builder;
    }

    private Optional<Integer> getYear(Record record) {
        if (record == null || record.getDateSpecifier().getDate() == null) {
            return Optional.empty();
        }
        Date date = record.getDateSpecifier().getDate();
        Calendar calendar = new GregorianCalendar();
        calendar.setTime(date);
        int year = calendar.get(Calendar.YEAR);

        return Optional.of(year);
    }

    private void populateWhereClause(StringBuilder query, Record record,
                                     Optional<Range<ReadablePartial>> optValidationRange, List<String> authorsSurnames,
                                     Optional<Substrate2> substrate2, int searchBufferMeters) {
        query.append(" WHERE T.id=").append(record.getTaxon().getId()).append(" AND ");

        if (optValidationRange.isPresent()) {
            Range<ReadablePartial> range = optValidationRange.get();
            String fromDate = formatDate(range.getMinimum());
            String toDate = formatDate(range.getMaximum());
            query.append(" R.datum BETWEEN '").append(fromDate).append("' AND '").append(toDate).append("' AND ");
        }

        if (!authorsSurnames.isEmpty()) {
            query.append(" A.surname IN ('");

            for (String surname : authorsSurnames) {
                query.append(surname).append("','");
            }
            query.append(authorsSurnames.get(0)).append("') "); //we copy this field one more time as this is the simplest implementation
            query.append("AND ");
        }

        if (record.hasCoords()) {
            Coordinates coords = record.getCoords();
            query.append(String.format(
                Locale.US,
                "ST_Intersects(R.coords_utm, " +
                    "ST_BUFFER(" +
                    "ST_TRANSFORM(" +
                    "ST_PointFromText('POINT(%f %f)', %d)," +
                    "%d)," +
                    " %d)" +
                    ") ",
                coords.getLongitude(), coords.getLatitude(), Srid.WGS84, Srid.UTM_33N,
                searchBufferMeters));
            query.append(" AND ");
        }

        if (substrate2.isPresent()) {
            query.append(" NonVasc.substrate_2_id = ").append(substrate2.get().getId()).append(" AND ");
        }

        query.append(" TRUE "); //complete the condition
        query.append(" limit 1");
    }

    private String formatDate(ReadablePartial date) {
        return date.toString(); // Output the date time in ISO8601 format (yyyy-MM-dd).
    }
}
