package service.search;

import controllers.atlas.SearchController;
import dto.atlas.QuadrantAggregateDto;
import models.User;

import java.util.List;

public interface IPageSearchService {
    PageSearchResults search(User currentUser, SearchController.SearchForm form,
                             int page, int pageSize, boolean getTotalCount);

    java.util.List<RecordIdEditTimestampPair> searchRecordEditTimestamps(
        User currentUser,
        SearchController.SearchForm form
    );

    /**
     * Agregované kvadranty zastoupené v CELÉM výsledku hledání (bez ohledu na
     * stránkování) – id, kód a centroid kvadrantu pro markery mapového výpisu.
     */
    List<QuadrantAggregateDto> searchQuadrants(User currentUser, SearchController.SearchForm form);

    PageSearchResults getRecordsWithComments(User user);
}
