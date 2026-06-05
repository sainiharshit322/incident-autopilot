package com.incident.alert_gateway.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgentDispatchService {

    private final WebClient.Builder webClientBuilder;

    private static final String AGENT_SWARM_URL = "http://localhost:8001";

    @Async
    public void dispatch(String incidentId, String alertName, String severity, String service, String description){

        log.info("Dispatching incident [{}] to agent swarm simultaneously", incidentId);
        try{
            webClientBuilder.build()
                    .post()
                    .uri(AGENT_SWARM_URL, "/analyze")
                    .bodyValue(Map.of(
                            "incidentId", incidentId,
                            "alertName", alertName,
                            "severity", severity,
                            "service", service,
                            "description", description != null ? description : ""
                    ))
                    .retrieve()
                    .bodyToMono(String.class)
                    .subscribe(
                            response -> log.info("Agent Swarm acknowledged incident [{}]: {}", incidentId, response),
                            error -> log.warn("Agent Swarm unavailable for the incident [{}] will retry after some time. Error: {}", incidentId, error.getMessage())
                    );
        } catch (Exception e) {
            log.warn("Dispatch failed for the incident [{}]: {}", incidentId, e.getMessage());
        }
    }
}
