package com.incident.alert_gateway.service;

import com.incident.alert_gateway.model.AlertPayload;
import com.incident.alert_gateway.model.Incident;
import com.incident.alert_gateway.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class IncidentService {

    private final IncidentRepository incidentRepository;

    public Incident createIncident(AlertPayload alertPayload){

        Incident incident = new Incident();
        incident.setAlertName(alertPayload.alertName());
        incident.setSeverity(alertPayload.severity());
        incident.setService(alertPayload.service());
        incident.setStatus("OPEN");
        Incident saved = incidentRepository.save(incident);
        log.info("Created incident [{}] for alert '{}'", saved.getId(), saved.getAlertName());

        return saved;
    }

    public Incident findById(String id){

        return incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Incident not Found" + id));
    }

    public Incident updateWithRunbook(String id, String rootCause, String runbookDraft, Double confidenceScore){

        Incident incident = findById(id);
        incident.setRootCause(rootCause);
        incident.setRunbookDraft(runbookDraft);
        incident.setConfidenceScore(confidenceScore);
        Incident updated = incidentRepository.save(incident);
        log.info("Updated incident [{}] with runbook (confidence: {})", id, confidenceScore);

        return updated;
    }

    public List<Incident> findAll(){

        return incidentRepository.findAll();
    }
}
