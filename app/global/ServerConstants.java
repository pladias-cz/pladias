package global;

import utils.ConfigHelper;

public class ServerConstants {
    public static final String Protocol = "https";

    /**
     * Konfigurační klíč s veřejnou doménou instance (např. pladias.ibot.cas.cz, cevs.ibot.cas.cz,
     * dalibor.ibot.cas.cz, dalibor.sk). Používá se pro odkazy v e-mailech (reset hesla,
     * mazání importních dávek apod.) – každá instance/klon aplikace ji má nastavenou ve svém
     * conf souboru (conf/pladias.conf, conf/cevs.conf, …).
     */
    public static final String HostnameKey = "server.hostname";

    public static final String getHostname() {
        if (ConfigHelper.hasKey(HostnameKey)) {
            return ConfigHelper.getString(HostnameKey);
        }
        // Fallback pro nasazení bez direktivy server.hostname
        return ConfigHelper.isVascular()
            ? "pladias.ibot.cas.cz"
            : "dalibor.ibot.cas.cz";
    }
}
