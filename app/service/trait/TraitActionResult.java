package service.trait;

/**
 * Outcome of a trait operation (upload, deletion, set default) - whether it succeeded
 * and the localized message to show to the user.
 */
public class TraitActionResult {

    private final boolean successful;
    private final String message;

    private TraitActionResult(boolean successful, String message) {
        this.successful = successful;
        this.message = message;
    }

    public static TraitActionResult success() {
        return new TraitActionResult(true, null);
    }

    public static TraitActionResult success(String message) {
        return new TraitActionResult(true, message);
    }

    public static TraitActionResult failure(String message) {
        return new TraitActionResult(false, message);
    }

    public boolean isSuccessful() {
        return successful;
    }

    public String getMessage() {
        return message;
    }
}
