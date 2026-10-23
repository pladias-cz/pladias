package service.search;

import controllers.atlas.SearchController;
import models.MapSquareNew;
import models.QuadrantNew;
import org.junit.Before;
import org.junit.Test;
import service.config.IConfigService;
import utils.SqlUtils;

import java.sql.Date;
import java.util.Arrays;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Regresní testy prevence SQL injection ve stavbě WHERE klauzule (zjištění C1
 * bezpečnostního auditu, docs/security.md). Všechny uživatelské vstupy musí být
 * vázané jako pojmenované parametry, nikdy konkatenované do SQL textu.
 */
public class PageSearchServiceShould {

    private static final String HOSTILE_QUOTE = "Sedum' ; DROP TABLE records;--";
    private static final String HOSTILE_BOOLEAN = "Brno' OR '1'='1";

    private IConfigService configService;
    private PageSearchService service;

    @Before
    public void setUp() {
        configService = mock(IConfigService.class);
        when(configService.isNonVascular()).thenReturn(false);
        service = new PageSearchService(null, configService);
    }

    private SearchController.SearchForm browserForm() {
        SearchController.SearchForm form = new SearchController.SearchForm();
        form.export_type = SearchController.SearchForm.ExportTypeBrowser;
        form.projects = new Integer[0];
        form.committerId = -1;
        return form;
    }

    private String buildWhere(SearchController.SearchForm form, PageSearchService.QueryParameters parameters) throws Exception {
        return service.buildWhereClause(null, form, null, null, parameters);
    }

    @Test
    public void produceOriginalWhereClauseWithoutFilters() throws Exception {
        PageSearchService.QueryParameters parameters = new PageSearchService.QueryParameters();
        String where = buildWhere(browserForm(), parameters);

        assertEquals(" WHERE TRUE AND R.taxon_id IS NOT NULL AND  TRUE ", where);
        assertTrue(parameters.asMap().isEmpty());
    }

    @Test
    public void bindAllTextInputAsParametersInsteadOfSqlLiterals() throws Exception {
        SearchController.SearchForm form = browserForm();
        form.taxon_name_original = HOSTILE_QUOTE;
        form.town = HOSTILE_BOOLEAN;
        form.locality_description = HOSTILE_QUOTE;
        form.locality_or_town = HOSTILE_BOOLEAN;
        form.foreignId = HOSTILE_QUOTE;
        form.comment = HOSTILE_BOOLEAN;
        form.pladias_comment = HOSTILE_QUOTE;
        form.finderSurname = HOSTILE_BOOLEAN;
        form.finderName = HOSTILE_QUOTE;
        form.source = HOSTILE_BOOLEAN;
        form.herbariumText = HOSTILE_QUOTE;
        form.historyFlag = HOSTILE_BOOLEAN;
        form.institution = "42";

        PageSearchService.QueryParameters parameters = new PageSearchService.QueryParameters();
        String where = buildWhere(form, parameters);

        // V WHERE klauzuli nesmí být žádný string literál ani uživatelský vstup
        assertFalse("WHERE nesmi obsahovat apostrofy: " + where, where.contains("'"));
        assertFalse(where.contains(HOSTILE_QUOTE));
        assertFalse(where.contains(HOSTILE_BOOLEAN));
        assertFalse(where.contains("DROP TABLE"));

        // Hodnoty musí být vázané přes pojmenované parametry
        assertEquals(SqlUtils.toRegex(HOSTILE_QUOTE), parameters.asMap().get("taxonNameOriginal"));
        assertEquals(SqlUtils.toRegex(HOSTILE_BOOLEAN), parameters.asMap().get("town"));
        assertEquals(SqlUtils.toRegex(HOSTILE_BOOLEAN), parameters.asMap().get("comment"));
        assertEquals(SqlUtils.toRegex(HOSTILE_QUOTE), parameters.asMap().get("pladiasComment"));
        assertEquals(SqlUtils.toRegex(HOSTILE_BOOLEAN), parameters.asMap().get("source"));
        assertEquals(SqlUtils.toRegex(HOSTILE_QUOTE), parameters.asMap().get("herbariumText"));
        assertEquals(HOSTILE_BOOLEAN, parameters.asMap().get("historyFlag"));
        assertEquals(42, parameters.asMap().get("institutionId"));

        // Textové filtry musí v SQL odkazovat na placeholdery
        assertTrue(where.contains("lower(R.original_name) LIKE lower(:taxonNameOriginal)"));
        assertTrue(where.contains("lower(R.nearest_town_text) LIKE lower(:town)"));
        assertTrue(where.contains("lower(R.comment) LIKE lower(:comment)"));
        assertTrue(where.contains("lower(RC.message) LIKE lower(:pladiasComment)"));
        assertTrue(where.contains("lower(A.surname) LIKE lower(:finderSurname0)"));
        assertTrue(where.contains("lower(A.name) LIKE lower(:finderName0)"));
        assertTrue(where.contains("lower(R.source) LIKE lower(:source)"));
        assertTrue(where.contains("lower(H.name) like lower(:herbariumText)"));
        assertTrue(where.contains("field_desc=:historyFlag)"));
        assertTrue(where.contains("I.id = :institutionId"));
        // locality_or_town se váže na dva placeholdery (město i lokalita)
        assertTrue(where.contains("lower(R.nearest_town_text) LIKE lower(:localityOrTownTown)"));
        assertTrue(where.contains("lower(R.locality) LIKE lower(:localityOrTownLocality)"));
    }

