package com.campus.eventmanagement.event;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/events")
public class EventController {
    private final EventRepository events;

    public EventController(EventRepository events) {
        this.events = events;
    }

    @GetMapping
    public List<EventEntity> listEvents() {
        return events.findByActiveTrueOrderByStartsAtAsc();
    }

    @GetMapping("/{id}")
    public EventEntity getEvent(@PathVariable Long id) {
        return events.findById(id).filter(EventEntity::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
    }

    @PostMapping
    public EventEntity createEvent(@Valid @RequestBody EventRequest request,
                                   @RequestHeader(value = "X-User-Id", required = false) Long userId,
                                   @RequestHeader(value = "X-User-Role", required = false) String role) {
        requireAdmin(role);
        validateDates(request);
        return events.save(new EventEntity(request.title().trim(), request.description(), request.venue().trim(),
                request.startsAt(), request.endsAt(), request.capacity(), userId));
    }

    @PutMapping("/{id}")
    public EventEntity updateEvent(@PathVariable Long id, @Valid @RequestBody EventRequest request,
                                   @RequestHeader(value = "X-User-Role", required = false) String role) {
        requireAdmin(role);
        validateDates(request);
        EventEntity event = events.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        event.update(request.title().trim(), request.description(), request.venue().trim(),
                request.startsAt(), request.endsAt(), request.capacity());
        return events.save(event);
    }

    @DeleteMapping("/{id}")
    public void deleteEvent(@PathVariable Long id,
                            @RequestHeader(value = "X-User-Role", required = false) String role) {
        requireAdmin(role);
        EventEntity event = events.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        event.deactivate();
        events.save(event);
    }

    private void requireAdmin(String role) {
        if (!"ADMIN".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access required");
        }
    }

    private void validateDates(EventRequest request) {
        if (!request.endsAt().isAfter(request.startsAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event end must be after its start");
        }
    }

    public record EventRequest(
            @NotBlank @Size(max = 180) String title,
            @NotBlank @Size(max = 4000) String description,
            @NotBlank @Size(max = 180) String venue,
            @NotNull LocalDateTime startsAt,
            @NotNull LocalDateTime endsAt,
            @Min(1) int capacity) { }
}
