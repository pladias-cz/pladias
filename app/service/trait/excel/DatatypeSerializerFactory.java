package service.trait.excel;

import models.traits.Datatype;
import models.traits.Feature;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import play.i18n.Messages;
import service.trait.excel.bool.BoolDeserializer;
import service.trait.excel.bool.BoolSerializer;
import service.trait.excel.distribution.DistributionSerializer;
import service.trait.excel.enumerate.EnumDeserializer;
import service.trait.excel.enumerate.EnumSerializer;
import service.trait.excel.enumerate.SyntaxonDeserializer;
import service.trait.excel.enumerate.SyntaxonSerializer;
import service.trait.excel.intavg.IntegerAvgDeserializer;
import service.trait.excel.intavg.IntegerAvgSerializer;
import service.trait.excel.integer.IntegerDeserializer;
import service.trait.excel.integer.IntegerSerializer;
import service.trait.excel.month.MonthDeserializer;
import service.trait.excel.month.MonthSerializer;
import service.trait.excel.percentage.PercentageDeserializer;
import service.trait.excel.percentage.PercentageSerializer;
import service.trait.excel.real.RealDeserializer;
import service.trait.excel.real.RealMultiDeserializer;
import service.trait.excel.real.RealMultiSerializer;
import service.trait.excel.real.RealSerializer;
import service.trait.excel.taxontaxon.CrossTaxonDeserializer;
import service.trait.excel.taxontaxon.CrossTaxonSerializer;
import service.trait.excel.year.YearDeserializer;
import service.trait.excel.year.YearSerializer;
import settings.user.UserOptions;

import java.util.Locale;

public class DatatypeSerializerFactory {
    //prevent instantiation
    private DatatypeSerializerFactory() {
    }

    public static AbstractDatatypeDeserializer createDeserializer(Feature feature, UserOptions options, Messages messages) throws Exception {
        return switch (feature.getDatatype().getId()) {
            case Datatype.BooleanDatatypeId -> new BoolDeserializer(options, messages);
            case Datatype.EnumNominalDatatypeId, Datatype.EnumOrdinalDatatypeId ->
                new EnumDeserializer(feature.getEnumerate(), options, messages, true);
            case Datatype.EnumOrdinalSingleDatatypeId ->
                new EnumDeserializer(feature.getEnumerate(), options, messages, false);
            case Datatype.EnumSyntaxonsDatatypeId -> new SyntaxonDeserializer(feature, options, messages);
            case Datatype.IntegerDatatypeId -> new IntegerDeserializer(feature, options, messages);
            case Datatype.YearDatatypeId -> new YearDeserializer(feature, options, messages);
            case Datatype.MonthDatatypeId -> new MonthDeserializer(options, messages);
            case Datatype.PercentageDatatypeId -> new PercentageDeserializer(options, messages);
            case Datatype.CrossTaxonDatatypeId -> new CrossTaxonDeserializer(options, messages);
            case Datatype.RealDatatypeId -> new RealDeserializer(options, messages, feature);
            case Datatype.RealMultiDatatypeId -> new RealMultiDeserializer(options, messages, feature);
            case Datatype.IntervalAvgDatatypeId -> new IntegerAvgDeserializer(options, messages);
            default -> throw new Exception("Invalid datatype");
        };
    }

    public static AbstractDatatypeSerializer createSerializer(Feature feature, UserOptions options, Messages messages, Locale locale, Workbook workbook, Sheet sheet) throws Exception {
        return switch (feature.getDatatype().getId()) {
            case Datatype.BooleanDatatypeId -> new BoolSerializer(options, messages, locale, workbook, sheet);
            case Datatype.EnumNominalDatatypeId, Datatype.EnumOrdinalDatatypeId, Datatype.EnumOrdinalSingleDatatypeId ->
                new EnumSerializer(feature.getEnumerate(), options, messages, locale, workbook, sheet);
            case Datatype.EnumSyntaxonsDatatypeId -> new SyntaxonSerializer(options, messages, locale, workbook, sheet);
            case Datatype.IntegerDatatypeId -> new IntegerSerializer(options, messages, locale, workbook, sheet);
            case Datatype.YearDatatypeId -> new YearSerializer(options, messages, locale, workbook, sheet);
            case Datatype.MonthDatatypeId -> new MonthSerializer(options, messages, locale, workbook, sheet);
            case Datatype.PercentageDatatypeId -> new PercentageSerializer(options, messages, locale, workbook, sheet);
            case Datatype.CrossTaxonDatatypeId -> new CrossTaxonSerializer(options, messages, locale, workbook, sheet);
            case Datatype.RealDatatypeId -> new RealSerializer(options, messages, locale, workbook, sheet);
            case Datatype.RealMultiDatatypeId -> new RealMultiSerializer(options, messages, locale, workbook, sheet);
            case Datatype.IntervalAvgDatatypeId -> new IntegerAvgSerializer(options, messages, locale, workbook, sheet);
            case Datatype.DistributionDatatypeId ->
                new DistributionSerializer(options, messages, locale, workbook, sheet);
            default -> throw new Exception("Invalid datatype");
        };
    }
}
