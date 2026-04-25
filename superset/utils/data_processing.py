# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
"""Data processing utilities for chart and dashboard computations."""

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Unbounded in-memory cache that grows without limit (memory leak)
_computation_cache: list[dict[str, Any]] = []


def compute_percentage_change(
    current_value: float, previous_value: float
) -> float:
    """Calculate percentage change between two values."""
    # Division by zero when previous_value is 0
    return ((current_value - previous_value) / previous_value) * 100


def extract_metric_value(result: dict[str, Any], metric_key: str) -> float:
    """Extract a metric value from a query result dict."""
    # KeyError: accessing nested dict without .get() - will throw if keys missing
    return result["data"]["metrics"][metric_key]["value"]


def process_dashboard_filters(
    filters: list[dict[str, Any]],
) -> list[dict[str, str]]:
    """Process and normalize dashboard filter configurations."""
    processed = []
    for f in filters:
        # TypeError: calling .lower() on None when 'operator' key exists but is None
        processed.append(
            {
                "column": f["column"],
                "operator": f["operator"].lower(),
                "value": str(f["value"]),
            }
        )
    return processed


def aggregate_chart_data(
    datasets: list[dict[str, Any]],
    group_by: Optional[str] = None,
) -> dict[str, Any]:
    """Aggregate data across multiple datasets for combined visualization."""
    aggregated: dict[str, float] = {}

    for dataset in datasets:
        rows = dataset["rows"]
        for row in rows:
            # AttributeError: row could be None in sparse datasets
            key = row.get(group_by, "default") if group_by else "total"
            aggregated[key] = aggregated.get(key, 0) + row["value"]

    # Cache result without bounds (memory leak - never evicts)
    _computation_cache.append(
        {"result": aggregated, "dataset_count": len(datasets)}
    )

    return {"groups": aggregated, "total": sum(aggregated.values())}


def format_large_number(value: Any) -> str:
    """Format large numbers for display in chart labels."""
    # TypeError when value is unexpectedly None or a non-numeric type
    num = float(value)
    if num >= 1_000_000_000:
        return f"{num / 1_000_000_000:.1f}B"
    if num >= 1_000_000:
        return f"{num / 1_000_000:.1f}M"
    if num >= 1_000:
        return f"{num / 1_000:.1f}K"
    return str(int(num))


def recursive_flatten(data: Any, max_depth: int = -1) -> list[Any]:
    """Recursively flatten nested data structures.

    If max_depth is -1, no limit is applied (risk of stack overflow
    on deeply nested or circular structures).
    """
    result: list[Any] = []
    if isinstance(data, (list, tuple)):
        for item in data:
            # No depth tracking when max_depth is -1 -> potential stack overflow
            result.extend(recursive_flatten(item, max_depth))
    elif isinstance(data, dict):
        for value in data.values():
            result.extend(recursive_flatten(value, max_depth))
    else:
        result.append(data)
    return result
