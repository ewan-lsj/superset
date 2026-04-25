# Automated Security & Error Resolution Architecture

Production-grade automation for detecting, triaging, and fixing security
vulnerabilities and runtime errors using Devin, Sentry, Linear, and Slack.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DETECTION LAYER                              │
│                                                                     │
│   ┌──────────────┐         ┌──────────────┐                        │
│   │  Scheduled    │         │   Sentry     │                        │
│   │  CVE Scan     │         │   Alerts     │                        │
│   │  (Daily 9AM)  │         │  (Realtime)  │                        │
│   └──────┬───────┘         └──────┬───────┘                        │
└──────────┼─────────────────────────┼────────────────────────────────┘
           │                         │
           ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        TRIAGE LAYER                                 │
│                                                                     │
│                      ┌──────────────┐                               │
│                      │    Linear    │                                │
│                      │   (Tickets)  │                                │
│                      └──────┬───────┘                               │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      RESOLUTION LAYER                               │
│                                                                     │
│                      ┌──────────────┐                               │
│                      │    Devin     │                                │
│                      │  (Playbook)  │                                │
│                      └──────┬───────┘                               │
│                             │                                       │
│                    ┌────────┴────────┐                               │
│                    ▼                 ▼                               │
│             ┌────────────┐   ┌────────────┐                         │
│             │   GitHub   │   │   Linear   │                         │
│             │    (PR)    │   │  (Update)  │                         │
│             └────────────┘   └────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AUDIT LAYER                                  │
│                                                                     │
│              ┌──────────────┐                                       │
│              │    Slack     │  (Future: Dashboard)                   │
│              │   #channel   │                                       │
│              └──────────────┘                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Flow 1: CVE Dependency Scanning

**Trigger**: Scheduled daily at 9:00 AM UTC, Monday–Friday.

**Pipeline**:
1. Devin session starts via schedule → runs `!cve-scan` playbook
2. Scans `pyproject.toml` / `requirements.txt` / `package.json` with `pip-audit` or `npm audit`
3. For each CVE found:
   - Deduplicates against existing Linear issues
   - Creates a Linear ticket with severity, CVE ID, affected/fixed versions
   - Upgrades the dependency in a feature branch
   - Opens a PR referencing the Linear ticket
4. Posts detection, fix, and summary messages to Slack

**Resources created**:
- **Playbook**: `!cve-scan` — `Security: CVE Dependency Scanner` (playbook-0c6a23f761b94e078ef18ef8f2666723)
- **Schedule**: `Daily CVE Dependency Scan` — cron `0 9 * * 1-5` (sched-03165ae0e095422baa6e0572b614286c)

**Scaling**: Add more repositories by creating additional schedules pointing to the same `!cve-scan` playbook with different repo targets.

---

## Flow 2: Sentry Runtime Error Resolution

**Trigger**: Sentry error → Linear ticket → Devin picks it up.

**Pipeline**:
1. Sentry detects a runtime error (e.g. `ZeroDivisionError`, `TypeError`)
2. Sentry creates a Linear issue via the Sentry-Linear integration (see setup below)
3. The Linear issue is labeled `!sentry-fix`, triggering a Devin session
4. Devin uses the Sentry MCP to pull the full stack trace and error context
5. Devin analyzes the root cause, implements a fix, runs linters/tests
6. Opens a PR referencing both the Linear ticket and Sentry issue
7. Updates the Linear ticket status and posts audit message to Slack

**Resources created**:
- **Playbook**: `!sentry-fix` — `Sentry: Runtime Error Resolver` (playbook-13bbe562bdaf4f0e83f6af80bd6e9574)

**Scaling**: This flow is fully generic — works for any exception type in any repo that reports to the same Sentry org.

---

## Setup Instructions

### Already configured

- [x] Devin ↔ GitHub integration (repo access, PR creation)
- [x] Devin ↔ Linear MCP (issue creation, updates)
- [x] Devin ↔ Sentry MCP (error investigation, trace retrieval)
- [x] Devin ↔ Slack MCP (audit messages)
- [x] `!cve-scan` playbook created
- [x] `!sentry-fix` playbook created
- [x] Daily CVE scan schedule (weekdays 9 AM UTC)

### You need to configure

#### 1. Sentry → Linear integration (routes errors to Linear)

This enables Sentry to automatically create Linear issues when errors occur.

