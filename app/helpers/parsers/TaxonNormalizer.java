package helpers.parsers;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TaxonNormalizer {

    private static final char X = 'x';
    private static final char Multiply = '×';

    //Centaurea erdneri x C. jacea x C. oxylepis
    private static final Pattern Mutant0Pattern = Pattern.compile("(.+) " + X + " ([A-Z].+) " + X + " ([A-Z].+)");

    //"Alnus x pubescens"
    private static final Pattern Mutant1Pattern = Pattern.compile("(.+) " + X + " ([a-z].+)");
    //"Alnus × pubescens" or "Alnus ×pubescens"
    private static final Pattern Mutant2Pattern = Pattern.compile("(.+) " + Multiply + " ([a-z].+)");

    //"x Orchidactyla boudieri"
    private static final Pattern Mutant3Pattern = Pattern.compile("^" + X + " ([A-Z].+)");
    private static final Pattern Mutant4Pattern = Pattern.compile("^" + Multiply + " ([A-Z].+)");

    //Veronica incana x V. maritima
    private static final Pattern Mutant5Pattern = Pattern.compile("(.+) " + X + " ([A-Z].+)");


    public static String normalize(String input) {
        Matcher m;

        m = Mutant0Pattern.matcher(input);
        if (m.matches()) {
            return m.group(1) + " " + Multiply + " " + m.group(2) + " " + Multiply + " " + m.group(3);
        }

        m = Mutant1Pattern.matcher(input);
        if (m.matches()) {
            return m.group(1) + " " + Multiply + m.group(2);
        }

        m = Mutant2Pattern.matcher(input);
        if (m.matches()) {
            return m.group(1) + " " + Multiply + m.group(2);
        }

        m = Mutant3Pattern.matcher(input);
        if (m.matches()) {
            return Multiply + m.group(1);
        }

        m = Mutant4Pattern.matcher(input);
        if (m.matches()) {
            return Multiply + m.group(1);
        }

        m = Mutant5Pattern.matcher(input);
        if (m.matches()) {
            return m.group(1) + " " + Multiply + " " + m.group(2);
        }
        //default;
        return input;
    }
}
