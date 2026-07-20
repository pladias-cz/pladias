package service.accessrights;

import models.User;
import play.mvc.Http.Session;
import utils.SessionUtils;

public class AccessRightsService implements IAccessRightsService {

    @Override
    public boolean IsActionAllowed(User user, AccessRights accessRights) {
        switch (accessRights) {
            case TraitBackup:
                return user.isTraitAdmin();
            default:
                return false;
        }
    }

    @Override
    public boolean IsActionAllowed(Session session, AccessRights accessRights) {
        User user = SessionUtils.getCurrentUser(session);
        return IsActionAllowed(user, accessRights);
    }
}
