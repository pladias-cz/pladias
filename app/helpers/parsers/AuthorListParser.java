package helpers.parsers;

import org.apache.commons.lang3.tuple.Pair;
import play.i18n.Messages;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;


public class AuthorListParser {
    public static final String NoAuthorDefined = "s. coll.";
    public static final String AuthorUnreadable = "coll.?";
    public static final String AndOthers = "et al.";
    public static final String AndOthersCzech = "a kol.";


    private static final Pattern NamePattern = Pattern.compile("([^\\s]+)(?:,\\s+(.+))?");
    private static final Pattern CompoundNamePattern = Pattern.compile("([^,]+),\\s+(.+)"); //"Niessl von Mayendorf, Gustaf
    private static final Pattern NameWithAbbrevPattern = Pattern.compile("([^\\s]+\\s+[a-z]+\\.)"); //"Mayer jun."


    public static List<Pair<String, String>> parse(String input, Messages messages) {
        List<Pair<String, String>> authors = new ArrayList<Pair<String, String>>();
        if (input == null)
            throw new IllegalArgumentException(messages.at("AuthorListParser.InputCannotBeEmpty"));

        input = input.trim();

        if (input.equals(NoAuthorDefined)) {
            authors.add(Pair.of(NoAuthorDefined, ""));
        } else if (input.equals(AuthorUnreadable)) {
            authors.add(Pair.of(AuthorUnreadable, ""));
        } else {
            String[] fields = input.split("\\s*([;&]|(:?\\set\\s))\\s*");
            for (String entry : fields) {

                if (AndOthers.equals(entry) || AndOthersCzech.equals(entry)) {
                    authors.add(Pair.of(AndOthers, ""));
                    continue;
                }

                Matcher m = NamePattern.matcher(entry);
                if (m.matches()) {
                    String surname = m.group(1).replace('_', ' ');//to manage inputs like "Della_Torre" -> "Della Torre"
                    String name = m.group(2) != null ? m.group(2) : "";
                    authors.add(Pair.of(surname, name));
                    continue;
                }

                m = CompoundNamePattern.matcher(entry);
                if (m.matches()) {
                    String surname = m.group(1);
                    String name = m.group(2) != null ? m.group(2) : "";
                    authors.add(Pair.of(surname, name));
                    continue;
                }

                m = NameWithAbbrevPattern.matcher(entry);
                if (m.matches()) {
                    String surname = m.group(1);
                    authors.add(Pair.of(surname, ""));
                    continue;
                }

                throw new IllegalArgumentException(messages.at("AuthorListParser.InvalidAuthorName", entry));
            }
        }

        return authors;
    }
}
