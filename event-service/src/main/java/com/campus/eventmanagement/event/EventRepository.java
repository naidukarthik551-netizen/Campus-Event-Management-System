package com.campus.eventmanagement.event;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventRepository extends JpaRepository<EventEntity, Long> {
    List<EventEntity> findByActiveTrueOrderByStartsAtAsc();
}
