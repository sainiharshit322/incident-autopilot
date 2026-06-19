package com.incident.alert_gateway.controller;

import com.incident.alert_gateway.model.AlertPayload;
import com.incident.alert_gateway.model.Incident;
import com.incident.alert_gateway.service.AgentDispatchService;
import com.incident.alert_gateway.service.AlertDeduplicationService;
import com.incident.alert_gateway.service.IncidentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class AlertController {

    private final IncidentService incidentService;
    private final AlertDeduplicationService deduplicationService;
    private final AgentDispatchService agentDispatchService;

    @PostMapping("/alerts/webhook")
    public ResponseEntity<Map<String, String>> receiveAlert(@Valid @RequestBody AlertPayload payload) {

        log.info("Received alert: {} | severity: {} | service: {}", payload.alertName(), payload.severity(), payload.service());

        if (!deduplicationService.isNew(payload.alertName(), payload.service())) {
            return ResponseEntity.status(208)
                    .body(Map.of("status", "deduplicated", "message", "Alert suppressed — duplicate within 5 min window"));
        }

        Incident incident = incidentService.createIncident(payload);
        agentDispatchService.dispatch(
                incident.getId(),
                payload.alertName(),
                payload.severity(),
                payload.service(),
                payload.description()
        );

        return ResponseEntity.accepted()
                .body(Map.of("status", "accepted", "incidentId", incident.getId()));
    }

    @GetMapping("/incidents")
    public ResponseEntity<List<Incident>> getAllIncidents() {
        return ResponseEntity.ok(incidentService.findAll());
    }

    @GetMapping("/incidents/{id}")
    public ResponseEntity<Incident> getIncident(@PathVariable String id) {
        return ResponseEntity.ok(incidentService.findById(id));
    }

    @PatchMapping("/incidents/{id}")
    public ResponseEntity<Incident> updateRunbook(
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {

        Incident updated = incidentService.updateWithRunbook(
                id,
                (String) body.get("rootCause"),
                (String) body.get("runbookDraft"),
                body.get("confidenceScore") != null ? ((Number) body.get("confidenceScore")).doubleValue() : null,
                (String) body.get("status")
        );

        return ResponseEntity.ok(updated);
    }
}