1. Go to your Sentry project settings: `https://retool-77.sentry.io/settings/`
2. Navigate to **Integrations** → search for **Linear**
3. Install the Linear integration and authorize it
4. Configure alert rules:
   - Go to **Alerts** → **Create Alert Rule**
   - Condition: "When a new issue is created" or "When an event frequency exceeds a threshold"
   - Action: "Create a Linear issue" in team **Ewan Personal**
   - The issue will be tagged with the Sentry issue link automatically

#### 2. Linear → Devin automation trigger (assigns Sentry tickets to Devin)

This makes Devin automatically pick up Sentry-originated Linear issues.

1. Go to Devin settings: `https://app.devin.ai/settings/integrations/linear`
2. Under **Synced Playbook Labels**, add the `!sentry-fix` playbook
3. Under **Automation Triggers**, create a trigger:
   - **Trigger on**: Issue created
   - **Filter by team**: Ewan Personal
   - **Filter by label or source**: Issues created by the Sentry integration
   - **Playbook**: `!sentry-fix` (Sentry: Runtime Error Resolver)

#### 3. Create a Sentry project for Superset

If you haven't already:

1. Go to `https://retool-77.sentry.io`
2. Create a new project for the Superset application
3. Install the Sentry SDK in Superset (add `sentry-sdk[flask]` to dependencies)
4. Configure `SENTRY_DSN` in your Superset config

#### 4. Slack audit channel

The playbooks post to `#new-channel` (C0AUP46V410). To change:
- Update the playbook bodies to reference a different channel ID
- Or create a dedicated `#security-audit` channel and update accordingly

---

## Seeded Demo Issues

This repo has 2 CVEs and 1 runtime error pre-loaded for demonstration:

| # | Type | Issue | Location |
|---|------|-------|----------|
| 1 | CVE | CVE-2023-23931 — `cryptography` 39.x (memory corruption) | `pyproject.toml:48` |
| 2 | CVE | CVE-2023-44271 — `Pillow` 9.x (DoS via large TIFF) | `pyproject.toml:85` |
| 3 | Sentry | `ZeroDivisionError` in chart statistics endpoint | `superset/charts/api.py` — `/api/v1/chart/<id>/statistics` |

---

## Running the Demo

### Demo A: CVE Detection → Fix (fully automated)

1. Show that the schedule `Daily CVE Dependency Scan` is active
2. Either wait for the next scheduled run, or trigger it manually:
   - In Devin, start a session with prompt: _"Scan ewan-lsj/superset for CVEs"_
   - Attach the `!cve-scan` playbook
3. Watch Devin:
   - Detect CVE-2023-23931 and CVE-2023-44271
   - Create Linear tickets for each
   - Open PRs with the version upgrades
   - Post audit trail to Slack

### Demo B: Sentry Error → Fix (webhook-driven)

1. Show the `ZeroDivisionError` in Sentry (trigger it by hitting
   `GET /api/v1/chart/<id>/statistics` for a chart with `viz_type = "table"`)
2. Sentry alert fires → Linear issue created automatically
3. Linear automation trigger assigns it to Devin with `!sentry-fix`
4. Watch Devin:
   - Query Sentry for the full stack trace
   - Identify the division-by-zero in `charts/api.py`
   - Add a guard clause
   - Open a PR, update the Linear ticket
   - Post audit trail to Slack

### Demo C: Slack Audit Trail

Show the Slack channel with the full chronological audit:
- `[CVE Scan] High vulnerability found: CVE-2023-23931 in cryptography...`
- `[CVE Fix] PR opened for CVE-2023-23931: ...`
- `[Sentry Fix] ZeroDivisionError in charts/api.py:statistics — ...`

---

## Extending to Production Scale

### Adding repositories
Create a new schedule per repo pointing to `!cve-scan`. The playbook is
repo-agnostic and detects the package manager automatically.

### Adding languages
Extend the `!cve-scan` playbook with additional scanner commands
(e.g. `npm audit --json` for Node, `cargo audit --json` for Rust).

### Dashboard audit (future)
Replace or supplement Slack with a structured dashboard:
- Store audit events in a database via API calls in the playbooks
- Build a Superset dashboard to visualize detection/fix metrics
- Track MTTR (mean time to remediation), CVE severity trends, fix success rate

### Additional error sources
The `!sentry-fix` playbook works for any exception type. Extend the
Sentry alert rules to cover more conditions (error frequency thresholds,
specific exception types, specific services).
