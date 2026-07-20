package global;

import utils.ConfigHelper;

public class ServerConstants {
    public static final String Protocol = "https";

    public static final String getHostname() {
        return ConfigHelper.isVascular()
            ? "pladias.ibot.cas.cz"
            : "dalibor.ibot.cas.cz";
    }
}
