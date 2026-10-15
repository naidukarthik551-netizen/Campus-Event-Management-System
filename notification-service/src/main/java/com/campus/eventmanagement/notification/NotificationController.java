package com.campus.eventmanagement.notification;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationRepository notifications;

    public NotificationController(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    @PostMapping
    public NotificationEntity queue(@Valid @RequestBody NotificationRequest request,
                                    @RequestHeader("X-User-Id") Long userId) {
        return notifications.save(new NotificationEntity(userId, request.channel().toUpperCase(),
                request.recipient(), request.subject(), request.message()));
    }

    @GetMapping("/mine")
    public List<NotificationEntity> myNotifications(@RequestHeader("X-User-Id") Long userId) {
        return notifications.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public record NotificationRequest(
            @NotBlank String channel,
            @NotBlank @Email String recipient,
            @NotBlank @Size(max = 180) String subject,
            @NotBlank @Size(max = 4000) String message) { }
}
