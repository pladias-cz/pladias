package service.biblio.search;

import dto.BibliographyDto;
import io.ebean.*;
import models.biblio.Bibliography;
import org.apache.commons.lang3.StringUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for React frontend providing server-side pagination, sorting, and filtering.
 *
 * All form values are bound as named parameters of the Ebean query and are never
 * concatenated into the SQL text itself (prevention of SQL injection, security
 * audit finding C2 in docs/security.md).
 */
public class ReactBiblioSearchService {

    /**
     * Search results with pagination support
     */
    public SearchResult search(BiblioSearchForm form, int page, int pageSize, String sortBy, String sortOrder) {
        List<Bibliography> allResults = findBibliographies(form);

        // Apply sorting
        if (StringUtils.isNotBlank(sortBy)) {
            sortResults(allResults, sortBy, sortOrder);
        }

        // Calculate total count
        int totalCount = allResults.size();

        // Apply pagination
        List<Bibliography> paginatedResults = paginate(allResults, page, pageSize);

        // Convert to DTOs
        List<BibliographyDto> dtos = paginatedResults.stream()
            .map(b -> new BibliographyDto(
                b.getId(),
                b.getOriginalSourceKey(),
                b.getAuthors(),
                b.getYear(),
                b.getTitle(),
                b.getEtc(),
                b.getRemarks(),
                b.getOriginalId(),
                b.isExcerpted(),
                b.getJournal(),
                b.getJournalId(),
                b.getRecordsCount()
            ))
            .collect(Collectors.toList());

        return new SearchResult(dtos, totalCount);
    }

    /**
     * Search results with pagination and column filtering
     */
    public SearchResult searchWithFilters(BiblioSearchForm form, int page, int pageSize,
                                          String sortBy, String sortOrder,
                                          String authorsFilter, String titleFilter,
                                          String journalFilter, String yearFilter,
                                          String excerptedFilter, String etcFilter) {
        List<Bibliography> allResults = findBibliographies(form);

        // Apply column filters
        allResults = applyColumnFilters(allResults, authorsFilter, titleFilter, journalFilter,
            yearFilter, excerptedFilter, etcFilter);

        // Apply sorting
        if (StringUtils.isNotBlank(sortBy)) {
            sortResults(allResults, sortBy, sortOrder);
        }

        // Calculate total count (after filtering)
        int totalCount = allResults.size();

        // Apply pagination
        List<Bibliography> paginatedResults = paginate(allResults, page, pageSize);

        // Convert to DTOs
        List<BibliographyDto> dtos = paginatedResults.stream()
            .map(b -> new BibliographyDto(
                b.getId(),
                b.getOriginalSourceKey(),
                b.getAuthors(),
                b.getYear(),
                b.getTitle(),
                b.getEtc(),
                b.getRemarks(),
                b.getOriginalId(),
                b.isExcerpted(),
                b.getJournal(),
                b.getJournalId(),
                b.getRecordsCount()
            ))
            .collect(Collectors.toList());

        return new SearchResult(dtos, totalCount);
    }

    /**
     * Finds bibliography entries matching the form filters. All form values are
     * bound as named query parameters (see {@link QueryParameters}).
     */
    List<Bibliography> findBibliographies(BiblioSearchForm form) {
        QueryParameters parameters = new QueryParameters();
        String query = buildQuery(form, parameters);
        return executeQuery(query, parameters);
    }

    private List<Bibliography> executeQuery(String query, QueryParameters parameters) {
        RawSql rawSql = RawSqlBuilder.parse(query).create();
        Query<Bibliography> sqlQuery = DB.find(Bibliography.class);
        sqlQuery.setRawSql(rawSql);
        parameters.applyTo(sqlQuery);
        return sqlQuery.findList();
    }

    String buildQuery(BiblioSearchForm form, QueryParameters parameters) {
        StringBuilder builder = new StringBuilder();
        builder.append("SELECT id FROM ").append(Bibliography.QualifiedTableName);
        builder.append(" WHERE TRUE AND ");

        if (StringUtils.isNotBlank(form.title)) {
            String param = parameters.bind("title", form.title.replace("*", "%"));
            builder.append(" title LIKE ").append(param).append(" AND ");
        }
        if (StringUtils.isNotBlank(form.author)) {
            String param = parameters.bind("author", form.author.replace("*", "%").toLowerCase());
            builder.append(" lower(authors) LIKE ").append(param).append(" AND ");
        }
        if (StringUtils.isNotBlank(form.etc)) {
            String param = parameters.bind("etc", form.etc.replace("*", "%"));
            builder.append(" etc LIKE ").append(param).append(" AND ");
        }
        if (form.minYear != null) {
            String param = parameters.bind("minYear", form.minYear);
            builder.append(" year >= ").append(param).append(" AND ");
        }
        if (form.maxYear != null) {
            String param = parameters.bind("maxYear", form.maxYear);
            builder.append(" year <= ").append(param).append(" AND ");
        }
        if (StringUtils.isNotBlank(form.excerpted)) {
            String excerptedLowercase = form.excerpted.toLowerCase();
            if ("true".equals(excerptedLowercase) || "false".equals(excerptedLowercase)) {
                String param = parameters.bind("excerpted", Boolean.parseBoolean(excerptedLowercase));
                builder.append(" excerpted = ").append(param).append(" AND ");
            }
        }
        if (StringUtils.isNotBlank(form.journal) && !"all".equals(form.journal)) {
            String param = parameters.bind("journal", form.journal);
            builder.append(" journal= ").append(param).append(" AND ");
        }

        builder.append(" TRUE ");
        return builder.toString();
    }

