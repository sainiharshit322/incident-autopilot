package com.incident.alert_gateway.controller;

import com.incident.alert_gateway.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final JwtUtil jwtUtil;

    @PostMapping("/token")
    public ResponseEntity<Map<String, String>> generateToken(@RequestParam String subject) {
        String token = jwtUtil.generateToken(subject);
        return ResponseEntity.ok(Map.of("token", token));
    }
}