    @Test
    public void preserveWildcardFeature() throws Exception {
        SearchController.SearchForm form = browserForm();
        form.town = "Br*";

        PageSearchService.QueryParameters parameters = new PageSearchService.QueryParameters();
        String where = buildWhere(form, parameters);

        assertEquals("Br%", parameters.asMap().get("town"));
        assertFalse(where.contains("Br%"));
    }

    @Test
    public void splitLocalityAlternativesIntoSeparateParameters() throws Exception {
        SearchController.SearchForm form = browserForm();
        form.locality_description = "Praha OR Br*no' OR Ostrava";

        PageSearchService.QueryParameters parameters = new PageSearchService.QueryParameters();
        String where = buildWhere(form, parameters);

        assertTrue(where.contains("lower(R.locality) LIKE lower(:localityDescription0)"));
        assertTrue(where.contains("lower(R.locality) LIKE lower(:localityDescription1)"));
        assertTrue(where.contains("lower(R.locality) LIKE lower(:localityDescription2)"));
        assertEquals("Praha", parameters.asMap().get("localityDescription0"));
        assertEquals("Br%no'", parameters.asMap().get("localityDescription1"));
        assertEquals("Ostrava", parameters.asMap().get("localityDescription2"));
    }

    @Test
    public void splitFinderAlternativesIntoSeparateParameters() throws Exception {
        SearchController.SearchForm form = browserForm();
        form.finderSurname = "Nov*ák OR 'Svoboda";

        PageSearchService.QueryParameters parameters = new PageSearchService.QueryParameters();
        String where = buildWhere(form, parameters);

        assertTrue(where.contains("lower(A.surname) LIKE lower(:finderSurname0)"));
        assertTrue(where.contains("lower(A.surname) LIKE lower(:finderSurname1)"));
        assertEquals("Nov%ák", parameters.asMap().get("finderSurname0"));
        assertEquals("'Svoboda", parameters.asMap().get("finderSurname1"));
        assertFalse(where.contains("'Svoboda"));
    }