    /**
     * Collects named parameters of the built SQL so that all values (especially
     * text inputs of the search form) are bound via PreparedStatement and are
     * never concatenated into the SQL text itself (prevention of SQL injection).
     */
    static class QueryParameters {
        private final Map<String, Object> parameters = new LinkedHashMap<>();

        /**
         * Registers the value under a unique name and returns the placeholder
         * {@code :name} to be put into the SQL being built.
         */
        String bind(String name, Object value) {
            if (parameters.containsKey(name)) {
                throw new IllegalStateException("Duplicate query parameter '" + name + "'");
            }
            parameters.put(name, value);
            return ":" + name;
        }

        Map<String, Object> asMap() {
            return parameters;
        }

        void applyTo(Query<?> query) {
            for (Map.Entry<String, Object> entry : parameters.entrySet()) {
                query.setParameter(entry.getKey(), entry.getValue());
            }
        }
    }

    private void sortResults(List<Bibliography> results, String sortBy, String sortOrder) {
        boolean ascending = "asc".equalsIgnoreCase(sortOrder);

        Comparator<Bibliography> comparator = getComparator(sortBy);
        if (comparator == null) {
            return;
        }

        if (!ascending) {
            comparator = comparator.reversed();
        }

        results.sort(comparator);
    }

    private Comparator<Bibliography> getComparator(String sortBy) {
        return switch (sortBy) {
            case "authors" ->
                Comparator.comparing(Bibliography::getAuthors, Comparator.nullsLast(Comparator.naturalOrder()));
            case "year" -> Comparator.comparing(Bibliography::getYear, Comparator.nullsLast(Comparator.naturalOrder()));
            case "title" ->
                Comparator.comparing(Bibliography::getTitle, Comparator.nullsLast(Comparator.naturalOrder()));
            case "journal" ->
                Comparator.comparing(Bibliography::getJournal, Comparator.nullsLast(Comparator.naturalOrder()));
            case "etc" -> Comparator.comparing(Bibliography::getEtc, Comparator.nullsLast(Comparator.naturalOrder()));
            case "excerpted" -> Comparator.comparing(Bibliography::isExcerpted);
            case "recordsCount" ->
                Comparator.comparing(Bibliography::getRecordsCount, Comparator.nullsLast(Comparator.naturalOrder()));
            default -> null;
        };
    }

    private List<Bibliography> paginate(List<Bibliography> results, int page, int pageSize) {
        if (page < 1) page = 1;
        int fromIndex = (page - 1) * pageSize;
        int toIndex = Math.min(fromIndex + pageSize, results.size());

        if (fromIndex >= results.size()) {
            return Collections.emptyList();
        }

        return results.subList(fromIndex, toIndex);
    }

    private List<Bibliography> applyColumnFilters(List<Bibliography> results,
                                                  String authorsFilter, String titleFilter,
                                                  String journalFilter, String yearFilter,
                                                  String excerptedFilter, String etcFilter) {
        List<Bibliography> filtered = new ArrayList<>();

        for (Bibliography b : results) {
            if (matchesFilter(b, authorsFilter, titleFilter, journalFilter, yearFilter, excerptedFilter, etcFilter)) {
                filtered.add(b);
            }
        }

        return filtered;
    }

    private boolean matchesFilter(Bibliography b, String authorsFilter, String titleFilter,
                                  String journalFilter, String yearFilter,
                                  String excerptedFilter, String etcFilter) {
        // Authors filter (case-insensitive contains)
        if (StringUtils.isNotBlank(authorsFilter)) {
            String authors = b.getAuthors();
            if (authors == null || !authors.toLowerCase().contains(authorsFilter.toLowerCase())) {
                return false;
            }
        }

        // Title filter (case-insensitive contains)
        if (StringUtils.isNotBlank(titleFilter)) {
            String title = b.getTitle();
            if (title == null || !title.toLowerCase().contains(titleFilter.toLowerCase())) {
                return false;
            }
        }

        // Journal filter (case-insensitive contains)
        if (StringUtils.isNotBlank(journalFilter)) {
            String journal = b.getJournal();
            if (journal == null || !journal.toLowerCase().contains(journalFilter.toLowerCase())) {
                return false;
            }
        }

        // Year filter (exact match or range)
        if (StringUtils.isNotBlank(yearFilter)) {
            Integer year = b.getYear();
            if (year == null || !year.toString().contains(yearFilter)) {
                return false;
            }
        }

        // Excerpted filter (boolean)
        if (StringUtils.isNotBlank(excerptedFilter)) {
            boolean excerpted = "true".equalsIgnoreCase(excerptedFilter);
            if (b.isExcerpted() != excerpted) {
                return false;
            }
        }

        // Etc filter (case-insensitive contains)
        if (StringUtils.isNotBlank(etcFilter)) {
            String etc = b.getEtc();
            return etc != null && etc.toLowerCase().contains(etcFilter.toLowerCase());
        }

        return true;
    }

    /**
     * Search result with pagination info
     */
    public static class SearchResult {
        public final List<BibliographyDto> data;
        public final int totalCount;

        public SearchResult(List<BibliographyDto> data, int totalCount) {
            this.data = data;
            this.totalCount = totalCount;
        }
    }
}
