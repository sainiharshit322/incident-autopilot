package com.incident.alert_gateway;

import com.incident.alert_gateway.model.AlertPayload;
import com.incident.alert_gateway.repository.IncidentRepository;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.boot.webtestclient.autoconfigure.AutoConfigureWebTestClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.reactive.server.WebTestClient;


import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@AutoConfigureWebTestClient
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
class AlertControllerTest {

    @Autowired
    WebTestClient webTestClient;

    @Autowired
    IncidentRepository incidentRepository;

    @Autowired
    StringRedisTemplate stringRedisTemplate;

    @BeforeEach
    void cleanUp() {
        incidentRepository.deleteAll();
        stringRedisTemplate.getConnectionFactory().getConnection().serverCommands().flushAll();
    }

    @Test
    void postValidAlert_returns202_andPersistsIncident() throws Exception {
        AlertPayload payload = new AlertPayload(
                "HighErrorRate",
                "CRITICAL",
                "payment-service",
                "Error rate exceeded 5% threshold"
        );

        webTestClient
                .post().uri("/api/v1/alerts/webhook")
                .header("Authorization", "Bearer " + TestJwtUtil.validToken())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .exchange()
                .expectStatus().isAccepted();

        Awaitility.await()
                .atMost(3, TimeUnit.SECONDS)
                .until(() -> incidentRepository.count() == 1);

        var incidents = incidentRepository.findAll();
        assertThat(incidents).hasSize(1);
        assertThat(incidents.get(0).getAlertName()).isEqualTo("HighErrorRate");
        assertThat(incidents.get(0).getService()).isEqualTo("payment-service");
    }

    @Test
    void duplicateAlert_withinFiveMinutes_returnsDeduplicated() throws Exception {
        AlertPayload payload = new AlertPayload(
                "HighErrorRate",
                "CRITICAL",
                "payment-service",
                "Error rate exceeded 5% threshold"
        );

        // First request — should succeed
        webTestClient
                .post().uri("/api/v1/alerts/webhook")
                .header("Authorization", "Bearer " + TestJwtUtil.validToken())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .exchange()
                .expectStatus().isAccepted();

        // Second identical request — should be deduplicated
        webTestClient
                .post().uri("/api/v1/alerts/webhook")
                .header("Authorization", "Bearer " + TestJwtUtil.validToken())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .exchange()
                .expectStatus().isEqualTo(208); // 208 Already Reported = deduplicated
    }

    @Test
    void requestWithoutToken_returns401() throws Exception {
        AlertPayload payload = new AlertPayload(
                "HighErrorRate",
                "CRITICAL",
                "payment-service",
                "Error rate exceeded 5% threshold"
        );

        webTestClient
                .post().uri("/api/v1/alerts/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    void requestWithExpiredToken_returns401() throws Exception {
        AlertPayload payload = new AlertPayload(
                "HighErrorRate",
                "CRITICAL",
                "payment-service",
                "Error rate exceeded 5% threshold"
        );

        webTestClient
                .post().uri("/api/v1/alerts/webhook")
                .header("Authorization", "Bearer " + TestJwtUtil.expiredToken())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    void requestWithValidToken_returns202() throws Exception {
        AlertPayload payload = new AlertPayload(
                "DiskSpaceAlert",
                "WARNING",
                "storage-service",
                "Disk usage above 90%"
        );

        webTestClient
                .post().uri("/api/v1/alerts/webhook")
                .header("Authorization", "Bearer " + TestJwtUtil.validToken())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .exchange()
                .expectStatus().isAccepted();
    }
}