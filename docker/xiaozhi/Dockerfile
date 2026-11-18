FROM ghcr.nju.edu.cn/xinnan-tech/xiaozhi-esp32-server:server_latest

COPY providers/mobile_text_only_asr.py /opt/xiaozhi-esp32-server/core/providers/asr/mobile_text_only.py
COPY providers/mobile_text_only_tts.py /opt/xiaozhi-esp32-server/core/providers/tts/mobile_text_only.py
COPY providers/libot_mcp_executor.py /opt/xiaozhi-esp32-server/core/providers/tools/server_mcp/mcp_executor.py

# Older Xiaozhi releases read Tool.inputSchema while MCP Python SDK 2.x exposes
# input_schema. Newer releases use a different MCP-client implementation, where
# this compatibility patch must be skipped rather than breaking the image build.
RUN python -c "from pathlib import Path; p=Path('/opt/xiaozhi-esp32-server/core/providers/tools/server_mcp/mcp_client.py'); s=p.read_text(); old='tool.inputSchema'; new='getattr(tool, \"inputSchema\", getattr(tool, \"input_schema\", {}))'; p.write_text(s if new in s or old not in s else s.replace(old, new))"

# LiBot v1 exposes only its two allow-listed library MCP tools. Upstream adds
# exit/lunar plugins even when Intent.functions is empty, so remove that
# implicit allow-list rather than offering unrelated weather/news/music tools.
RUN python -c "from pathlib import Path; import re; p=Path('/opt/xiaozhi-esp32-server/core/providers/tools/server_plugins/plugin_executor.py'); s=p.read_text(); s, count=re.subn(r'necessary_functions\\s*=\\s*\\[[^]]*\\]', 'necessary_functions = []', s, count=1); assert count == 1, 'expected default plugin allow-list not found'; p.write_text(s)"
