package service.password;

import de.mkammerer.argon2.Argon2;
import de.mkammerer.argon2.Argon2Factory;

public class PladiasHashService implements IHashService {
    private static final int ITERATIONS = 3;        // time cost
    private static final int MEMORY_KIB = 65536;    // 64 MiB
    private static final int PARALLELISM = 1;

    private final Argon2 argon2 = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id);

    @Override
    public String hashPassword(String password) {
        try {
            return argon2.hash(ITERATIONS, MEMORY_KIB, PARALLELISM, password.toCharArray());
        } finally {
            argon2.wipeArray(password.toCharArray());
        }
    }

    @Override
    public boolean verifyPassword(String storedHash, String password) {
        try {
            return argon2.verify(storedHash, password.toCharArray());
        } finally {
            argon2.wipeArray(password.toCharArray());
        }
    }
}
