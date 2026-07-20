package helpers.date;

import play.i18n.Messages;

import java.security.InvalidParameterException;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class DateConverter {

    private static final DateFormat YearFormat = new SimpleDateFormat("yyyy");
    private static final DateFormat MonthYearFormat = new SimpleDateFormat("MMyyyy");
    private static final DateFormat DayMonthYearFormat = new SimpleDateFormat("ddMMyyyy");
    private static final DateFormat DayDotMonthDotYearFormat = new SimpleDateFormat("dd.MM.yyyy");
    private static final Pattern SineDatum = Pattern.compile("s.\\s*d.\\s*");
    private static final Pattern DayDotMonthDotYearPattern = Pattern.compile("(\\d+)\\.(\\d+)\\.(\\d+)");
    private static final Pattern YearMonDayPattern = Pattern.compile("(\\d\\d\\d\\d)-(\\d\\d)-(\\d\\d)");
    private static final Pattern YearMonPattern = Pattern.compile("(\\d\\d\\d\\d)-(\\d\\d)");
    private DateConverter() {
    }

    public static DateDescriptor toDate(String input, Messages messages) throws InvalidParameterException {
        if (input == null || "".equals(input))
            throw new InvalidParameterException(messages.at("DateConverter.InvalidInput"));


        if (matchesSineDatumPattern(input)) {
            return new DateDescriptor(null, DatePrecision.INVALID);
        }

        if (matchesDayDotMonthDotYearPattern(input)) {
            return parse(DayDotMonthDotYearFormat, input, DatePrecision.DAY, messages);
        }

        switch (input.length()) {
            case 4:
                return parse(YearFormat, input, DatePrecision.YEAR, messages);
            case 6:
                return parse(MonthYearFormat, input, DatePrecision.MONTH, messages);
            case 7:
                return parseYearMonPattern(input, messages);
            case 8:
                return parse(DayMonthYearFormat, input, DatePrecision.DAY, messages);
            case 10:
                return parseYearMonDayPattern(input, messages);
            default:
                throw new InvalidParameterException(messages.at("DateConverter.InvalidInputLength"));
        }
    }

    private static boolean matchesDayDotMonthDotYearPattern(String input) {
        Matcher matcher = DayDotMonthDotYearPattern.matcher(input);
        return matcher.matches();
    }

    private static boolean matchesSineDatumPattern(String input) {
        Matcher matcher = SineDatum.matcher(input);
        return matcher.matches();
    }

    private static DateDescriptor parseYearMonPattern(String input, Messages messages) {
        Matcher matcher = YearMonPattern.matcher(input);
        if (!matcher.matches()) {
            throw new InvalidParameterException(messages.at("DateConverter.InvalidInput"));
        }

        int year = Integer.parseInt(matcher.group(1));
        int mon = Integer.parseInt(matcher.group(2));

        DatePrecision precision = DatePrecision.MONTH;
        if (mon == 0) {
            precision = DatePrecision.YEAR;
        }

        //when mon in input is equal to zero, it means that it is not set. Calendar.set() expects the mon value to be zero-based
        if (mon > 0) {
            mon--;
        }

        if (!IsValidYear(year) || !IsValidMonth(mon)) {
            throw new InvalidParameterException(messages.at("DateConverter.InvalidInput"));
        }

        Calendar cal = Calendar.getInstance();
        cal.set(year, mon, 1);
        return new DateDescriptor(cal.getTime(), precision);
    }

    private static boolean IsValidMonth(int month) {
        return (month >= 0 && month <= 11);
    }

    private static boolean IsValidDay(int day) {
        return (day > 0 && day <= 31);
    }

    private static boolean IsValidYear(int year) {
        int currentYear = Calendar.getInstance().get(Calendar.YEAR);
        return (year > 1700 && year <= currentYear);
    }

    private static DateDescriptor parseYearMonDayPattern(String input, Messages messages) {
        Matcher matcher = YearMonDayPattern.matcher(input);
        if (!matcher.matches()) {
            throw new InvalidParameterException(messages.at("DateConverter.InvalidInput"));
        }

        int year = Integer.parseInt(matcher.group(1));
        int mon = Integer.parseInt(matcher.group(2));
        int day = Integer.parseInt(matcher.group(3));

        DatePrecision precision = DatePrecision.DAY;
        if (day == 0) {
            precision = DatePrecision.MONTH;
        }
        if (mon == 0) {
            precision = DatePrecision.YEAR;
        }

        //when mon in input is equal to zero, it means that it is not set. Calendar.set() expects the mon value to be zero-based
        if (mon > 0) {
            mon--;
        }

        if (day == 0) {
            day = 1;
        }

        if (!IsValidYear(year) || !IsValidMonth(mon) || !IsValidDay(day)) {
            throw new InvalidParameterException(messages.at("DateConverter.InvalidInput"));
        }

        Calendar cal = Calendar.getInstance();
        cal.set(year, mon, day);
        return new DateDescriptor(cal.getTime(), precision);
    }

    private static DateDescriptor parse(DateFormat format, String input, DatePrecision datePrecision, Messages messages) {
        try {
            format.setLenient(false);
            return new DateDescriptor(format.parse(input), datePrecision);
        } catch (ParseException e) {
            throw new InvalidParameterException(messages.at("DateConverter.InvalidInput"));
        }
    }

}
