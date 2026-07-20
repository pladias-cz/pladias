package formatters;

import org.joda.time.LocalDate;
import play.data.format.Formatters.SimpleFormatter;

import java.text.ParseException;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class DateFormatter extends SimpleFormatter<LocalDate> {
    private final Pattern DatePattern = Pattern.compile("(\\d\\d\\d\\d)-(\\d\\d)-(\\d\\d)");

    @Override
    public String print(LocalDate localDate, Locale l) {
        return localDate.toString("yyyy-MM-dd");
    }

    @Override
    public LocalDate parse(String input, Locale locale) throws ParseException {
        Matcher m = DatePattern.matcher(input);
        if (!m.find()) throw new ParseException("No valid Input", 0);
        int year = Integer.valueOf(m.group(1));
        int month = Integer.valueOf(m.group(2));
        int day = Integer.valueOf(m.group(3));
        return new LocalDate(year, month, day);
    }
}


