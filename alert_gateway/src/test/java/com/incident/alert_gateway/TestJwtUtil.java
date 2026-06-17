package com.incident.alert_gateway;

import com.incident.alert_gateway.security.JwtUtil;
import org.springframework.test.util.ReflectionTestUtils;

public class TestJwtUtil {

    private static final JwtUtil jwtUtil;

    static {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", "incident-autopilot-secret-key-must-be-at-least-32-characters-long");
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", 3600000L);
    }

    public static String validToken() {
        return jwtUtil.generateToken("test-user");
    }

    public static String expiredToken() {
        JwtUtil expired = new JwtUtil();
        ReflectionTestUtils.setField(expired, "secret", "incident-autopilot-secret-key-must-be-at-least-32-characters-long");
        ReflectionTestUtils.setField(expired, "expirationMs", -1000L); // already expired
        return expired.generateToken("test-user");
    }
}