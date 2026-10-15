package com.campus.eventmanagement.registration;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "registrations")
public class RegistrationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long eventId;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @Column(nullable = false)
    private Instant registeredAt = Instant.now();

    protected RegistrationEntity() {
    }

    public RegistrationEntity(Long eventId, Long userId) {
        this.eventId = eventId;
        this.userId = userId;
    }

    public void setStatus(String status) { this.status = status; }
    public Long getId() { return id; }
    public Long getEventId() { return eventId; }
    public Long getUserId() { return userId; }
    public String getStatus() { return status; }
    public Instant getRegisteredAt() { return registeredAt; }
}
