package service.biblio.search;

import dto.BibliographyDto;
import io.ebean.*;
import models.biblio.Bibliography;
import org.apache.commons.lang3.StringUtils;
import utils.SqlUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for React frontend providing server-side pagination, sorting, and filtering.
 * This service does NOT modify the original BiblioSearchService.
 */
public class ReactBiblioSearchService {

    /**
     * Search results with pagination support
     */
    public SearchResult search(BiblioSearchForm form, int page, int pageSize, String sortBy, String sortOrder) {
        sanitize(form);
        String query = buildQuery(form);
        List<Bibliography> allResults = executeQuery(query);

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
                Integer.valueOf(b.getRecordsCount())
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
        sanitize(form);
        String query = buildQuery(form);
        List<Bibliography> allResults = executeQuery(query);

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
                Integer.valueOf(b.getRecordsCount())
            ))
            .collect(Collectors.toList());

        return new SearchResult(dtos, totalCount);
    }

    private void sanitize(BiblioSearchForm form) {
        form.author = SqlUtils.sanitize(form.author);
        form.etc = SqlUtils.sanitize(form.etc);
        form.excerpted = SqlUtils.sanitize(form.excerpted);
        form.journal = SqlUtils.sanitize(form.journal);
        form.maxYear = SqlUtils.sanitize(form.maxYear);
        form.minYear = SqlUtils.sanitize(form.minYear);
        form.title = SqlUtils.sanitize(form.title);
    }

    private List<Bibliography> executeQuery(String query) {
        RawSql rawSql = RawSqlBuilder.parse(query).create();
        Query<Bibliography> sqlQuery = DB.find(Bibliography.class);
        sqlQuery.setRawSql(rawSql);
        return sqlQuery.findList();
    }

    private String buildQuery(BiblioSearchForm form) {
        StringBuilder builder = new StringBuilder();
        builder.append("SELECT id FROM ").append(Bibliography.QualifiedTableName);
        builder.append(" WHERE TRUE AND ");

        if (StringUtils.isNotBlank(form.title)) {
            String title = form.title.replace("*", "%");
            builder.append(" title LIKE '").append(title).append("' AND ");
        }
        if (StringUtils.isNotBlank(form.author)) {
            String author = form.author.replace("*", "%");
            builder.append(" lower(authors) LIKE '").append(author.toLowerCase()).append("' AND ");
        }
        if (StringUtils.isNotBlank(form.etc)) {
            String etc = form.etc.replace("*", "%");
            builder.append(" etc LIKE '").append(etc).append("' AND ");
        }
        if (StringUtils.isNotBlank(form.minYear)) {
            builder.append(" year >= ").append(form.minYear).append(" AND ");
        }
        if (StringUtils.isNotBlank(form.maxYear)) {
            builder.append(" year <= ").append(form.maxYear).append(" AND ");
        }
        if (StringUtils.isNotBlank(form.excerpted)) {
            String excerptedLowercase = form.excerpted.toLowerCase();
            if ("true".equals(excerptedLowercase) || "false".equals(excerptedLowercase)) {
                builder.append(" excerpted = ").append(excerptedLowercase).append(" AND ");
            }
        }
        if (StringUtils.isNotBlank(form.journal) && !"all".equals(form.journal)) {
            builder.append(" journal= '").append(form.journal).append("' AND ");
        }

        builder.append(" TRUE ");
        return builder.toString();
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
        switch (sortBy) {
            case "authors":
                return Comparator.comparing(Bibliography::getAuthors, Comparator.nullsLast(Comparator.naturalOrder()));
            case "year":
                return Comparator.comparing(Bibliography::getYear, Comparator.nullsLast(Comparator.naturalOrder()));
            case "title":
                return Comparator.comparing(Bibliography::getTitle, Comparator.nullsLast(Comparator.naturalOrder()));
            case "journal":
                return Comparator.comparing(Bibliography::getJournal, Comparator.nullsLast(Comparator.naturalOrder()));
            case "etc":
                return Comparator.comparing(Bibliography::getEtc, Comparator.nullsLast(Comparator.naturalOrder()));
            case "excerpted":
                return Comparator.comparing(Bibliography::isExcerpted);
            case "recordsCount":
                return Comparator.comparing(Bibliography::getRecordsCount, Comparator.nullsLast(Comparator.naturalOrder()));
            default:
                return null;
        }
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
