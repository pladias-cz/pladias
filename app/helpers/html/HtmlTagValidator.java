package helpers.html;

import helpers.exceptions.HtmlParseException;
import org.apache.commons.lang3.StringUtils;

import java.util.Stack;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class HtmlTagValidator {

    private static final String HTML_TAG_PATTERN = "<(/?[^<>]*)>";
    private final Pattern pattern;

    public HtmlTagValidator() {
        pattern = Pattern.compile(HTML_TAG_PATTERN);
    }

    public void validate(final String input) throws HtmlParseException {
        if (StringUtils.isEmpty(input))
            return;

        Stack<String> stack = new Stack<>();
        Matcher matcher = pattern.matcher(input);
        int start = 0;
        while (matcher.find(start)) {
            String tag = matcher.group(1);
            start = matcher.end();
            if (isEmptyTag(tag)) {
                throw new HtmlParseException("Empty tag is not valid.");
            } else if (isOpeningTag(tag)) {
                stack.push(tag);
                continue;
            } else if (stack.empty()) {
                throw new HtmlParseException("Found closing tag <" + tag + "> without opening tag.");
            }

            String opening = stack.pop();
            if (!tag.equals("/" + opening)) {
                throw new HtmlParseException("Opening tag <" + opening + "> not matching to closing tag <" + tag + ">.");
            }
        }
        if (!stack.empty()) {
            throw new HtmlParseException("Missing one or more closing tags.");
        }
    }

    private boolean isEmptyTag(String tag) {
        {
            return StringUtils.isBlank(tag);
        }
    }

    private boolean isOpeningTag(String tag) {
        boolean isOpening = StringUtils.isNotEmpty(tag) && tag.charAt(0) != '/';
        return isOpening;
    }
}
