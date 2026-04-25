# Automated CVE Remediation Architecture

Production-grade automation for detecting, triaging, and fixing dependency
vulnerabilities using the Devin API, Linear, and Slack.

The automation system lives in a separate repository:
[ewan-lsj/devin-vuln-remediation](https://github.com/ewan-lsj/devin-vuln-remediation)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DETECTION LAYER                              │
│                                                                     │
│   ┌──────────────────┐         ┌──────────────────┐                │
│   │  Webhook / API   │         │  Scheduled Scan  │                │
│   │  (POST /api/scan)│         │  (Daily 9AM UTC) │                │
│   └────────┬─────────┘         └────────┬─────────┘                │
└────────────┼────────────────────────────┼──────────────────────────┘
             │                            │
             ▼                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SCANNING LAYER                               │
│                                                                     │
│              ┌────────────────────────────┐                         │
│              │  pip-audit / OSV.dev API   │                         │
│              │  (scans pyproject.toml)    │                         │
│              └────────────┬───────────────┘                         │
└───────────────────────────┼─────────────────────────────────────────┘
                            │ CVE findings
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        TRIAGE LAYER                                 │
│                                                                     │
│              ┌────────────────────────────┐                         │
│              │  Linear (deduplicate +     │                         │
│              │  create tickets)           │                         │
│              └────────────┬───────────────┘                         │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      RESOLUTION LAYER                               │
│                                                                     │
│              ┌────────────────────────────┐                         │
│              │  Devin API v3              │                         │
│              │  (POST /sessions → poll)   │                         │
│              └────────────┬───────────────┘                         │
│                           │                                         │
│                  ┌────────┴────────┐                                │
│                  ▼                 ▼                                 │
│           ┌────────────┐   ┌────────────┐                           │
│           │  GitHub PR │   │  Linear    │                           │
│           │            │   │  (update)  │                           │
│           └────────────┘   └────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AUDIT LAYER                                  │
│                                                                     │
│        ┌──────────────┐         ┌──────────────────┐               │
│        │    Slack      │         │   Dashboard      │               │
│        │   #channel    │         │  (localhost:8000) │               │
│        └──────────────┘         └──────────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Seeded Vulnerabilities

This repo has 2 CVEs pre-loaded as test cases for the automation:

| # | CVE | Package | Pinned Version | Fixed In | Severity |
|---|-----|---------|----------------|----------|----------|
| 1 | CVE-2023-23931 | `cryptography` | `>=39.0.0, <40.0.0` | `41.0.0` | HIGH (memory corruption) |
| 2 | CVE-2023-44271 | `Pillow` | `>=9.0.0, <9.1.0` | `10.0.1` | MEDIUM (DoS via large TIFF) |

Both are in `pyproject.toml`.

---

## Running the Demo

### 1. Start the automation system

```bash
git clone https://github.com/ewan-lsj/devin-vuln-remediation.git
cd devin-vuln-remediation
cp .env.example .env
# Edit .env with your credentials (Devin API key, Linear, Slack)
docker compose up --build
```

Dashboard available at `http://localhost:8000`.

### 2. Trigger a scan

**Via dashboard**: Click "Trigger Scan" in the UI.

**Via API**:
```bash
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"repo": "ewan-lsj/superset"}'
```

### 3. Watch the pipeline

The system will:
1. Scan `pyproject.toml` and detect CVE-2023-23931 + CVE-2023-44271
2. Create Linear tickets for each (with severity, CVE details, affected versions)
3. Call the Devin API to create a remediation session per CVE
4. Each Devin session upgrades the dependency in `pyproject.toml` and opens a PR
5. Linear tickets are updated with PR links and moved to "In Review"
6. Slack receives audit messages at each step

### 4. Observe

- **Dashboard** (`http://localhost:8000`): real-time scan status, CVE counts, PR links
- **Linear**: tickets created with full CVE context
- **Slack**: chronological audit trail
- **GitHub**: PRs opened by Devin fixing each vulnerability

---

## Extending

### More repositories
Pass any `owner/repo` to the `/api/scan` endpoint. The system is repo-agnostic.

### More languages
Extend `scanner.py` to support `npm audit --json`, `cargo audit --json`, etc.

### CI/CD integration
Point a GitHub Actions workflow or cron job at the `/api/webhook` endpoint.

### Production hardening
- Replace in-memory store with PostgreSQL/Redis
- Add webhook authentication
- Add rate limiting for Devin API calls
- Deploy behind a reverse proxy with TLS
