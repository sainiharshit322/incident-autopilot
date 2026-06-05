package com.incident.alert_gateway;

import org.springframework.boot.SpringApplication;

public class TestAlertGatewayApplication {

	public static void main(String[] args) {
		SpringApplication.from(AlertGatewayApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
