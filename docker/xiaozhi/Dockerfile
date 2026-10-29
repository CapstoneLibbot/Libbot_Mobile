FROM ghcr.nju.edu.cn/xinnan-tech/xiaozhi-esp32-server:server_latest

COPY providers/mobile_text_only_asr.py /opt/xiaozhi-esp32-server/core/providers/asr/mobile_text_only.py
COPY providers/mobile_text_only_tts.py /opt/xiaozhi-esp32-server/core/providers/tts/mobile_text_only.py
COPY providers/libot_mcp_executor.py /opt/xiaozhi-esp32-server/core/providers/tools/server_mcp/mcp_executor.py

# MCP Python SDK 2.x exposes Tool.input_schema while older Xiaozhi code reads
# inputSchema. Support both without changing tool scope or auth behaviour.
RUN python -c "from pathlib import Path; p=Path('/opt/xiaozhi-esp32-server/core/providers/tools/server_mcp/mcp_client.py'); s=p.read_text(); old='\"parameters\": tool.inputSchema,'; new='\"parameters\": getattr(tool, \"inputSchema\", getattr(tool, \"input_schema\", {})),'; assert old in s, 'expected MCP schema expression not found'; p.write_text(s.replace(old, new))"

# LiBot v1 exposes only its two allow-listed library MCP tools. Upstream adds
# exit/lunar plugins even when Intent.functions is empty, so remove that
# implicit allow-list rather than offering unrelated weather/news/music tools.
RUN python -c "from pathlib import Path; p=Path('/opt/xiaozhi-esp32-server/core/providers/tools/server_plugins/plugin_executor.py'); s=p.read_text(); old='necessary_functions = [\"handle_exit_intent\", \"get_lunar\"]'; new='necessary_functions = []'; assert old in s, 'expected default plugin allow-list not found'; p.write_text(s.replace(old, new, 1))"
