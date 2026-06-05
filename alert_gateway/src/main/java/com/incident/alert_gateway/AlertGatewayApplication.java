package com.incident.alert_gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class AlertGatewayApplication {

	public static void main(String[] args) {
		SpringApplication.run(AlertGatewayApplication.class, args);
	}

}
