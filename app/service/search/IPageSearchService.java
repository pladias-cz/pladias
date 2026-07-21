package service.search;

import controllers.atlas.SearchController;
import models.User;

public interface IPageSearchService {
    PageSearchResults search(User currentUser, SearchController.SearchForm form,
                             int page, int pageSize, boolean getTotalCount);

    PageSearchResults getRecordsWithComments(User user);
}
