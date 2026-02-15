# Cloudflare Anomaly Alerts Configuration

This document outlines the configuration for security and operational alerts in Cloudflare to detect catastrophes and anomalies.

## 1. API Error Rate Spike

**Goal**: Detect when the API is failing for a significant portion of users.

- **Threshold**: >5% error rate (5xx status codes) in a 5-minute window.
- **Cloudflare Setup**:
    1. Go to **Notifications** > **Add**.
    2. Select **HTTP Traffic** > **Advanced HTTP Alert** (or **Origin Error Rate** if on Free/Pro).
    3. **Filters**:
        - Status Code: `500`, `502`, `503`, `504`.
        - Zone: `slopcade.app` (or all zones).
    4. **Sensitivity**: High.
    5. **Notification Method**: Email + Webhook (Slack/Discord).

## 2. Generation Velocity Spike

**Goal**: Detect potential abuse or runaway AI generation processes.

- **Threshold**: >100 generations in 1 minute.
- **Cloudflare Setup**:
    - *Note: Traffic Anomaly detection is an Enterprise feature.*
    - **Workaround (Workers Usage)**:
        1. Go to **Notifications** > **Add**.
        2. Select **Workers** > **Workers Usage Notification**.
        3. Set threshold based on expected CPU time or request count for 100 generations.
    - **Alternative (Custom Logpush)**:
        - Push logs to a free observability tool (e.g., **Axiom**, **BetterStack**, or **Sentry**).
        - Configure an alert in the external tool for `action = "admin.generate_*"` count > 100/min.

## 3. Billing Anomaly

**Goal**: Prevent massive unexpected costs from AI APIs or Cloudflare usage.

- **Threshold**: >10x normal spend rate or exceeding a fixed safety cap.
- **Cloudflare Setup**:
    1. Go to **Notifications** > **Add**.
    2. Select **Billing** > **Usage Based Billing**.
    3. Set a threshold that is slightly above normal daily spend (e.g., $20 if normal is $2).
- **External (Scenario/ElevenLabs)**:
    - Configure "Usage Alerts" or "Hard Caps" in the respective provider dashboards if available.

## 4. Notification Channels

- **Primary**: Email to `admin@slopcade.app`.
- **Secondary**: Webhook to `#alerts` channel in Discord/Slack.
    - Use Cloudflare's built-in Webhook destination.

## Limitations & Notes

- **Free Tier**: Some advanced HTTP alerts may require a Pro or Business plan. If unavailable, use **Worker Tail** or **Logpush** to an external free-tier monitoring service.
- **Latency**: Cloudflare notifications can have a 1-5 minute delay.
- **Granularity**: Cloudflare's built-in alerts are often zone-wide. For per-endpoint alerting (e.g., just `/generate`), external log analysis is required.
