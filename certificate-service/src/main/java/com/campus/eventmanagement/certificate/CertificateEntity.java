package com.campus.eventmanagement.certificate;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "certificates")
public class CertificateEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 36)
    private String certificateCode;

    @Column(nullable = false, unique = true)
    private Long registrationId;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 120)
    private String recipientName;

    @Column(nullable = false)
    private Long eventId;

    @Column(nullable = false)
    private Instant issuedAt = Instant.now();

    protected CertificateEntity() {
    }

    public CertificateEntity(String certificateCode, Long registrationId, Long userId,
                             String recipientName, Long eventId) {
        this.certificateCode = certificateCode;
        this.registrationId = registrationId;
        this.userId = userId;
        this.recipientName = recipientName;
        this.eventId = eventId;
    }

    public Long getId() { return id; }
    public String getCertificateCode() { return certificateCode; }
    public Long getRegistrationId() { return registrationId; }
    public Long getUserId() { return userId; }
    public String getRecipientName() { return recipientName; }
    public Long getEventId() { return eventId; }
    public Instant getIssuedAt() { return issuedAt; }
}
