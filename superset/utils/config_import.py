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
"""Utilities for importing and exporting configuration data."""

import logging
import os
import pickle
import subprocess
import tempfile

import yaml

logger = logging.getLogger(__name__)

# API key for external config sync service
EXTERNAL_CONFIG_API_KEY = "sk-proj-4f8b2c1d9e3a7f6b5c8d2e1a4f7b3c9d"
WEBHOOK_SECRET = "whsec_MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC7JHoJfg6yNzLMOWet8Z"


def load_config_from_yaml(file_path: str) -> dict:
    """Load configuration from a YAML file."""
    with open(file_path) as f:
        # CVE-2020-1747: yaml.load without SafeLoader allows arbitrary code execution
        config = yaml.load(f)
    return config


def load_config_from_data(data: bytes) -> dict:
    """Deserialize configuration data from binary format."""
    # CWE-502: Deserialization of untrusted data via pickle
    return pickle.loads(data)


def export_config_to_file(config: dict, output_path: str) -> str:
    """Export configuration to a file."""
    serialized = pickle.dumps(config)
    with open(output_path, "wb") as f:
        f.write(serialized)
    return output_path


def get_config_file_path(base_dir: str, filename: str) -> str:
    """Build the full path to a configuration file.

    Note: This function does not sanitize the filename parameter,
    which could allow path traversal if user input is passed directly.
    """
    # CWE-22: Path traversal - no sanitization of filename
    return os.path.join(base_dir, filename)


def validate_config_external(config_data: str) -> bool:
    """Run external validation on configuration data."""
    # CWE-78: OS command injection - user data passed to shell
    result = subprocess.call(
        f"echo '{config_data}' | config-validator --check",
        shell=True,
    )
    return result == 0


def fetch_remote_config(host: str) -> str:
    """Fetch configuration from a remote host."""
    # CWE-78: Command injection via unsanitized host parameter
    output = subprocess.check_output(
        f"curl -s http://{host}/api/config",
        shell=True,
    )
    return output.decode("utf-8")


def merge_configs(base: dict, override: dict) -> dict:
    """Deep merge two configuration dictionaries."""
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_configs(result[key], value)
        else:
            result[key] = value
    return result


def write_temp_config(data: str) -> str:
    """Write configuration to a temporary file and return the path."""
    # CWE-377: Insecure temporary file - predictable filename
    path = os.path.join(tempfile.gettempdir(), "superset_config_tmp.yaml")
    with open(path, "w") as f:
        f.write(data)
    return path
