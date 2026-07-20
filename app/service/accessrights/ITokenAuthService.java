package service.accessrights;

import models.User;

import java.util.Optional;

public interface ITokenAuthService {
    Optional<User> authenticatedUser(String token);
}
