"""LiBot's constrained MCP executor.

The two read-only library tools already return presentation-safe structured data.
Speak that data directly instead of routing it through a second LLM completion.
This avoids a Qwen tool-call/reasoning streaming edge case that can finish with an
empty audio response.
"""

from __future__ import annotations

import json
from typing import Any, Dict, Optional

from config.logger import setup_logging
from plugins_func.register import Action, ActionResponse

from ..base import ToolExecutor
from .mcp_manager import ServerMCPManager


TAG = __name__
logger = setup_logging()


class ServerMCPExecutor(ToolExecutor):
    def __init__(self, conn):
        self.conn = conn
        self.mcp_manager: Optional[ServerMCPManager] = None
        self._initialized = False

    async def initialize(self):
        if not self._initialized:
            self.mcp_manager = ServerMCPManager(self.conn)
            self._initialized = True
            await self.mcp_manager.initialize_servers()

    async def execute(
        self, conn, tool_name: str, arguments: Dict[str, Any]
    ) -> ActionResponse:
        if not self._initialized or not self.mcp_manager:
            return ActionResponse(action=Action.ERROR, response="Không thể kết nối công cụ thư viện.")

        actual_name = tool_name.removeprefix("mcp_")
        try:
            logger.bind(tag=TAG).info(f"LiBot tool started: {actual_name}")
            result = await self.mcp_manager.execute_tool(actual_name, arguments)
            await self._emit_tool_result(actual_name, arguments, result)
            response = self._format_libot_result(actual_name, result)
            if response is not None:
                logger.bind(tag=TAG).info(f"LiBot tool completed: {actual_name}; direct_tts=true")
                return ActionResponse(action=Action.RESPONSE, response=response)
            logger.bind(tag=TAG).info(f"LiBot tool completed: {actual_name}; direct_tts=false")
            return ActionResponse(action=Action.REQLLM, result=str(result))
        except ValueError as error:
            logger.bind(tag=TAG).warning(f"LiBot tool not found: {actual_name}")
            return ActionResponse(action=Action.NOTFOUND, response=str(error))
        except Exception as error:
            logger.bind(tag=TAG).error(f"LiBot tool failed: {actual_name}; {type(error).__name__}")
            return ActionResponse(action=Action.ERROR, response="LiBot chưa thể tìm kiếm lúc này. Bạn vui lòng thử lại.")

    def get_tools(self):
        if not self._initialized or not self.mcp_manager:
            return {}
        tools = {}
        for tool in self.mcp_manager.get_all_tools():
            function = tool.get("function", {})
            name = function.get("name", "")
            if name:
                from ..base import ToolDefinition, ToolType
                tools[name] = ToolDefinition(name=name, description=tool, tool_type=ToolType.SERVER_MCP)
        return tools

    def has_tool(self, tool_name: str) -> bool:
        return bool(self._initialized and self.mcp_manager and self.mcp_manager.is_mcp_tool(tool_name.removeprefix("mcp_")))

    async def cleanup(self):
        if self.mcp_manager:
            await self.mcp_manager.cleanup_all()

    @staticmethod
    def _payload(result: Any) -> Dict[str, Any]:
        payload = getattr(result, "structuredContent", None) or getattr(result, "structured_content", None)
        if isinstance(payload, dict):
            return payload
        content = getattr(result, "content", []) or []
        for item in content:
            text = getattr(item, "text", None)
            if text:
                try:
                    return json.loads(text)
                except json.JSONDecodeError:
                    break
        return {}

    def _format_libot_result(self, name: str, result: Any) -> Optional[str]:
        if name not in {"search_books", "search_areas"}:
            return None
        payload = self._payload(result)
        if payload.get("errorCode"):
            return "LiBot chưa thể tìm kiếm lúc này. Bạn vui lòng thử lại."

        if name == "search_books":
            books = payload.get("books") or []
            if not books:
                return "Tôi không tìm thấy sách phù hợp."
            intro = f"Tôi tìm thấy {payload.get('totalMatches', len(books))} kết quả."
            items = []
            for book in books[:3]:
                title = book.get("title") or "Sách không rõ tên"
                author = book.get("author") or "không rõ tác giả"
                copies = book.get("availableCopies", 0)
                items.append(f"{title}, tác giả {author}, còn {copies} bản.")
            return " ".join([intro, *items])

        areas = payload.get("areas") or []
        if not areas:
            return "Tôi không tìm thấy khu vực phù hợp."
        intro = f"Tôi tìm thấy {payload.get('totalMatches', len(areas))} kết quả."
        items = []
        for area in areas[:3]:
            name = area.get("name") or "Khu vực không rõ tên"
            floor_name = area.get("floorName") or f"tầng {area.get('floorNumber', '')}".strip()
            items.append(f"{name}, {floor_name}.")
        return " ".join([intro, *items])

    async def _emit_tool_result(
        self, name: str, arguments: Dict[str, Any], result: Any
    ) -> None:
        """Forward only display-safe MCP data to the connected kiosk.

        This is intentionally a separate WebSocket message from TTS: Android can
        render cards immediately while its local Vietnamese TTS reads the answer.
        """
        if name not in {"search_books", "search_areas"}:
            return
        websocket = getattr(self.conn, "websocket", None)
        if websocket is None:
            return

        payload = self._payload(result)
        if payload.get("errorCode"):
            return

        message: Dict[str, Any] = {
            "type": "tool_result",
            "tool": name,
            "query": str(arguments.get("query") or "").strip(),
            "totalMatches": int(payload.get("totalMatches") or 0),
        }
        if name == "search_books":
            message["books"] = [
                {
                    "bookId": str(book.get("bookId") or ""),
                    "title": str(book.get("title") or ""),
                    "author": str(book.get("author") or ""),
                    "isbn": str(book.get("isbn") or ""),
                    "classification": str(book.get("classification") or ""),
                    "availableCopies": int(book.get("availableCopies") or 0),
                }
                for book in (payload.get("books") or [])[:3]
                if isinstance(book, dict)
                and book.get("bookId")
                and book.get("title")
            ]
        else:
            message["areas"] = [
                {
                    "name": str(area.get("name") or ""),
                    "floorName": str(area.get("floorName") or ""),
                    "floorNumber": int(area.get("floorNumber") or 0),
                }
                for area in (payload.get("areas") or [])[:3]
                if isinstance(area, dict) and area.get("name")
            ]

        try:
            await websocket.send(json.dumps(message, ensure_ascii=False))
        except Exception as error:
            # A disconnected client must not fail the read-only MCP request/TTS.
            logger.bind(tag=TAG).warning(
                f"LiBot tool result delivery failed: {type(error).__name__}"
            )
