package models;

import io.ebean.Finder;
import io.ebean.Model;
import jakarta.persistence.*;
import models.types.LanguageCode;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = PlayMessage.QualifiedTableName)
public class PlayMessage extends Model {
    public static final String QualifiedTableName = "public.play_messages";

    public static final String LOGIN_PAGE_TEXTS_KEY = "login_page_texts";
    public static final String LOGIN_PAGE_TITLES_KEY = "login_page_titles";
    public static final String MAIN_PAGE_TEXTS_KEY = "main_page_texts";
    public static final String NEW_USER_MAIL_KEY = "new_user_mail";
    public static final String PROJECT_NAME_KEY = "project_name";
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "public.play_messages_id_seq")
    private long id;
    @Column(nullable = false, name = "key")
    private String key;
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "language_code", nullable = false, name = "language")
    private LanguageCode language;
    @Column(nullable = false, name = "value")
    private String value;

    public static Finder<Integer, PlayMessage> find() {
        return new Finder<>(PlayMessage.class);
    }

    public static PlayMessage getMessage(String key, LanguageCode language) {
        return find().query().where()
            .eq("key", key)
            .raw("language = ?::language_code", language)
            .findOne();
    }

    /**
     * Klíče všech konstant zpráv (statická pole String končící na "_KEY").
     * Jediný zdroj pravdy pro sysAdmin editor textů – nově přidaná konstanta se v něm objeví automaticky.
     */
    public static List<String> getConstantKeys() {
        List<String> keys = new ArrayList<>();
        for (Field field : PlayMessage.class.getDeclaredFields()) {
            if (field.getType() == String.class
                && field.getName().endsWith("_KEY")
                && Modifier.isStatic(field.getModifiers())
                && Modifier.isFinal(field.getModifiers())) {
                try {
                    keys.add((String) field.get(null));
                } catch (IllegalAccessException ignored) {
                    // unreachable for public fields
                }
            }
        }
        return keys;
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public LanguageCode getLanguage() {
        return language;
    }

    public void setLanguage(LanguageCode language) {
        this.language = language;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }
}
