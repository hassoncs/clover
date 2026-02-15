# Cloudflare Alert Definitions

This document defines the critical alerts configured in the Cloudflare dashboard for the Slopcade API.

## 1. API Error Rate Spike

- **Name**: API Error Rate Spike (5xx)
- **Description**: Triggers when the percentage of 5xx error responses from the Worker exceeds the threshold.
- **Threshold**: > 5% 5xx errors
- **Time Window**: 5 minutes
- **Notification Channel**: Email, Slack (via Webhook)
- **Severity Level**: P1 (Critical)
- **Cloudflare Alert Type**: HTTP Error Rate Alert
- **Configuration Steps**:
  1. Go to **Notifications** > **Alerts** in the Cloudflare Dashboard.
  2. Click **Add** and select **HTTP Error Rate**.
  3. Set **Sensitivity** to "High" or custom threshold of 5%.
  4. Select the `slopcade-api` Worker.
  5. Configure notification destinations.

## 2. Generation Velocity Spike

- **Name**: Generation Velocity Spike
- **Description**: Triggers when there is an unusual spike in traffic, specifically targeting the generation endpoints.
- **Threshold**: > 100 requests/min (or 2x baseline)
- **Time Window**: 5 minutes
- **Notification Channel**: Email, Slack (via Webhook)
- **Severity Level**: P2 (High)
- **Cloudflare Alert Type**: Traffic Anomaly Alert
- **Configuration Steps**:
  1. Go to **Notifications** > **Alerts**.
  2. Click **Add** and select **Traffic Anomaly**.
  3. Filter by path if possible (e.g., `/api/trpc/adminTools.generate*`).
  4. Set sensitivity to trigger on spikes exceeding 100 req/min.
  5. Configure notification destinations.

## 3. Billing Anomaly Rate

- **Name**: Billing Anomaly / Usage Spike
- **Description**: Triggers when usage of Cloudflare services (Workers, D1, R2) exceeds expected daily spend or usage limits.
- **Threshold**: > $50/day (or 50% increase over previous day)
- **Time Window**: Daily
- **Notification Channel**: Email
- **Severity Level**: P2 (High)
- **Cloudflare Alert Type**: Usage Based Billing Alert
- **Configuration Steps**:
  1. Go to **Notifications** > **Alerts**.
  2. Click **Add** and select **Usage Based Billing**.
  3. Select products: Workers, D1, R2.
  4. Set threshold based on budget (e.g., $50).
  5. Configure notification destinations.

## 4. Worker CPU/Memory Limits

- **Name**: Worker Resource Exhaustion
- **Description**: Triggers when Workers hit CPU or memory limits (Error 1102).
- **Threshold**: > 10 occurrences
- **Time Window**: 15 minutes
- **Notification Channel**: Slack
- **Severity Level**: P2 (High)
- **Cloudflare Alert Type**: Worker Metrics Alert
- **Configuration Steps**:
  1. Go to **Notifications** > **Alerts**.
  2. Click **Add** and select **Worker Metrics**.
  3. Select "CPU Time" or "Exceptions".
  4. Configure notification destinations.
