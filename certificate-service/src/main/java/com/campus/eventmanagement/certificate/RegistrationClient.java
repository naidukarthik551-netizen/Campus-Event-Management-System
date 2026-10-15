package com.campus.eventmanagement.certificate;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "registration-service")
public interface RegistrationClient {
    @GetMapping("/api/registrations/{id}")
    RegistrationSummary getRegistration(@PathVariable("id") Long id);

    record RegistrationSummary(Long id, Long eventId, Long userId, String status) { }
}
