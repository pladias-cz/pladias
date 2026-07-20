package models;

import io.ebean.Finder;
import io.ebean.Model;
import jakarta.persistence.*;
import models.types.LanguageCode;

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
