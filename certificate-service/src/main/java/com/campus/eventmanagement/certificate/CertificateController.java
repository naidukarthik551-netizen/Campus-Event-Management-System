package com.campus.eventmanagement.certificate;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/certificates")
public class CertificateController {
    private final CertificateRepository certificates;
    private final RegistrationClient registrations;

    public CertificateController(CertificateRepository certificates, RegistrationClient registrations) {
        this.certificates = certificates;
        this.registrations = registrations;
    }

    @PostMapping
    public CertificateEntity issue(@Valid @RequestBody IssueRequest request,
                                   @RequestHeader("X-User-Id") Long userId) {
        RegistrationClient.RegistrationSummary registration = registrations.getRegistration(request.registrationId());
        if (!registration.userId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This registration belongs to another user");
        }
        if (!"APPROVED".equals(registration.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A certificate requires an approved registration");
        }
        if (certificates.existsByRegistrationId(registration.id())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A certificate has already been issued");
        }
        return certificates.save(new CertificateEntity(UUID.randomUUID().toString(), registration.id(), userId,
                request.recipientName().trim(), registration.eventId()));
    }

    @GetMapping("/mine")
    public List<CertificateEntity> myCertificates(@RequestHeader("X-User-Id") Long userId) {
        return certificates.findByUserIdOrderByIssuedAtDesc(userId);
    }

    @GetMapping("/{id}")
    public CertificateEntity getCertificate(@PathVariable Long id,
                                            @RequestHeader("X-User-Id") Long userId) {
        CertificateEntity certificate = certificates.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Certificate not found"));
        if (!certificate.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This certificate belongs to another user");
        }
        return certificate;
    }

    public record IssueRequest(Long registrationId,
                               @NotBlank @Size(max = 120) String recipientName) { }
}
