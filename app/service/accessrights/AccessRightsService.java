package service.accessrights;

import models.User;
import play.mvc.Http.Session;
import utils.SessionUtils;

public class AccessRightsService implements IAccessRightsService {

    @Override
    public boolean IsActionAllowed(User user, AccessRights accessRights) {
        return switch (accessRights) {
            case TraitBackup -> user.isTraitAdmin();
            default -> false;
        };
    }

    @Override
    public boolean IsActionAllowed(Session session, AccessRights accessRights) {
        User user = SessionUtils.getCurrentUser(session);
        return IsActionAllowed(user, accessRights);
    }
}
