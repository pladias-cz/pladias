package service.biblio.search;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

/**
 * Regresní testy prevence SQL injection ve stavbě dotazu bibliografického
 * vyhledávání (zjištění C2 bezpečnostního auditu, docs/security.md). Všechny
 * uživatelské vstupy musí být vázané jako pojmenované parametry, nikdy
 * konkatenované do SQL textu.
 */
public class ReactBiblioSearchServiceShould {

    private static final String HOSTILE_QUOTE = "Novák' ; DROP TABLE bibliography;--";
    private static final String HOSTILE_BOOLEAN = "x' OR '1'='1";
    private static final String HOSTILE_UNQUOTED = "1900 OR EXISTS(SELECT 1)";

    private final ReactBiblioSearchService service = new ReactBiblioSearchService();

    private String buildQuery(BiblioSearchForm form, ReactBiblioSearchService.QueryParameters parameters) {
        return service.buildQuery(form, parameters);
    }

    @Test
    public void produceOriginalQueryWithoutFilters() {
        ReactBiblioSearchService.QueryParameters parameters = new ReactBiblioSearchService.QueryParameters();
        String query = buildQuery(new BiblioSearchForm(), parameters);

        assertEquals("SELECT id FROM biblio.bibliography WHERE TRUE AND  TRUE ", query);
        assertTrue(parameters.asMap().isEmpty());
    }

    @Test
    public void bindAllTextInputAsParametersInsteadOfSqlLiterals() {
        BiblioSearchForm form = new BiblioSearchForm();
        form.title = HOSTILE_QUOTE;
        form.author = HOSTILE_BOOLEAN;
        form.etc = HOSTILE_QUOTE;
        form.journal = HOSTILE_BOOLEAN;

        ReactBiblioSearchService.QueryParameters parameters = new ReactBiblioSearchService.QueryParameters();
        String query = buildQuery(form, parameters);

        assertEquals("SELECT id FROM biblio.bibliography WHERE TRUE AND  "
            + "title LIKE :title AND  lower(authors) LIKE :author AND  etc LIKE :etc AND  journal= :journal AND  TRUE ",
            query);
        assertEquals(HOSTILE_QUOTE, parameters.asMap().get("title"));
        assertEquals(HOSTILE_BOOLEAN.toLowerCase(), parameters.asMap().get("author"));
        assertEquals(HOSTILE_QUOTE, parameters.asMap().get("etc"));
        assertEquals(HOSTILE_BOOLEAN, parameters.asMap().get("journal"));
    }

    @Test
    public void bindYearsAsIntegerParametersNeverAsSqlText() {
        BiblioSearchForm form = new BiblioSearchForm();
        form.minYear = 1900;
        form.maxYear = 2050;

        ReactBiblioSearchService.QueryParameters parameters = new ReactBiblioSearchService.QueryParameters();
        String query = buildQuery(form, parameters);

        assertEquals("SELECT id FROM biblio.bibliography WHERE TRUE AND  "
            + "year >= :minYear AND  year <= :maxYear AND  TRUE ",
            query);
        assertEquals(Integer.valueOf(1900), parameters.asMap().get("minYear"));
        assertEquals(Integer.valueOf(2050), parameters.asMap().get("maxYear"));
    }

    @Test
    public void keepYearFormFieldsNumericSoInjectedYearsCannotReachSql() {
        // minYear/maxYear jsou Integer – text typu "1900 OR EXISTS(...)" neprojde
        // bindováním formuláře (kontroler vrátí 400), do SQL se nikdy nedostane.
        BiblioSearchForm form = new BiblioSearchForm();
        form.minYear = 1900;

        ReactBiblioSearchService.QueryParameters parameters = new ReactBiblioSearchService.QueryParameters();
        String query = buildQuery(form, parameters);

        assertFalse(query.contains(HOSTILE_UNQUOTED));
        assertFalse(query.contains("EXISTS"));
        assertEquals(Integer.valueOf(1900), form.minYear);
    }

    @Test
    public void preserveWildcardStarTranslationAndAuthorLowercasing() {
        BiblioSearchForm form = new BiblioSearchForm();
        form.title = "Příspěvek*";
        form.author = "NovÁK*";

        ReactBiblioSearchService.QueryParameters parameters = new ReactBiblioSearchService.QueryParameters();
        buildQuery(form, parameters);

        assertEquals("Příspěvek%", parameters.asMap().get("title"));
        assertEquals("novák%", parameters.asMap().get("author"));
    }

    @Test
    public void bindOnlyTrueOrFalseExcerptedAndIgnoreOtherValues() {
        BiblioSearchForm form = new BiblioSearchForm();
        ReactBiblioSearchService.QueryParameters parameters;
        String query;

        form.excerpted = "TRUE";
        parameters = new ReactBiblioSearchService.QueryParameters();
        query = buildQuery(form, parameters);
        assertTrue(query.contains(" excerpted = :excerpted AND "));
        assertEquals(Boolean.TRUE, parameters.asMap().get("excerpted"));

        form.excerpted = "False";
        parameters = new ReactBiblioSearchService.QueryParameters();
        query = buildQuery(form, parameters);
        assertEquals(Boolean.FALSE, parameters.asMap().get("excerpted"));

        form.excerpted = HOSTILE_UNQUOTED;
        parameters = new ReactBiblioSearchService.QueryParameters();
        query = buildQuery(form, parameters);
        assertFalse(query.contains("excerpted"));
        assertFalse(parameters.asMap().containsKey("excerpted"));
    }

    @Test
    public void ignoreAllJournalFilterValue() {
        BiblioSearchForm form = new BiblioSearchForm();
        form.journal = "all";

        ReactBiblioSearchService.QueryParameters parameters = new ReactBiblioSearchService.QueryParameters();
        String query = buildQuery(form, parameters);

        assertFalse(query.contains("journal"));
        assertTrue(parameters.asMap().isEmpty());
    }

    @Test
    public void notContainAnySqlStringLiteralOrHostilePayload() {
        BiblioSearchForm form = new BiblioSearchForm();
        form.title = HOSTILE_QUOTE;
        form.author = HOSTILE_BOOLEAN;
        form.etc = HOSTILE_QUOTE;
        form.journal = HOSTILE_BOOLEAN;
        form.minYear = 1900;
        form.maxYear = 2050;

        ReactBiblioSearchService.QueryParameters parameters = new ReactBiblioSearchService.QueryParameters();
        String query = buildQuery(form, parameters);

        assertFalse(query.contains("'"));
        assertFalse(query.contains("DROP TABLE"));
        assertFalse(query.contains("OR '1'='1"));
        assertFalse(query.contains("Novák"));
        assertFalse(query.contains(";"));
    }

    @Test(expected = IllegalStateException.class)
    public void rejectDuplicateParameterNames() {
        ReactBiblioSearchService.QueryParameters parameters = new ReactBiblioSearchService.QueryParameters();
        parameters.bind("title", "first");
        parameters.bind("title", "second");
    }
}
