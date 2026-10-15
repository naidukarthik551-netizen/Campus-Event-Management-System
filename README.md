# Campus-Event-Management-System

A microservices-based web application for managing college events, workshops, hackathons, and cultural programs.

## Features

### Student

- Register and log in
- Browse events
- Register for events
- Download certificates
- View event history

### Admin

- Create events
- Manage registrations
- Approve participants
- Generate certificates

## Services

- Eureka Server: service discovery
- API Gateway: routes requests to backend services
- User Service
- Event Service
- Registration Service
- Certificate Service
- Notification Service
- React frontend

## Technology Stack

### Backend

- Spring Boot
- Spring Cloud Gateway
- Eureka Server
- OpenFeign
- Spring Security with JWT
- MySQL

### Frontend

- React, TypeScript, and Vite
- Fetch API for gateway requests

## Architecture

React frontend -> API Gateway -> Microservices -> MySQL

## Running locally

The API Gateway on port `8080` serves the frontend development app by proxying
its page and assets to Vite on port `5173`. The gateway also routes `/api`
requests to the microservices. Start MySQL first, then start the services in
this order:

1. Eureka: `mvn -pl eureka-server spring-boot:run`
2. Start each backend service in its own terminal:
   - `mvn -pl user-service spring-boot:run`
   - `mvn -pl event-service spring-boot:run`
   - `mvn -pl registration-service spring-boot:run`
   - `mvn -pl certificate-service spring-boot:run`
   - `mvn -pl notification-service spring-boot:run`
3. Frontend: `cd frontend-react && npm install && npm run dev -- --host 0.0.0.0`
4. API Gateway: `mvn -pl api-gateway spring-boot:run`

Open the forwarded port `8080` URL to use the frontend and API through the same
origin. Port `5173` can also be opened directly for Vite development; its `/api`
and `/actuator` requests are proxied to the gateway.

The backend uses MySQL at `localhost:3306` with `root` / `root` by default.
Override `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` for each backend process if
your local database differs. Set `JWT_SECRET` to the same secure secret for the
gateway and user service. If Vite runs on a different host or port, set
`FRONTEND_URL` and `FRONTEND_WS_URL` on the gateway to its HTTP and WebSocket
URLs respectively. For a separately hosted API, set `VITE_API_BASE_URL` in the
frontend environment; the default uses the Vite development proxy.

For a disposable local demo without MySQL, the backend services include the
H2 runtime driver. Start each data service with a unique in-memory JDBC URL,
`DB_USERNAME=sa`, and an empty `DB_PASSWORD`, for example:
`DB_URL='jdbc:h2:mem:campus_events;DB_CLOSE_DELAY=-1' app.seed-demo-events=true
DB_USERNAME=sa DB_PASSWORD= mvn -pl event-service spring-boot:run`. Use the
corresponding database name for each service (`campus_users`,
`campus_registrations`, `campus_certificates`, and `campus_notifications`).
Demo data is temporary and is lost when the service stops.

To enable the admin UI in a local demo, start the user service with
`APP_BOOTSTRAP_ADMIN_EMAIL` and `APP_BOOTSTRAP_ADMIN_PASSWORD` set (the password
must be at least 8 characters). `APP_BOOTSTRAP_ADMIN_FULL_NAME` is optional.
The admin account is created only when that email is not already registered;
these credentials are never enabled by default.

New accounts are students. Admin pages require an already provisioned account
with the `ADMIN` role; registration intentionally does not expose role
assignment. The notifications service currently queues notification records and
does not deliver email or SMS.

## Future Enhancements

- Email notifications
- SMS alerts
- QR code attendance
- Docker deployment
