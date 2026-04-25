# Demo: Automated Vulnerability & Error Detection → Devin Fix

This repo has been seeded with **2 CVEs** and **1 Sentry runtime error** for
demonstrating an end-to-end detection → automated fix pipeline.

---

## Issue 1 — CVE-2023-23931: `cryptography` (memory corruption)

**What was done:** `cryptography` was pinned to `>=39.0.0, <40.0.0` in
`pyproject.toml`. Versions before 41.0.0 are affected by CVE-2023-23931, which
allows memory corruption when misusing certain APIs.

**How to detect:**
- GitHub Dependabot will flag this automatically on the repo.
- Or run manually: `pip-audit` / `safety check` / Snyk CLI.

**How to demo the fix with Devin:**

> Prompt Devin:
>
> _"Dependabot flagged CVE-2023-23931 in our `cryptography` dependency. The
> current pin in `pyproject.toml` is `>=39.0.0, <40.0.0` but the fix requires
> `>=41.0.0`. Please upgrade the `cryptography` version constraint to
> `>=42.0.4, <47.0.0` and open a PR."_

**Expected outcome:** Devin updates the single line in `pyproject.toml` and
opens a clean PR.

---

## Issue 2 — CVE-2023-44271: `Pillow` (denial of service)

**What was done:** `Pillow` was pinned to `>=9.0.0, <9.1.0` in
`pyproject.toml`. Versions before 10.0.1 are affected by CVE-2023-44271, which
allows denial of service through uncontrolled resource consumption when
processing large TIFF images.

**How to detect:**
- GitHub Dependabot will flag this automatically on the repo.
- Or run manually: `pip-audit` / `safety check` / Snyk CLI.

**How to demo the fix with Devin:**

> Prompt Devin:
>
> _"Dependabot flagged CVE-2023-44271 in our `Pillow` dependency. The current
> pin in `pyproject.toml` is `>=9.0.0, <9.1.0` but versions before 10.0.1 are
> vulnerable. Please upgrade the `Pillow` version constraint to
> `>=11.0.0, <13` and open a PR."_

**Expected outcome:** Devin updates the single line in `pyproject.toml` and
opens a clean PR.

---

## Issue 3 — Sentry Runtime Error: `ZeroDivisionError` in chart statistics endpoint

**What was done:** A new `/api/v1/chart/<id>/statistics` endpoint was added in
`superset/charts/api.py`. It computes `avg_owners_per_query` by dividing
`total_owners` by `chart.viz_type.count("_")`. When a chart's `viz_type` string
contains no underscores (e.g. `"table"`, `"pie"`), `count("_")` returns `0`,
causing a `ZeroDivisionError` that Sentry captures as an unhandled exception.

**How to detect:**
- Sentry will capture the `ZeroDivisionError` with a full stack trace pointing
  to `superset/charts/api.py` in the `statistics` method.

**How to demo the fix with Devin:**

> Prompt Devin (paste the Sentry error or link):
>
> _"Sentry is reporting a `ZeroDivisionError` in
> `superset/charts/api.py` in the `statistics` endpoint. The error occurs on
> line `avg_owners_per_query = total_owners / chart.viz_type.count("_")` when
> `viz_type` has no underscores. Please fix the division-by-zero and open a
> PR."_

**Expected outcome:** Devin adds a guard (e.g. `max(count, 1)` or a
conditional check) to prevent the division by zero and opens a PR.

---

## Full End-to-End Demo Flow

1. **Show the seeded repo** — point out the 3 issues exist in the codebase.
2. **Trigger detection** — show Dependabot alerts (CVEs) and/or a Sentry
   dashboard (runtime error) catching the issues automatically.
3. **Send to Devin** — copy the alert details into a Devin prompt (or use a
   Sentry/GitHub integration to route automatically).
4. **Devin fixes it** — Devin reads the codebase, identifies the fix, and opens
   a PR.
5. **Review & merge** — show the clean diff and merge the PR.
