package controllers.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import service.config.IConfigService;

import javax.inject.Inject;

/**
 * Eagerly instantiated at application startup (bound in {@link modules.SecurityModule}).
 * Checks security-relevant configuration and warns about unsafe settings.
 */
public class SecurityConfigurator {

    final Logger logger = LoggerFactory.getLogger(SecurityConfigurator.class);
    private final IConfigService configService;

    @Inject
    public SecurityConfigurator(IConfigService configService) {
        this.configService = configService;
        warnWhenDebugModeIsEnabled();
    }

    /**
     * With debug = true the 2h user inactivity check in AuthenticatorBase is disabled
     * (audit finding L4). This is a development convenience only and must never be
     * enabled in production.
     */
    private void warnWhenDebugModeIsEnabled() {
        if (configService.getBoolean("debug")) {
            logger.warn("debug = true - the user inactivity check (2h auto-logout, AuthenticatorBase) is DISABLED. "
                + "This must never be enabled in production (audit finding L4).");
        }
    }
}