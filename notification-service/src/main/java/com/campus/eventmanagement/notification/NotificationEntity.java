package com.campus.eventmanagement.notification;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "notifications")
public class NotificationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 30)
    private String channel;

    @Column(nullable = false, length = 190)
    private String recipient;

    @Column(nullable = false, length = 180)
    private String subject;

    @Column(nullable = false, length = 4000)
    private String message;

    @Column(nullable = false, length = 20)
    private String status = "QUEUED";

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected NotificationEntity() {
    }

    public NotificationEntity(Long userId, String channel, String recipient, String subject, String message) {
        this.userId = userId;
        this.channel = channel;
        this.recipient = recipient;
        this.subject = subject;
        this.message = message;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getChannel() { return channel; }
    public String getRecipient() { return recipient; }
    public String getSubject() { return subject; }
    public String getMessage() { return message; }
    public String getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
}
