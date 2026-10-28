package com.mulesoft.sec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.Authentication;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

public class LockoutAuthenticationProvider implements AuthenticationProvider {

    private static final Logger log = LoggerFactory.getLogger(LockoutAuthenticationProvider.class);

    private static final int MAX_ATTEMPTS = 10;
    private static final long LOCK_MS = TimeUnit.MINUTES.toMillis(60);

    private final AuthenticationProvider delegate;   // e.g. DaoAuthenticationProvider
    private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();

    public LockoutAuthenticationProvider(AuthenticationProvider delegate) {
        this.delegate = delegate;
    }

    @Override
    public Authentication authenticate(Authentication auth) {
        String key = auth.getName();
        Attempt a = attempts.get(key);
        if (a != null && a.lockedUntil > System.currentTimeMillis()) {
            throw new LockedException("Account temporarily locked");
        }
        try {
            Authentication result = delegate.authenticate(auth);
            attempts.remove(key);                      // reset on success
            return result;
        } catch (BadCredentialsException e) {
            Attempt updated = attempts.compute(key, (k, v) -> {
                Attempt n = (v == null) ? new Attempt() : v;
                if (++n.count >= MAX_ATTEMPTS) {
                    n.lockedUntil = System.currentTimeMillis() + LOCK_MS;
                    n.count = 0;
                }
                return n;
            });
            if (updated.lockedUntil > System.currentTimeMillis()) {
                log.warn("Authentication failed for user '{}': account locked after {} consecutive failed attempts", key, MAX_ATTEMPTS);
            } else {
                log.warn("Authentication failed for user '{}': invalid credentials (failed attempt {})", key, updated.count);
            }
            throw e;
        }
    }

    @Override
    public boolean supports(Class<?> c) { return delegate.supports(c); }

    private static class Attempt { int count; long lockedUntil; }
}