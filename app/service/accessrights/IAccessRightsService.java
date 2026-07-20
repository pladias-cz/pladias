package service.accessrights;

import models.User;
import play.mvc.Http.Session;

public interface IAccessRightsService {
    boolean IsActionAllowed(User user, AccessRights accessRights);

    boolean IsActionAllowed(Session session, AccessRights accessRights);

}
