package com.campus.eventmanagement.registration;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RegistrationRepository extends JpaRepository<RegistrationEntity, Long> {
    List<RegistrationEntity> findAllByOrderByRegisteredAtDesc();
    List<RegistrationEntity> findByUserIdOrderByRegisteredAtDesc(Long userId);
    boolean existsByEventIdAndUserId(Long eventId, Long userId);
    long countByEventIdAndStatusNot(Long eventId, String status);
}
