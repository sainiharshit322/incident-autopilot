package com.incident.alert_gateway;

import com.incident.alert_gateway.model.AlertPayload;
import com.incident.alert_gateway.repository.IncidentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.boot.webtestclient.autoconfigure.AutoConfigureWebTestClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.reactive.server.WebTestClient;


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

    @BeforeEach
    void cleanUp() {
        incidentRepository.deleteAll();
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

        Thread.sleep(500);

        var incidents = incidentRepository.findAll();
        assertThat(incidents).hasSize(1);
        assertThat(incidents.get(0).getAlertName()).isEqualTo("HighErrorRate");
        assertThat(incidents.get(0).getService()).isEqualTo("payment-service");
    }
}