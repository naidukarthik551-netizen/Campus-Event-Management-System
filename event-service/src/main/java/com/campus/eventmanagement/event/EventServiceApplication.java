package com.campus.eventmanagement.event;

import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class EventServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(EventServiceApplication.class, args);
    }

    @Bean
    CommandLineRunner seedDemoEvents(EventRepository events,
                                     @Value("${app.seed-demo-events:false}") boolean seedDemoEvents) {
        return args -> {
            if (!seedDemoEvents || events.count() > 0) {
                return;
            }

            LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
            events.save(new EventEntity("Campus Makers Meetup",
                    "Meet student builders, share ideas, and start something new.",
                    "Innovation Hub", now.plusDays(2).withHour(17), now.plusDays(2).withHour(19), 80, 1L));
            events.save(new EventEntity("Design for Good Workshop",
                    "A hands-on workshop exploring thoughtful design for campus communities.",
                    "Studio 204", now.plusDays(5).withHour(14), now.plusDays(5).withHour(16), 35, 1L));
            events.save(new EventEntity("Spring Coding Social",
                    "Bring a project, meet collaborators, and enjoy an evening of coding.",
                    "Library Commons", now.plusDays(9).withHour(18), now.plusDays(9).withHour(21), 60, 1L));
        };
    }
}