    @Test
    public void bindNumericFiltersAsParameters() throws Exception {
        SearchController.SearchForm form = browserForm();
        form.altitude_min = 100;
        form.altitude_max = 900;
        form.phytochorion = 5;
        form.committerId = 7;
        form.buffer = 10;
        form.license = 3;
        form.validationStatus = "2";
        form.projects = new Integer[]{1, 2};

        PageSearchService.QueryParameters parameters = new PageSearchService.QueryParameters();
        String where = buildWhere(form, parameters);

        assertTrue(where.contains("R.altitude_min >= :altitudeMin"));
        assertTrue(where.contains("R.altitude_max <= :altitudeMax"));
        assertTrue(where.contains("R.phytochorion_id = :phytochorion"));
        assertTrue(where.contains("B.committer_id = :committerId"));
        assertTrue(where.contains("gps_coords_precision >= :buffer"));
        assertTrue(where.contains("R.license_id = :licenseId"));
        assertTrue(where.contains("R.validation_status =:validationStatus"));
        assertTrue(where.contains("R.project_id IN (:projectIds)"));

        assertEquals(100, parameters.asMap().get("altitudeMin"));
        assertEquals(900, parameters.asMap().get("altitudeMax"));
        assertEquals(5, parameters.asMap().get("phytochorion"));
        assertEquals(7, parameters.asMap().get("committerId"));
        assertEquals(10, parameters.asMap().get("buffer"));
        assertEquals(3, parameters.asMap().get("licenseId"));
        assertEquals(2, parameters.asMap().get("validationStatus"));
        assertEquals(Arrays.asList(1, 2), parameters.asMap().get("projectIds"));
    }

    @Test
    public void bindYearsAsSqlDates() throws Exception {
        SearchController.SearchForm form = browserForm();
        form.minYear = 1990;
        form.maxYear = 2020;

        PageSearchService.QueryParameters parameters = new PageSearchService.QueryParameters();
        String where = buildWhere(form, parameters);

        assertTrue(where.contains("datum >= :minYearDate"));
        assertTrue(where.contains("datum <= :maxYearDate"));
        assertEquals(Date.valueOf("1990-01-01"), parameters.asMap().get("minYearDate"));
        assertEquals(Date.valueOf("2020-12-31"), parameters.asMap().get("maxYearDate"));
    }

    @Test
    public void bindImportAndEditDatesAsSqlDates() throws Exception {
        SearchController.SearchForm form = browserForm();
        form.dateFromImported = new GregorianCalendar(2020, Calendar.JANUARY, 15).getTime();
        form.dateToImported = new GregorianCalendar(2020, Calendar.FEBRUARY, 10).getTime();
        form.dateFromLastEdit = new GregorianCalendar(2021, Calendar.MARCH, 1).getTime();
        form.dateToLastEdit = new GregorianCalendar(2021, Calendar.MARCH, 10).getTime();

        PageSearchService.QueryParameters parameters = new PageSearchService.QueryParameters();
        String where = buildWhere(form, parameters);

        assertTrue(where.contains("B.creation_timestamp >= :dateFromImported"));
        assertTrue(where.contains("B.creation_timestamp <= :dateToImported"));
        // dateToImported/dateToLastEdit mají exklusivní horní mez (původní plusDays(1))
        assertEquals(Date.valueOf("2020-01-15"), parameters.asMap().get("dateFromImported"));
        assertEquals(Date.valueOf("2020-02-11"), parameters.asMap().get("dateToImported"));

        String subquery = String.format(
            "SELECT distinct record_id  FROM %s WHERE 1=1 AND creation_timestamp >= :dateFromLastEdit AND creation_timestamp <= :dateToLastEdit",
            "atlas.records_history");
        assertTrue(where.contains("R.id IN (" + subquery + ")"));
        assertEquals(Date.valueOf("2021-03-01"), parameters.asMap().get("dateFromLastEdit"));
        assertEquals(Date.valueOf("2021-03-11"), parameters.asMap().get("dateToLastEdit"));
    }

    @Test
    public void bindPladiasIdsAsCollection() throws Exception {
        SearchController.SearchForm form = browserForm();
        form.pladiasId = "1;2\n3  ;  4'; DROP--";

        PageSearchService.QueryParameters parameters = new PageSearchService.QueryParameters();
        String where = buildWhere(form, parameters);

        assertTrue(where.contains("R.id IN (:pladiasIds)"));
        assertEquals(Arrays.asList(1, 2, 3), parameters.asMap().get("pladiasIds"));
        assertFalse(where.contains("DROP"));
    }

