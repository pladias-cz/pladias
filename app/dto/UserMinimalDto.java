package dto;

import models.User;

public record UserMinimalDto(
    Long id,
    String name
) {
    public static UserMinimalDto fromUser(User user) {
        return new UserMinimalDto(user.getId(), user.getName() + " " + user.getSurname());
    }
}