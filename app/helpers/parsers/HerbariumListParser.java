package helpers.parsers;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;


public class HerbariumListParser {

    private static final Pattern HerbariumsPattern = Pattern.compile("herb([a-za-zA-ZáčďéěíňóřšťůúýžÁČĎÉĚÍŇÓŘŠŤŮÚÝŽ]+);?", Pattern.CASE_INSENSITIVE);
    private static final Pattern PrivateHerbariumsPattern = Pattern.compile("(herb.?\\s+[a-za-zA-ZáčďéěíňóřšťůúýžÁČĎÉĚÍŇÓŘŠŤŮÚÝŽßäöü\\s.]+);?", Pattern.CASE_INSENSITIVE);

    private static final String HerbPrefix = "herb";


    public static List<String> parse(String input) {
        List<String> herbariums = new ArrayList<>();
        if (input == null)
            return herbariums;

        input = input.trim();

        if (!input.toLowerCase().startsWith(HerbPrefix))
            return herbariums;

        Matcher m = HerbariumsPattern.matcher(input);

        while (m.find()) {
            herbariums.add(m.group(1).toUpperCase());
        }

        m = PrivateHerbariumsPattern.matcher(input);
        while (m.find()) {
            herbariums.add(m.group(1).trim());
        }

        return herbariums;
    }
}
