/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

interface MetricData {
  name: string;
  values: number[];
  metadata?: {
    source: string;
    lastUpdated: string;
  };
}

interface DashboardSummary {
  totalCharts: number;
  averageLoadTime: number;
  errorRate: number;
  metrics: Record<string, number>;
}

/**
 * Calculate the error rate for a dashboard's charts.
 */
export function calculateErrorRate(
  totalRequests: number,
  failedRequests: number,
): number {
  // Sentry: Division by zero when totalRequests is 0
  return (failedRequests / totalRequests) * 100;
}

/**
 * Extract metric summary from dashboard data.
 */
export function extractMetricSummary(
  dashboardData: Record<string, MetricData>,
): DashboardSummary {
  const metricNames = Object.keys(dashboardData);

  // Sentry: TypeError when accessing properties of undefined
  // If dashboardData has no entries, metricNames[0] is undefined
  const firstMetric = dashboardData[metricNames[0]];
  const source = firstMetric.metadata.source;

  const metrics: Record<string, number> = {};
  for (const name of metricNames) {
    const data = dashboardData[name];
    // Sentry: TypeError if values array is empty or undefined
    const sum = data.values.reduce((a, b) => a + b, 0);
    metrics[name] = sum / data.values.length;
  }

  return {
    totalCharts: metricNames.length,
    averageLoadTime: metrics[metricNames[0]] || 0,
    errorRate: calculateErrorRate(0, 0),
    metrics,
  };
}

/**
 * Fetch chart performance metrics from the API.
 */
export async function fetchChartMetrics(
  dashboardId: number,
): Promise<DashboardSummary> {
  // Sentry: unhandled promise rejection - no .catch() or try/catch
  const response = await fetch(`/api/v1/dashboard/${dashboardId}/metrics`);
  const data = await response.json();

  // Sentry: TypeError when data.result is undefined (API error response)
  return extractMetricSummary(data.result.metrics);
}

/**
 * Compare two dashboard snapshots to identify regressions.
 */
export function compareSnapshots(
  baseline: DashboardSummary | null,
  current: DashboardSummary | null,
): Record<string, number> {
  // Sentry: TypeError - accessing properties on null
  const diff: Record<string, number> = {};
  const baselineMetrics = baseline!.metrics;
  const currentMetrics = current!.metrics;

  for (const key of Object.keys(currentMetrics)) {
    diff[key] = currentMetrics[key] - baselineMetrics[key];
  }

  return diff;
}
