package controllers.security;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.slf4j.LoggerFactory;
import service.config.IConfigService;

import java.util.List;
import java.util.stream.Collectors;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class SecurityConfiguratorShould {

    private ListAppender<ILoggingEvent> appender;
    private Logger logger;

    @Before
    public void attachAppender() {
        logger = (Logger) LoggerFactory.getLogger(SecurityConfigurator.class);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
    }

    @After
    public void detachAppender() {
        logger.detachAppender(appender);
    }

    @Test
    public void warnWhenDebugModeIsEnabled() {
        IConfigService configService = mock(IConfigService.class);
        when(configService.getBoolean("debug")).thenReturn(true);

        new SecurityConfigurator(configService);

        List<ILoggingEvent> warnings = getWarnings();
        assertEquals(1, warnings.size());
        assertTrue(warnings.get(0).getFormattedMessage().contains("DISABLED"));
    }

    @Test
    public void staySilentWhenDebugModeIsDisabled() {
        IConfigService configService = mock(IConfigService.class);
        when(configService.getBoolean("debug")).thenReturn(false);

        new SecurityConfigurator(configService);

        assertEquals(0, getWarnings().size());
    }

    private List<ILoggingEvent> getWarnings() {
        return appender.list.stream()
            .filter(e -> e.getLevel() == Level.WARN)
            .collect(Collectors.toList());
    }
}