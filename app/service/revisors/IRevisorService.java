package service.revisors;

import exceptions.NotEligibleException;
import models.Taxon;
import models.User;
import play.i18n.Messages;

public interface IRevisorService {
    void assignRevisorsToTaxon(User currentUser, User[] revisors, Taxon taxon, Messages messages) throws NotEligibleException;
}
