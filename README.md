# Vu tru do dac - Cho troi VNG

Artemis is a space-themed AgentBase demo that helps VNG Starters find lost items, return found items, and pass second-hand items through a lightweight internal marketplace.

## Live Endpoint

https://endpoint-0f7feba7-a302-4a7b-91f5-5b49b2a6fc36.agentbase-runtime.aiplatform.vngcloud.vn/

Health check:

```text
https://endpoint-0f7feba7-a302-4a7b-91f5-5b49b2a6fc36.agentbase-runtime.aiplatform.vngcloud.vn/health
```

## Main Features

- Domain login with password for each Starter.
- Lost-item flow: users describe the item, date, and optionally upload an image.
- Found-item flow: users describe the item, date, location, and optionally upload an image.
- Radar matching logic based on item description, date, and image signal.
- Notification center for matched signals and interested marketplace items.
- Cho troi VNG marketplace for passing second-hand items.
- Admin approval dashboard for `artemis_8920`.
- Item editing, sold/pass toggle, hidden/visible admin controls, and star-interest tracking.

## How It Works

The frontend is a vanilla HTML/CSS/JavaScript app. User data, radar reports, notifications, and marketplace items are stored in browser `localStorage` for demo purposes.

The AgentBase deployment uses a small Python server:

- `GET /` serves the Artemis UI.
- `GET /health` returns server health for AgentBase runtime checks.
- `POST /invocations` provides a simple compatibility endpoint.

## Local Run

```powershell
python server.py
```

Then open:

```text
http://127.0.0.1:8080/
```

## Docker Build

```bash
docker build --platform linux/amd64 -t artemis-starter-galaxy:latest .
```

## Project Structure

```text
index.html      Main page
styles.css      Space-themed UI styling
app.js          Chat flow, matching logic, marketplace, admin dashboard
server.py       Runtime server for AgentBase
Dockerfile      Container image definition
assets/         Visual assets and font files
```

## Demo Accounts

- Regular user: any VNG domain-style username, for example `nguyetntm5`
- Admin user: `artemis_8920`

Passwords are created locally on first login for demo safety.

## Notes

This hackathon demo does not include production authentication or a backend database. In production, `localStorage` should be replaced with a persistent backend service and VNG domain SSO.
