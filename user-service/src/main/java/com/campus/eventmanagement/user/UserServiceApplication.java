package com.campus.eventmanagement.user;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class UserServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }

    @Bean
    CommandLineRunner bootstrapAdmin(UserRepository users, PasswordEncoder passwordEncoder,
                                    @Value("${app.bootstrap-admin.email:}") String email,
                                    @Value("${app.bootstrap-admin.password:}") String password,
                                    @Value("${app.bootstrap-admin.full-name:Campus Administrator}") String fullName) {
        return args -> {
            if (email.isBlank() && password.isBlank()) {
                return;
            }
            if (email.isBlank() || password.length() < 8 || fullName.isBlank() || fullName.length() > 120) {
                throw new IllegalStateException(
                        "Admin bootstrap requires an email, a password of at least 8 characters, and a valid full name");
            }
            String normalizedEmail = email.trim().toLowerCase();
            if (!users.existsByEmail(normalizedEmail)) {
                users.save(new UserEntity(fullName.trim(), normalizedEmail,
                        passwordEncoder.encode(password), "ADMIN"));
            }
        };
    }
}
