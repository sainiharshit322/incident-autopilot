package com.incident.alert_gateway.model;

import jakarta.validation.constraints.NotBlank;

public record AlertPayload(

        @NotBlank String alertName,

        @NotBlank String severity,

        @NotBlank String service,

        String description
) {}