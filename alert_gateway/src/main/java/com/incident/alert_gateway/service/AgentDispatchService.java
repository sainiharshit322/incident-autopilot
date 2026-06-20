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

    private static final String AGENT_SWARM_URL = "http://127.0.0.1:8001";

    @Async
    public void dispatch(String incidentId, String alertName, String severity, String service, String description){

        log.info("Dispatching incident [{}] to agent swarm simultaneously", incidentId);
        try{
            webClientBuilder.build()
                    .post()
                    .uri(AGENT_SWARM_URL + "/analyze")
                    .bodyValue(Map.of(
                            "incident_id", incidentId,
                            "alert_name", alertName,
                            "severity", severity,
                            "service", service,
                            "log_snippet", description != null ? description : ""
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

    @Async
    public void resolveIncident(String incidentId, String problemStatement) {
        log.info("Requesting agent swarm to resolve incident [{}]", incidentId);
        try {
            webClientBuilder.build()
                    .post()
                    .uri(AGENT_SWARM_URL + "/resolve")
                    .bodyValue(Map.of(
                            "incident_id", incidentId,
                            "problem_statement", problemStatement != null ? problemStatement : ""
                    ))
                    .retrieve()
                    .bodyToMono(String.class)
                    .subscribe(
                            response -> log.info("Agent Swarm acknowledged resolution for incident [{}]: {}", incidentId, response),
                            error -> log.warn("Agent Swarm unavailable for resolve incident [{}]. Error: {}", incidentId, error.getMessage())
                    );
        } catch (Exception e) {
            log.warn("Resolve dispatch failed for incident [{}]: {}", incidentId, e.getMessage());
        }
    }

    @Async
    public void notifyStatusChange(String incidentId, String alertName, String status, String resolutionNote) {
        log.info("Requesting agent swarm to notify status change for incident [{}]", incidentId);
        try {
            webClientBuilder.build()
                    .post()
                    .uri(AGENT_SWARM_URL + "/notify_status")
                    .bodyValue(Map.of(
                            "incident_id", incidentId,
                            "alert_name", alertName != null ? alertName : "Unknown",
                            "status", status,
                            "resolution_note", resolutionNote != null ? resolutionNote : ""
                    ))
                    .retrieve()
                    .bodyToMono(String.class)
                    .subscribe(
                            response -> log.info("Agent Swarm acknowledged notification for incident [{}]: {}", incidentId, response),
                            error -> log.warn("Agent Swarm unavailable for notify incident [{}]. Error: {}", incidentId, error.getMessage())
                    );
        } catch (Exception e) {
            log.warn("Notify dispatch failed for incident [{}]: {}", incidentId, e.getMessage());
        }
    }
}
