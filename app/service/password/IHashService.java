package service.password;

public interface IHashService {
    String hashPassword(String password);

    boolean verifyPassword(String password, String hashedPassword);
}
