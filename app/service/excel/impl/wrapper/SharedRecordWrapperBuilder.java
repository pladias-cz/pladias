package service.excel.impl.wrapper;

import com.google.common.base.Strings;
import com.google.common.collect.ImmutableSet;
import excel.ExcelErrorInfo;
import excel.LicenseDictionary;
import helpers.date.DateConverter;
import helpers.date.DateDescriptor;
import helpers.parsers.AuthorListParser;
import helpers.parsers.CoordinatesParser;
import helpers.parsers.HerbariumListParser;
import helpers.parsers.TaxonNormalizer;
import helpers.strings.StringNormalizer;
import models.*;
import models.Record;

import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import play.i18n.Messages;
import service.excel.IExcelTableColumns;
import service.excel.IRecordColumnMapper;
import service.excel.ParsedRecordDetails;
import service.excel.impl.recordRow.RecordRow;
import utils.MapSquareResolver;

import java.security.InvalidParameterException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public abstract class SharedRecordWrapperBuilder extends RecordDetailsBuilderBase {
    private static final Pattern ALTITUDE_RANGE_PATTERN = Pattern.compile("\\s*(\\d*)\\s*[-–]\\s*(\\d*)\\s*");
    private static final String[] APPROXIMATIONS = new String[]{"cca.", "ca.", "cca", "ca", "asi"};
    private static final String SPECIES = " sp.";
    protected MapSquareResolver squareResolver;
    private final HashMap<String, Herbarium> herbariumsMap = new HashMap<>();
    private final HashMap<String, Author> authorsMap = new HashMap<>();
    private final HashMap<String, Author> unknownAuthorsMap = new HashMap<>();


    public SharedRecordWrapperBuilder(MapSquareResolver squareResolver, IRecordColumnMapper colMapper, Messages messages) {
        super(colMapper, messages);
        this.squareResolver = squareResolver;
    }

    @Override
    public ParsedRecordDetails build(RecordRow recordRow) {
        Record item = new Record();
        List<ExcelErrorInfo> errors = new ArrayList<>();
        List<ExcelErrorInfo> warnings = new ArrayList<>();
        List<ExcelErrorInfo> infos = new ArrayList<>();

        resolveTaxonId(recordRow, item, errors);

        String originalName = recordRow.get(colMapper.getColumn(IExcelTableColumns.ORIGINAL_NAME_COLUMN_ID));
        item.setOriginalName(normalizeSpaces(originalName));

        String locality = recordRow.get(colMapper.getColumn(IExcelTableColumns.LOCALITY_COLUMN_ID));
        item.setLocality(normalizeSpaces(locality));

        item.setOriginalityStatusById(RecordOriginalityStatus.Undefined);

        resolveAltitude(recordRow, item, errors, warnings);
        resolveGpsPosition(recordRow, item, errors);
        resolveGpsPositionSource(recordRow, item, errors);
        resolveGpsPrecision(recordRow, item, errors);

        resolveDate(recordRow, item, errors);
        resolveFinders(recordRow, item, errors, warnings);

        String comment = recordRow.get(colMapper.getColumn(IExcelTableColumns.COMMENT_COLUMN_ID));
        item.setComment(normalizeSpaces(comment));

        return populateCustomDetails(item, recordRow, errors, warnings, infos);
    }

    protected String normalizeSpaces(String input) {
        return StringNormalizer.normalizeSpaces(input);
    }

    abstract protected ParsedRecordDetails populateCustomDetails(Record item, RecordRow recordRow,
                                                                 List<ExcelErrorInfo> errors,
                                                                 List<ExcelErrorInfo> warnings,
                                                                 List<ExcelErrorInfo> infos);

    private void resolveTaxonId(RecordRow recordRow, Record item, List<ExcelErrorInfo> errors) {
        int column = colMapper.getColumn(IExcelTableColumns.TAXON_COLUMN_ID);
        String taxonName = recordRow.get(column);
        if (StringUtils.isEmpty(taxonName)) {
            errors.add(createErrorInfo(recordRow, column, messages.at("ExcelTableLoadService.invalidTaxon")));
            return;
        }
        String normalizedTaxonName = normalizeTaxonName(taxonName);
        //TODO: optimize - cache the values instead of running select every time
        Taxon taxon = Taxon.find().query().where().ieq("name_lat", normalizedTaxonName).findOne();
        if (taxon != null) {
            item.setTaxon(taxon);
        } else {
            errors.add(createErrorInfo(recordRow, colMapper.getColumn(IExcelTableColumns.TAXON_COLUMN_ID), messages.at("ExcelTableLoadService.invalidTaxon")));
        }
    }

    private String normalizeTaxonName(String taxonName) {
        if (taxonName == null)
            return null;
        if (taxonName.endsWith(SPECIES)) {
            taxonName = taxonName.substring(0, taxonName.length() - SPECIES.length());
        }
        return TaxonNormalizer.normalize(taxonName);
    }

    protected List<Herbarium> validateOrCreateHerbariumsIfNeeded(List<String> nonDuplicateRawInput, RecordRow recordRow, int column, List<ExcelErrorInfo> errors) {
        List<Herbarium> herbariums = new ArrayList<>();
        for (String name : nonDuplicateRawInput) {
            String abbrev;
            String herbKey;
            if (name.contains(" ")) // e.g. "herb. Z. Kaplan"
            {
                //this is a private herb
                abbrev = name.replace(" ", "").replace(".", ""); // e.g. "herbZKaplan"
                herbKey = abbrev;                                // e.g. "herbZKaplan"
            } else {
                abbrev = name;                           //e.g. "PR"
                herbKey = "herb" + name.toUpperCase();   //e.g. "herbPR"
            }
            //String
            Herbarium herb = null;
            if (herbariumsMap.containsKey(herbKey)) {
                herb = herbariumsMap.get(herbKey);
            } else {
                herb = Herbarium.findByAbbrev(abbrev);
            }
            if (herb == null) {
                //create new:
                herb = new Herbarium();
                herb.setAbbrev(abbrev);
                herb.setName(name);
                herb.setValidated(false);
                herb.setImportId(herbKey);

                if (utils.ConfigHelper.isVascular()) {
                    //treat this as error only at vascular
                    errors.add(createErrorInfo(recordRow,
                        column,
                        messages.at("ExcelTableLoadService.unknownHerbarium", name)));
                }
            }
            herbariumsMap.put(herbKey, herb);
            herbariums.add(herb);
        }
        return herbariums;
    }

    protected void resolveHerbariums(RecordRow recordRow, Record record, List<ExcelErrorInfo> errors) {
        if (!colMapper.containsColumn(IExcelTableColumns.HERBARIUM_COLUMN_ID))
            return;

        int column = colMapper.getColumn(IExcelTableColumns.HERBARIUM_COLUMN_ID);
        String input = recordRow.get(column);
        if (StringUtils.isEmpty(input))
            return;

        List<String> list = HerbariumListParser.parse(input);
        list = ImmutableSet.copyOf(list).asList();

        if (!list.isEmpty()) {
            List<Herbarium> herbariums = validateOrCreateHerbariumsIfNeeded(list, recordRow, column, errors);
            record.setHerbariums(herbariums);
        } else {
            errors.add(createErrorInfo(recordRow, column,
                messages.at("ExcelTableLoadService.unknownHerbarium", input)));
        }
    }


    private void resolveFinders(RecordRow recordRow, Record item, List<ExcelErrorInfo> errors, List<ExcelErrorInfo> warnings) {
        int column = colMapper.getColumn(IExcelTableColumns.FINDER_COLUMN_ID);
        String input = recordRow.get(column);
        if (StringUtils.isEmpty(input)) {
            //optional field
            return;
        }

        try {
            List<Pair<String, String>> authorNames = AuthorListParser.parse(input, messages);
            //verify that there is no duplicate author:
            verifyNoDuplicateAuthors(authorNames);
            List<RecordAuthor> recordAuthors = new ArrayList<>();
            int authorOrder = 1;
            for (Pair<String, String> name : authorNames) {
                Author author = null;
                String nameKey = name.getLeft() + name.getRight();

                if (unknownAuthorsMap.containsKey(nameKey)) {
                    author = unknownAuthorsMap.get(nameKey);
                    warnings.add(createErrorInfo(recordRow, column, messages.at("ExcelTableLoadService.unknownAuthor")));
                    RecordAuthor ra = new RecordAuthor();
                    ra.setRecord(item);
                    ra.setAuthor(author);
                    recordAuthors.add(ra);
                    continue;
                } else if (authorsMap.containsKey(nameKey)) {
                    author = authorsMap.get(nameKey);
                } else {
                    author = Author.findByName(name.getLeft(), name.getRight());
                }

                if (author == null) {
                    author = new Author();
                    author.setSurname(name.getLeft());
                    author.setName(name.getRight());
                    warnings.add(createErrorInfo(recordRow, colMapper.getColumn(IExcelTableColumns.FINDER_COLUMN_ID), messages.at("ExcelTableLoadService.unknownAuthor")));
                    String unknownNameKey = name.getLeft() + name.getRight();
                    unknownAuthorsMap.put(unknownNameKey, author);
                } else {
                    authorsMap.put(nameKey, author);
                }
                RecordAuthor ra = new RecordAuthor();
                ra.setAuthor(author);
                ra.setSuccession(authorOrder++);
                ra.setRecord(item);
                recordAuthors.add(ra);
            }
            item.setFinders(recordAuthors);
        } catch (Exception e) {
            errors.add(createErrorInfo(recordRow, colMapper.getColumn(IExcelTableColumns.FINDER_COLUMN_ID), e.getMessage()));
        }
    }

    private void verifyNoDuplicateAuthors(List<Pair<String, String>> authorNames) throws Exception {
        Set<String> authorsSet = new HashSet<>();
        for (Pair<String, String> author : authorNames) {
            String surname = Strings.nullToEmpty(author.getLeft());
            String name = Strings.nullToEmpty(author.getRight());
            String key = surname + name;
            if (authorsSet.contains(key)) {
                throw new Exception(messages.at("ExcelTableLoadService.duplicateAuthor", surname));
            }
            authorsSet.add(key);
        }
    }

    private void resolveDate(RecordRow recordRow, Record item, List<ExcelErrorInfo> errors) {
        int column = colMapper.getColumn(IExcelTableColumns.DATE_COLUMN_ID);
        String value = recordRow.get(column);
        if (StringUtils.isEmpty(value)) {
            item.setDateSpecifier(new DateSpecifier(null, null));
            return;
        }
        DateSpecifier dateSpecifier = null;
        try {
            DateDescriptor dateDesc = DateConverter.toDate(value, messages);
            dateSpecifier = DateSpecifier.createFromDateDescriptor(dateDesc);

        } catch (InvalidParameterException e) {
            errors.add(createErrorInfo(recordRow, column, messages.at("ExcelTableLoadService.invalidDate")));
            dateSpecifier = new DateSpecifier(null, null);
        }
        //we assign the reference anyway - even when the date was invalid
        item.setDateSpecifier(dateSpecifier);
    }

    private void resolveAltitude(RecordRow recordRow, Record item, List<ExcelErrorInfo> errors, List<ExcelErrorInfo> warnings) {
        int column = colMapper.getColumn(IExcelTableColumns.ALTITUDE_COLUMN_ID);
        String value = recordRow.get(column);
        if (StringUtils.isEmpty(value)) {
            return;
        }

        for (String approx : APPROXIMATIONS) {
            if (value.startsWith(approx)) {
                item.setAltitudeApproximation(true);
                value = value.substring(approx.length()).trim();
                break;
            }
        }

        try {
            int altitudeMin, altitudeMax;
            Matcher m = ALTITUDE_RANGE_PATTERN.matcher(value);
            if (m.matches()) {
                altitudeMin = Integer.parseInt(m.group(1));
                altitudeMax = Integer.parseInt(m.group(2));
            } else {
                altitudeMin = altitudeMax = (int) Float.parseFloat(value);
            }
            item.setAltitudeMin(altitudeMin);
            item.setAltitudeMax(altitudeMax);
        } catch (NumberFormatException e) {
            errors.add(createErrorInfo(recordRow, column, messages.at("ExcelTableLoadService.invalidAltitude")));
        }
    }

    private void resolveGpsPosition(RecordRow recordRow, Record item, List<ExcelErrorInfo> errors) {
        int column = colMapper.getColumn(IExcelTableColumns.GPS_COORDS_COLUMN_ID);
        String rawInput = recordRow.get(column);
        if (StringUtils.isEmpty(rawInput)) {
            return;
        }

        try {
            Pair<Double, Double> point = CoordinatesParser.parse(rawInput, messages);
            item.setLongitude(point.getLeft());
            item.setLatitude(point.getRight());
        } catch (InvalidParameterException e) {
            errors.add(createErrorInfo(recordRow, column, e.getMessage()));
        }
    }

    private void resolveGpsPositionSource(RecordRow recordRow, Record item, List<ExcelErrorInfo> errors) {
        String gpsSource = recordRow.get(colMapper.getColumn(IExcelTableColumns.GPS_COORDS_SOURCE_COLUMN_ID));
        item.setGpsCoordSource(gpsSource);
    }

    private void resolveGpsPrecision(RecordRow recordRow, Record item, List<ExcelErrorInfo> errors) {
        int column = colMapper.getColumn(IExcelTableColumns.GPS_COORDS_PRECISION_COLUMN_ID);
        String gpsPrecisionRaw = recordRow.get(column);
        try {
            if (StringUtils.isNotEmpty(gpsPrecisionRaw)) {
                int value = Integer.parseInt(gpsPrecisionRaw);
                item.setGpsCoordsPrecision(value);
            }
        } catch (NumberFormatException e) {
            errors.add(createErrorInfo(recordRow, column, messages.at("ExcelTableLoadService.invalidGpsPrecision")));
        }
    }

    protected void resolveLicense(RecordRow recordRow, Record item, List<ExcelErrorInfo> errors) {
        try {
            if (!colMapper.containsColumn(IExcelTableColumns.LICENSE_COLUMN_ID)) {
                License license = LicenseDictionary.getInstance().getDefault();
                item.setLicense(license);
                return;
            }

            int column = colMapper.getColumn(IExcelTableColumns.LICENSE_COLUMN_ID);
            String key = recordRow.get(column);
            License license = LicenseDictionary.getInstance().getDefault();//default value in case it is not set
            if (StringUtils.isNotBlank(key)) {
                license = LicenseDictionary.getInstance().getByKey(key);
            }
            item.setLicense(license);
        } catch (Exception e) {
            int column = colMapper.getColumn(IExcelTableColumns.LICENSE_COLUMN_ID);
            errors.add(createErrorInfo(recordRow, column, messages.at("ExcelTableLoadService.invalidLicense")));
        }
    }

    protected void resolveForeignId(RecordRow recordRow, Record item) {
        if (!colMapper.containsColumn(IExcelTableColumns.FOREIGN_COLUMN_ID)) {
            return;
        }

        int column = colMapper.getColumn(IExcelTableColumns.FOREIGN_COLUMN_ID);
        String foreignId = recordRow.get(column);

        if (StringUtils.isNotBlank(foreignId)) {
            item.setOriginalId(foreignId);
        }
    }
}
