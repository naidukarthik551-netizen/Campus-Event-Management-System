package com.campus.eventmanagement.certificate;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CertificateRepository extends JpaRepository<CertificateEntity, Long> {
    boolean existsByRegistrationId(Long registrationId);
    List<CertificateEntity> findByUserIdOrderByIssuedAtDesc(Long userId);
}
