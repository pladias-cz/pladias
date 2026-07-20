package service.accessrights;

import play.mvc.With;

import java.lang.annotation.*;

@With(BearerAuthAction.class)
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface TokenAuthenticated {
}
