package com.incident.alert_gateway.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record StatusUpdatePayload(
        @NotBlank
        @Pattern(regexp = "OPEN|INVESTIGATING|ESCALATED|RESOLVED|CLOSED",
                message = "Status must be one of: OPEN, INVESTIGATING, ESCALATED, RESOLVED, CLOSED")
        String status,

        String resolutionNote
) {}