package serializers;

import models.Author;

import java.util.List;

public class AuthorsSerializer {

    public static String serialize(List<Author> authors, boolean surnameFirst) {
        if (authors == null)
            return "";

        StringBuilder authorList = new StringBuilder();
        for (Author author : authors) {
            String a;
            if (surnameFirst) {
                a = String.format("%s, %s", author.getSurname(), author.getName());
            } else {
                a = String.format("%s %s", author.getName(), author.getSurname());
            }
            if (authorList.length() > 0) {
                authorList.append("; ");
            }
            authorList.append(a);
        }
        return authorList.toString();
    }
}
