package service.comment;

import models.Taxon;
import models.User;

public interface ICommentService {

    /* Returns number of comments that were bound to revisors */
    int bindRevisorsToUnresolvedComments(User[] revisors, Taxon rootSupervisedTaxon);
}
