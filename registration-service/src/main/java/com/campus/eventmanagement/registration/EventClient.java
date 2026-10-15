package com.campus.eventmanagement.registration;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "event-service")
public interface EventClient {
    @GetMapping("/api/events/{id}")
    EventSummary getEvent(@PathVariable("id") Long id);

    record EventSummary(Long id, int capacity, boolean active) { }
}
