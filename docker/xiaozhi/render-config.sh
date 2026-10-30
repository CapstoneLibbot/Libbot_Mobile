#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ENV_FILE="$SCRIPT_DIR/.env"
TEMPLATE_FILE="$SCRIPT_DIR/data/.config.yaml.template"
OUTPUT_FILE="$SCRIPT_DIR/data/.config.yaml"
MCP_TEMPLATE_FILE="$SCRIPT_DIR/data/.mcp_server_settings.json.template"
MCP_OUTPUT_FILE="$SCRIPT_DIR/data/.mcp_server_settings.json"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Copy .env.example to .env and set the required values." >&2
  exit 1
fi

# shellcheck disable=SC1090
. "$ENV_FILE"

for REQUIRED_VAR in XIAOZHI_LAN_IP DEEPSEEK_API_KEY LIBBOT_BE_MCP_URL LIBBOT_VOICE_TOOLS_TOKEN; do
  eval "VALUE=\${$REQUIRED_VAR:-}"
  if [ -z "$VALUE" ]; then
    echo "Missing required value: $REQUIRED_VAR" >&2
    exit 1
  fi
done

export XIAOZHI_LAN_IP XIAOZHI_WS_PORT DEEPSEEK_API_KEY DEEPSEEK_MODEL
export LIBBOT_BE_MCP_URL LIBBOT_VOICE_TOOLS_TOKEN
envsubst < "$TEMPLATE_FILE" > "$OUTPUT_FILE"
chmod 600 "$OUTPUT_FILE"
envsubst < "$MCP_TEMPLATE_FILE" > "$MCP_OUTPUT_FILE"
chmod 600 "$MCP_OUTPUT_FILE"
echo "Rendered Xiaozhi config and MCP settings."
