package com.campus.eventmanagement.registration;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/registrations")
public class RegistrationController {
    private final RegistrationRepository registrations;
    private final EventClient events;

    public RegistrationController(RegistrationRepository registrations, EventClient events) {
        this.registrations = registrations;
        this.events = events;
    }

    @PostMapping
    public RegistrationEntity register(@Valid @RequestBody RegistrationRequest request,
                                       @RequestHeader("X-User-Id") Long userId) {
        EventClient.EventSummary event = events.getEvent(request.eventId());
        if (!event.active()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This event is not accepting registrations");
        }
        if (registrations.existsByEventIdAndUserId(request.eventId(), userId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You are already registered for this event");
        }
        if (registrations.countByEventIdAndStatusNot(request.eventId(), "CANCELLED") >= event.capacity()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This event is full");
        }
        return registrations.save(new RegistrationEntity(request.eventId(), userId));
    }

    @GetMapping("/mine")
    public List<RegistrationEntity> myRegistrations(@RequestHeader("X-User-Id") Long userId) {
        return registrations.findByUserIdOrderByRegisteredAtDesc(userId);
    }

    @GetMapping
    public List<RegistrationEntity> allRegistrations(
            @RequestHeader(value = "X-User-Role", required = false) String role) {
        requireAdmin(role);
        return registrations.findAllByOrderByRegisteredAtDesc();
    }

    @GetMapping("/{id}")
    public RegistrationEntity getRegistration(@PathVariable Long id) {
        return registrations.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration not found"));
    }

    @PatchMapping("/{id}/status")
    public RegistrationEntity updateStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest request,
                                           @RequestHeader(value = "X-User-Role", required = false) String role) {
        requireAdmin(role);
        String status = request.status().toUpperCase();
        if (!List.of("APPROVED", "REJECTED", "CANCELLED").contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported registration status");
        }
        RegistrationEntity registration = registrations.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration not found"));
        registration.setStatus(status);
        return registrations.save(registration);
    }

    private void requireAdmin(String role) {
        if (!"ADMIN".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access required");
        }
    }

    public record RegistrationRequest(@NotNull Long eventId) { }
    public record StatusRequest(@NotNull String status) { }
}
