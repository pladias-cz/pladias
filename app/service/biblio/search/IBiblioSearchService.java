package service.biblio.search;

import models.biblio.Bibliography;

import java.util.List;

public interface IBiblioSearchService {

    List<Bibliography> search(BiblioSearchForm form);
}