    @Test
    public void bindQuadrantsAndSquaresAsCollections() throws Exception {
        Set<QuadrantNew> quadrants = new HashSet<>();
        quadrants.add(quadrant(11));
        quadrants.add(quadrant(12));
        Set<MapSquareNew> squares = new HashSet<>();
        squares.add(square(21));

        PageSearchService.QueryParameters parameters = new PageSearchService.QueryParameters();
        String where = service.buildWhereClause(null, browserForm(), quadrants, squares, parameters);

        assertTrue(where.contains("p.id IN (:quadrantIds)"));
        assertTrue(where.contains("p.id IN (:squareIds)"));
        assertTrue(where.contains(") AND ST_Contains(p.geom_wgs, R.coords_wgs))"));
        List<Integer> boundQuadrantIds = (List<Integer>) parameters.asMap().get("quadrantIds");
        assertEquals(2, boundQuadrantIds.size());
        assertTrue(boundQuadrantIds.containsAll(Arrays.asList(11, 12)));
        assertEquals(Arrays.asList(21), parameters.asMap().get("squareIds"));
    }

    @Test(expected = NumberFormatException.class)
    public void rejectNonNumericValidationStatus() throws Exception {
        SearchController.SearchForm form = browserForm();
        form.validationStatus = "2' OR '1'='1";
        buildWhere(form, new PageSearchService.QueryParameters());
    }

    @Test(expected = NumberFormatException.class)
    public void rejectNonNumericInstitution() throws Exception {
        SearchController.SearchForm form = browserForm();
        form.institution = "1' OR '1'='1";
        buildWhere(form, new PageSearchService.QueryParameters());
    }

    @Test
    public void bindNonVascularFiltersAsParameters() throws Exception {
        when(configService.isNonVascular()).thenReturn(true);
        SearchController.SearchForm form = browserForm();
        form.substrateText = HOSTILE_QUOTE;
        form.substrate1 = "3";
        form.substrate2 = "4";
        form.chemicalData = HOSTILE_BOOLEAN;
        form.localityExtra = HOSTILE_QUOTE;

        PageSearchService.QueryParameters parameters = new PageSearchService.QueryParameters();
        String where = buildWhere(form, parameters);

        assertFalse(where.contains("'"));
        assertTrue(where.contains("NVEXT.substrate ILIKE :substrateText"));
        assertTrue(where.contains("NVEXT.substrate_1_id = :substrate1Id"));
        assertTrue(where.contains("NVEXT.substrate_2_id = :substrate2Id"));
        assertTrue(where.contains("NVEXT.chemical ILIKE :chemicalData"));
        assertTrue(where.contains("NVEXT.locality_extra ILIKE :localityExtra"));
        assertEquals(SqlUtils.toRegex(HOSTILE_QUOTE), parameters.asMap().get("substrateText"));
        assertEquals(3, parameters.asMap().get("substrate1Id"));
        assertEquals(4, parameters.asMap().get("substrate2Id"));
        assertEquals(SqlUtils.toRegex(HOSTILE_BOOLEAN), parameters.asMap().get("chemicalData"));
        assertEquals(SqlUtils.toRegex(HOSTILE_QUOTE), parameters.asMap().get("localityExtra"));
    }

    @Test(expected = NumberFormatException.class)
    public void rejectNonNumericSubstrate() throws Exception {
        when(configService.isNonVascular()).thenReturn(true);
        SearchController.SearchForm form = browserForm();
        form.substrate1 = "3' OR '1'='1";
        buildWhere(form, new PageSearchService.QueryParameters());
    }

    @Test
    public void rejectDuplicateParameterNames() {
        PageSearchService.QueryParameters parameters = new PageSearchService.QueryParameters();
        parameters.bind("town", "Brno");
        try {
            parameters.bind("town", "Praha");
        } catch (IllegalStateException e) {
            assertTrue(e.getMessage().contains("town"));
            return;
        }
        throw new AssertionError("Ocekavana IllegalStateException pro duplicitni parametr");
    }

    private QuadrantNew quadrant(int id) {
        QuadrantNew quadrant = new QuadrantNew();
        quadrant.setId(id);
        return quadrant;
    }

    private MapSquareNew square(int id) {
        MapSquareNew square = new MapSquareNew();
        square.setId(id);
        return square;
    }
}
