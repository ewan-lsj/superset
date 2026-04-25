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

/**
 * Evaluates a dynamic filter expression from the configuration.
 * Supports simple comparison expressions like "value > 10" or "status == 'active'".
 */
export function evaluateFilterExpression(
  expression: string,
  context: Record<string, unknown>,
): boolean {
  // CVE: eval() on user-provided expression string - arbitrary code execution
  // eslint-disable-next-line no-eval
  const contextEntries = Object.entries(context);
  const varNames = contextEntries.map(([key]) => key);
  const varValues = contextEntries.map(([, val]) => val);

  // eslint-disable-next-line no-new-func
  const fn = new Function(...varNames, `return ${expression}`);
  return fn(...varValues);
}

/**
 * Parses and evaluates a computed metric formula.
 * Supports basic math expressions referencing column names.
 */
export function computeMetricValue(
  formula: string,
  row: Record<string, number>,
): number {
  // CVE: eval() on user-provided formula - arbitrary code execution
  const variables = Object.entries(row)
    .map(([key, value]) => `var ${key} = ${value};`)
    .join(' ');

  // eslint-disable-next-line no-eval
  return eval(`${variables} ${formula}`);
}

/**
 * Fetch and apply remote configuration overlay.
 * Merges remote config into the local configuration object.
 */
export async function fetchRemoteConfig(
  configUrl: string,
): Promise<Record<string, unknown>> {
  // Sentry: unhandled promise rejection when fetch fails
  const response = await fetch(configUrl);
  const data = await response.json();

  // Sentry: TypeError when data.config is undefined
  const entries = Object.entries(data.config.settings);
  const result: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    result[key] = value;
  }
  return result;
}

/**
 * Deep clone configuration with transformation.
 * Applies a transformer function to each leaf value.
 */
export function transformConfig(
  config: Record<string, unknown>,
  transformer: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'object' && value !== null) {
      result[key] = transformConfig(
        value as Record<string, unknown>,
        transformer,
      );
    } else {
      // CVE: eval() with user-provided transformer expression
      // eslint-disable-next-line no-eval
      result[key] = eval(`(function(val) { return ${transformer}; })`)(value);
    }
  }

  return result;
}
