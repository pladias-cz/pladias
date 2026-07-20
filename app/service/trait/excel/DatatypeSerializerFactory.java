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
        switch (feature.getDatatype().getId()) {
            case Datatype.BooleanDatatypeId:
                return new BoolDeserializer(options, messages);
            case Datatype.EnumNominalDatatypeId:
            case Datatype.EnumOrdinalDatatypeId:
                return new EnumDeserializer(feature.getEnumerate(), options, messages, true);
            case Datatype.EnumOrdinalSingleDatatypeId:
                return new EnumDeserializer(feature.getEnumerate(), options, messages, false);
            case Datatype.EnumSyntaxonsDatatypeId:
                return new SyntaxonDeserializer(feature, options, messages);
            case Datatype.IntegerDatatypeId:
                return new IntegerDeserializer(feature, options, messages);
            case Datatype.YearDatatypeId:
                return new YearDeserializer(feature, options, messages);
            case Datatype.MonthDatatypeId:
                return new MonthDeserializer(options, messages);
            case Datatype.PercentageDatatypeId:
                return new PercentageDeserializer(options, messages);
            case Datatype.CrossTaxonDatatypeId:
                return new CrossTaxonDeserializer(options, messages);
            case Datatype.RealDatatypeId:
                return new RealDeserializer(options, messages, feature);
            case Datatype.RealMultiDatatypeId:
                return new RealMultiDeserializer(options, messages, feature);
            case Datatype.IntervalAvgDatatypeId:
                return new IntegerAvgDeserializer(options, messages);
            default:
                throw new Exception("Invalid datatype");
        }
    }

    public static AbstractDatatypeSerializer createSerializer(Feature feature, UserOptions options, Messages messages, Locale locale, Workbook workbook, Sheet sheet) throws Exception {
        switch (feature.getDatatype().getId()) {
            case Datatype.BooleanDatatypeId:
                return new BoolSerializer(options, messages, locale, workbook, sheet);
            case Datatype.EnumNominalDatatypeId:
            case Datatype.EnumOrdinalDatatypeId:
            case Datatype.EnumOrdinalSingleDatatypeId:
                return new EnumSerializer(feature.getEnumerate(), options, messages, locale, workbook, sheet);
            case Datatype.EnumSyntaxonsDatatypeId:
                return new SyntaxonSerializer(options, messages, locale, workbook, sheet);
            case Datatype.IntegerDatatypeId:
                return new IntegerSerializer(options, messages, locale, workbook, sheet);
            case Datatype.YearDatatypeId:
                return new YearSerializer(options, messages, locale, workbook, sheet);
            case Datatype.MonthDatatypeId:
                return new MonthSerializer(options, messages, locale, workbook, sheet);
            case Datatype.PercentageDatatypeId:
                return new PercentageSerializer(options, messages, locale, workbook, sheet);
            case Datatype.CrossTaxonDatatypeId:
                return new CrossTaxonSerializer(options, messages, locale, workbook, sheet);
            case Datatype.RealDatatypeId:
                return new RealSerializer(options, messages, locale, workbook, sheet);
            case Datatype.RealMultiDatatypeId:
                return new RealMultiSerializer(options, messages, locale, workbook, sheet);
            case Datatype.IntervalAvgDatatypeId:
                return new IntegerAvgSerializer(options, messages, locale, workbook, sheet);
            case Datatype.DistributionDatatypeId:
                return new DistributionSerializer(options, messages, locale, workbook, sheet);
            default:
                throw new Exception("Invalid datatype");
        }
    }
}
