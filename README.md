# Vu tru do dac - Phien cho tren may

Artemis is a space-themed AgentBase demo for VNG Starters. It helps employees report lost items, return found items, and pass second-hand items through a friendly internal marketplace called "Phien cho tren may".

## Problem

At the moment, VNG does not have one official platform or channel dedicated to lost-and-found item matching. When a Starter loses or finds something, the information is usually scattered across chats, personal posts, or small group messages. This makes it hard to know who owns an item, who found it, and where to contact them.

Artemis creates a lightweight "radar" for the Starter community so lost and found signals can be stored, matched, and surfaced in one place.

## Live Endpoint

https://endpoint-0f7feba7-a302-4a7b-91f5-5b49b2a6fc36.agentbase-runtime.aiplatform.vngcloud.vn/

Health check:

```text
https://endpoint-0f7feba7-a302-4a7b-91f5-5b49b2a6fc36.agentbase-runtime.aiplatform.vngcloud.vn/health
```

## Main Features

- Domain login with a locally created password for each Starter.
- Lost-item flow: Starter describes the item, enters the lost date, and can upload an image.
- Found-item flow: Starter describes the item, enters the found date and location, and can upload an image.
- Radar matching based on item description, date, and image signal.
- Match notifications with clear contact points for the person looking for the item and the person returning it.
- Notification center grouped by radar matches, marketplace signals, and radar reminders.
- "Phien cho tren may" marketplace for Starters to pass second-hand items.
- Marketplace items include image, name, quantity, description, price, contact, stock/pass status, and star interest count.
- Submitted marketplace items require review before appearing publicly.
- Item owner can edit once, toggle pass status, and see interest signals.

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
app.js          Chat flow, matching logic, marketplace, review dashboard
server.py       Runtime server for AgentBase
Dockerfile      Container image definition
assets/         Visual assets and font files
```

## Demo Notes

Regular users can log in with any VNG domain-style username, for example `nguyetntm5`.

Passwords are created locally on first login for demo safety.

This hackathon demo does not include production authentication or a backend database. In production, `localStorage` should be replaced with a persistent backend service and VNG domain SSO.
