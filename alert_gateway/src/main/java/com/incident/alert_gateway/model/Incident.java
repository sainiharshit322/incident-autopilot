package com.incident.alert_gateway.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "incidents")
@Getter
@Setter
@NoArgsConstructor
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String alertName;

    @Column(nullable = false)
    private String severity;

    @Column(nullable = false)
    private String service;

    @Column(nullable = false)
    private String status = "OPEN";

    private LocalDateTime resolvedAt;

    @Column(columnDefinition = "TEXT")
    private String resolutionNote;

    @Column(columnDefinition = "TEXT")
    private String rootCause;

    @Column(columnDefinition = "TEXT")
    private String runbookDraft;

    private Double confidenceScore;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
