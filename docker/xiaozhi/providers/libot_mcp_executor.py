"""LiBot's constrained MCP executor.

The library tools return presentation-safe structured data. Search results are
sent back to the LLM so it can select the next allowed tool; terminal guidance
results are spoken directly to avoid an unnecessary second completion.
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
            await self._emit_guidance_started(actual_name, arguments, result)
            payload = self._payload(result)
            # A successful search must return to the LLM so it can decide the
            # next tool from the reader's full request (for example, search
            # then guide immediately when the reader already asked to go there).
            if actual_name in {"search_books", "search_locations"} and payload and not self._get_val(payload, "errorCode", "ErrorCode"):
                logger.bind(tag=TAG).info(f"LiBot tool completed: {actual_name}; continue_with_llm=true")
                return ActionResponse(
                    action=Action.REQLLM,
                    result=json.dumps(
                        {"tool": actual_name, "result": payload},
                        ensure_ascii=False,
                    ),
                )
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
            return ActionResponse(action=Action.ERROR, response="Robot chưa thể tìm kiếm lúc này. Bạn vui lòng thử lại.")

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
    def _get_val(d: Any, *keys: str) -> Any:
        if not isinstance(d, dict):
            return None
        for k in keys:
            if k in d and d[k] is not None:
                return d[k]
        lower_keys = {k.lower(): k for k in keys}
        for actual_k, v in d.items():
            if actual_k.lower() in lower_keys and v is not None:
                return v
        return None

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
        if name not in {"search_books", "start_book_guidance", "start_location_guidance"}:
            return None
        payload = self._payload(result)
        error_code = self._get_val(payload, "errorCode", "ErrorCode")
        if error_code:
            if name == "start_book_guidance":
                if error_code == "BOOK_NOT_AVAILABLE":
                    return "Có sách này, nhưng hiện chưa thể dẫn đường."
                if error_code == "BOOK_NOT_FOUND":
                    return "Thư viện hiện không có sách phù hợp."
                return "Robot chưa sẵn sàng để dẫn đường."
            if name == "start_location_guidance":
                if error_code == "LOCATION_NOT_FOUND":
                    return "Thư viện hiện không có địa điểm phù hợp."
                return "Robot chưa sẵn sàng để dẫn đường."
            return "Robot chưa thể tìm kiếm lúc này. Bạn vui lòng thử lại."

        if name == "start_book_guidance":
            title = self._get_val(payload, "title", "Title") or "cuốn sách đã chọn"
            return f"Robot đang dẫn bạn đến kệ sách {title}."
        if name == "start_location_guidance":
            location = self._get_val(payload, "name", "Name") or "địa điểm đã chọn"
            return f"Robot đang dẫn bạn đến {location}."

    async def _emit_tool_result(
        self, name: str, arguments: Dict[str, Any], result: Any
    ) -> None:
        """Forward only display-safe MCP data to the connected kiosk.

        This is intentionally a separate WebSocket message from TTS: Android can
        render cards immediately while its local Vietnamese TTS reads the answer.
        """
        if name not in {"search_books", "search_locations"}:
            return
        websocket = getattr(self.conn, "websocket", None)
        if websocket is None:
            return

        payload = self._payload(result)
        if self._get_val(payload, "errorCode", "ErrorCode"):
            return

        total_matches = int(self._get_val(payload, "totalMatches", "TotalMatches") or 0)
        message: Dict[str, Any] = {
            "type": "tool_result",
            "tool": name,
            "query": str(self._get_val(arguments, "query") or "").strip(),
            "totalMatches": total_matches,
        }
        if name == "search_locations":
            raw_locations = self._get_val(payload, "locations", "Locations") or []
            message["locations"] = [
                {
                    "endpointId": str(self._get_val(location, "endpointId", "EndpointId") or ""),
                    "name": str(self._get_val(location, "name", "Name") or ""),
                    "canGuide": bool(self._get_val(location, "canGuide", "CanGuide")),
                }
                for location in raw_locations[:3]
                if isinstance(location, dict)
                and self._get_val(location, "endpointId", "EndpointId")
                and self._get_val(location, "name", "Name")
            ]
            return await self._send_tool_result(websocket, message)

        raw_books = self._get_val(payload, "books", "Books") or []
        message["books"] = [
            {
                "bookId": str(self._get_val(book, "bookId", "BookId") or ""),
                "title": str(self._get_val(book, "title", "Title") or ""),
                "author": str(self._get_val(book, "author", "Author") or ""),
                "canGuide": bool(self._get_val(book, "canGuide", "CanGuide")),
            }
            for book in raw_books[:3]
            if isinstance(book, dict)
            and self._get_val(book, "bookId", "BookId")
            and self._get_val(book, "title", "Title")
        ]

        return await self._send_tool_result(websocket, message)

    async def _send_tool_result(self, websocket: Any, message: Dict[str, Any]) -> None:
        try:
            await websocket.send(json.dumps(message, ensure_ascii=False))
        except Exception as error:
            # A disconnected client must not fail the read-only MCP request/TTS.
            logger.bind(tag=TAG).warning(
                f"LiBot tool result delivery failed: {type(error).__name__}"
            )

    async def _emit_guidance_started(
        self, name: str, arguments: Dict[str, Any], result: Any
    ) -> None:
        if name not in {"start_book_guidance", "start_location_guidance"}:
            return
        websocket = getattr(self.conn, "websocket", None)
        if websocket is None:
            logger.bind(tag=TAG).warning("Guidance start event skipped: connection has no websocket")
            return
        payload = self._payload(result)
        job_id = str(self._get_val(payload, "jobId", "JobId") or "").strip()
        execution_id = str(self._get_val(payload, "executionId", "ExecutionId") or "").strip()
        runtime_id = str(self._get_val(payload, "runtimeId", "RuntimeId") or "").strip()
        if not job_id or not execution_id or not runtime_id:
            logger.bind(tag=TAG).warning(
                f"Guidance start event skipped: missing id (job_id={job_id}, execution_id={execution_id}, runtime_id={runtime_id})"
            )
            return
        is_book = name == "start_book_guidance"
        destination_id = (
            str(self._get_val(arguments, "bookId", "book_id") if is_book else self._get_val(arguments, "endpointId", "endpoint_id", "facilityId", "facility_id"))
            or str(self._get_val(payload, "destinationId", "destination_id", "bookId", "endpointId") or "")
        ).strip()
        destination_name = str(self._get_val(payload, "title", "Title", "name", "Name", "destinationName") or "").strip()
        if not destination_id:
            destination_id = job_id
        if not destination_name:
            destination_name = "điểm đến đã chọn"

        error_code = self._get_val(payload, "errorCode", "ErrorCode")
        logger.bind(tag=TAG).info(
            f"Emitting guidance_started: job_id={job_id}, destination_name={destination_name}, runtime_id={runtime_id}"
        )
        await self._send_tool_result(websocket, {
            "type": "guidance_started",
            "jobId": job_id,
            "executionId": execution_id,
            "guidanceKind": "BOOK_GUIDANCE" if is_book else "LOCATION_GUIDANCE",
            "startStatus": "ACCEPTED" if not error_code else "FAILED",
            "destinationId": destination_id,
            "destinationName": destination_name,
            "runtimeId": runtime_id,
        })
