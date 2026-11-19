package com.libot.xiaozhiaudio

import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import java.util.Locale

// Xiaozhi requires an audio-format field during its WebSocket handshake.
// Native STT sends no uplink frames, but the standard 16 kHz declaration keeps
// that handshake compatible.
private const val UPLINK_ADVERTISED_RATE = 16_000
private const val LOG_TAG = "XiaozhiAudio"
private const val GOOGLE_TTS_ENGINE = "com.google.android.tts"
private val INTERNAL_TOOL_TEXT = Regex(
  "^\\s*[%/\\s]*(search_books|search_locations|start_book_guidance|start_location_guidance)\\b.*$",
  RegexOption.IGNORE_CASE,
)
/**
 * Owns Android-native recognition and local TTS. No microphone audio or secret
 * crosses the React Native bridge.
 */
class XiaozhiAudioModule : Module() {
  private val session = XiaozhiAudioSession(
    contextProvider = { appContext.reactContext },
    emit = ::emitEvent,
  )

  override fun definition() = ModuleDefinition {
    Name("XiaozhiAudio")
    Events("onXiaozhiEvent")

    AsyncFunction("connect") { url: String, deviceId: String, promise: Promise ->
      session.connect(url, deviceId, promise)
    }
    AsyncFunction("disconnect") { promise: Promise ->
      session.disconnect()
      promise.resolve(null)
    }
    AsyncFunction("speakGreeting") { text: String, promise: Promise ->
      session.speakGreeting(text)
      promise.resolve(null)
    }
    AsyncFunction("resumeCapture") { promise: Promise ->
      session.resumeCapture()
      promise.resolve(null)
    }
    AsyncFunction("abort") { promise: Promise ->
      session.abort()
      promise.resolve(null)
    }
    AsyncFunction("endSession") { promise: Promise ->
      // Resolve only after Android microphone and TTS resources are released.
      // JS uses this as the ownership hand-off barrier before restarting Vosk.
      session.endSession { promise.resolve(null) }
    }
    OnDestroy { session.disconnect() }
  }

  private fun emitEvent(event: Map<String, Any?>) {
    sendEvent("onXiaozhiEvent", event)
  }
}

private class XiaozhiAudioSession(
  private val contextProvider: () -> Context?,
  private val emit: (Map<String, Any?>) -> Unit,
) {
  // Android SpeechRecognizer supplies live Vietnamese partial text. Only the
  // final transcript crosses the network to Xiaozhi through `listen/detect`.
  private val mainHandler = Handler(Looper.getMainLooper())
  private val client = OkHttpClient.Builder().pingInterval(15, TimeUnit.SECONDS).build()
  @Volatile private var webSocket: WebSocket? = null
  @Volatile private var intentionallyClosed = false
  @Volatile private var captureRunning = false
  @Volatile private var speechRecognizer: SpeechRecognizer? = null
  @Volatile private var submittedSpeechTurn = false
  @Volatile private var textToSpeech: TextToSpeech? = null
  @Volatile private var textToSpeechReady = false
  @Volatile private var socketReady = false
  private val queuedTtsText = ArrayDeque<String>()
  private val activeUtterances = mutableSetOf<String>()
  private var activeTtsUtteranceId: String? = null
  private var utteranceSequence = 0L
  private var serverTtsStopped = false
  private var pendingGreetingText: String? = null
  private var greetingUtteranceId: String? = null
  private var pendingConnect: Promise? = null
  private var connectedUrl: String? = null
  private var connectedDeviceId: String? = null

  fun connect(url: String, deviceId: String, promise: Promise) {
    if (webSocket != null && !intentionallyClosed && connectedUrl == url && connectedDeviceId == deviceId) {
      if (socketReady) emit(mapOf("type" to "connected"))
      promise.resolve(null)
      return
    }
    disconnect()
    intentionallyClosed = false
    socketReady = false
    connectedUrl = url
    connectedDeviceId = deviceId
    prepareNativeTts()
    pendingConnect = promise
    val request = Request.Builder()
      .url(url)
      .header("device-id", deviceId)
      .header("client-id", "libot-mobile")
      .build()
    webSocket = client.newWebSocket(request, object : WebSocketListener() {
      override fun onOpen(socket: WebSocket, response: Response) {
        if (webSocket !== socket) {
          socket.close(1000, "superseded connection")
          return
        }
        socket.send(helloPayload())
      }

      override fun onMessage(socket: WebSocket, text: String) {
        if (webSocket !== socket) return
        onText(text)
      }

      override fun onMessage(socket: WebSocket, bytes: ByteString) {
        if (webSocket !== socket) return
        // Android TTS reads the matching text event, so binary downlink is unused.
      }

      override fun onFailure(socket: WebSocket, throwable: Throwable, response: Response?) {
        // An old connection can fail after a new one has already been opened.
        // It must never reject or release the active voice session.
        if (webSocket !== socket) return
        webSocket = null
        socketReady = false
        Log.e(LOG_TAG, "websocket_failed: ${throwable.message}", throwable)
        pendingConnect?.reject("XIAOZHI_CONNECT_FAILED", throwable.message ?: "Kết nối Xiaozhi thất bại.", throwable)
        pendingConnect = null
        if (!intentionallyClosed) {
          emit(mapOf("type" to "error", "code" to "XIAOZHI_CONNECT_FAILED", "text" to "Không thể kết nối trợ lý giọng nói Xiaozhi."))
          emit(mapOf("type" to "disconnected"))
        }
        releaseAudio()
      }

      override fun onClosed(socket: WebSocket, code: Int, reason: String) {
        if (webSocket !== socket) return
        webSocket = null
        socketReady = false
        Log.i(LOG_TAG, "websocket_closed code=$code reason=$reason")
        releaseAudio()
        if (!intentionallyClosed) emit(mapOf("type" to "disconnected", "code" to code.toString()))
      }
    })
  }

  fun disconnect() {
    intentionallyClosed = true
    pendingConnect?.resolve(null)
    pendingConnect = null
    // Clear the reference before close(): callbacks are asynchronous and must
    // be recognised as belonging to this intentionally closed old socket.
    val socket = webSocket
    webSocket = null
    socketReady = false
    connectedUrl = null
    connectedDeviceId = null
    socket?.close(1000, "client closed")
    releaseAudio()
  }

  /**
   * Ends a reader's session. `onReleased` runs on the main thread only after
   * SpeechRecognizer and TextToSpeech have both been stopped and shut down.
   */
  fun endSession(onReleased: () -> Unit) {
    abort()
    intentionallyClosed = true
    pendingConnect?.resolve(null)
    pendingConnect = null
    val socket = webSocket
    webSocket = null
    socketReady = false
    connectedUrl = null
    connectedDeviceId = null
    socket?.close(1000, "reader session ended")
    releaseAudio {
      Log.i(LOG_TAG, "audio_released session_end")
      emit(mapOf("type" to "session_ended"))
      onReleased()
    }
  }

  fun abort() {
    webSocket?.send("{\"type\":\"abort\"}")
    mainHandler.post {
      textToSpeech?.stop()
      queuedTtsText.clear()
      activeUtterances.clear()
      serverTtsStopped = false
      pendingGreetingText = null
      greetingUtteranceId = null
    }
  }

  fun resumeCapture() {
    if (!intentionallyClosed && webSocket != null) startCapture()
  }

  fun speakGreeting(rawText: String) {
    val text = rawText.trim()
    if (text.isBlank()) return
    mainHandler.post {
      if (intentionallyClosed || webSocket == null) return@post
      stopCapture()
      if (!textToSpeechReady) {
        pendingGreetingText = text
        prepareNativeTts()
        return@post
      }
      speakGreetingText(text)
    }
  }

  private fun helloPayload(): String = JSONObject()
    .put("type", "hello")
    .put("version", 1)
    .put("transport", "websocket")
    .put("audio_params", JSONObject()
      .put("format", "opus")
      .put("sample_rate", UPLINK_ADVERTISED_RATE)
      .put("channels", 1)
      .put("frame_duration", 60))
    .put("features", JSONObject().put("aec", false))
    .toString()

  private fun onText(text: String) {
    try {
      val message = JSONObject(text)
      when (message.optString("type")) {
        "hello" -> {
          socketReady = true
          pendingConnect?.resolve(null)
          pendingConnect = null
          emit(mapOf("type" to "connected"))
        }
        "stt" -> {
          val transcript = message.optString("text")
          // Xiaozhi has completed a user turn. Stop uploading microphone audio
          // before it starts LLM/tool work; otherwise a following ambient frame
          // is interpreted as barge-in and aborts the response.
          if (transcript.isNotBlank()) stopCapture()
          emit(mapOf("type" to "stt", "text" to transcript))
        }
        "tts" -> {
          val state = message.optString("state")
          val spokenText = sanitizeAssistantText(message.optString("text"))
          if (spokenText != null) {
            emit(mapOf("type" to "tts", "state" to state, "text" to spokenText))
            if (state == "start" || state == "sentence_start") startNativeTts(spokenText)
          }
          if (state == "stop") finishTtsPlayback()
        }
        "tool_result" -> {
          val tool = message.optString("tool")
          if (tool != "search_books" && tool != "search_locations") return
          val event = mutableMapOf<String, Any?>(
            "type" to "tool_result",
            "tool" to tool,
            "query" to message.optString("query"),
            "totalMatches" to message.optInt("totalMatches", 0),
          )
          if (tool == "search_books") {
            val books = mutableListOf<Map<String, Any?>>()
            val source = message.optJSONArray("books")
            for (index in 0 until (source?.length() ?: 0)) {
              val book = source?.optJSONObject(index) ?: continue
              val bookId = book.optString("bookId")
              val title = book.optString("title")
              if (bookId.isBlank() || title.isBlank()) continue
              books.add(mapOf(
                "bookId" to bookId,
                "title" to title,
                "author" to book.optString("author"),
                "canGuide" to book.optBoolean("canGuide", false),
              ))
            }
            event["books"] = books
          } else {
            val locations = mutableListOf<Map<String, Any?>>()
            val source = message.optJSONArray("locations")
            for (index in 0 until (source?.length() ?: 0)) {
              val location = source?.optJSONObject(index) ?: continue
              val endpointId = location.optString("endpointId")
              val name = location.optString("name")
              if (endpointId.isBlank() || name.isBlank()) continue
              locations.add(mapOf(
                "endpointId" to endpointId,
                "name" to name,
                "canGuide" to location.optBoolean("canGuide", false),
              ))
            }
            event["locations"] = locations
          }
          emit(event)
        }
        "guidance_started" -> {
          val jobId = message.optString("jobId")
          val executionId = message.optString("executionId")
          val guidanceKind = message.optString("guidanceKind")
          val destinationId = message.optString("destinationId")
          val destinationName = message.optString("destinationName")
          val runtimeId = message.optString("runtimeId")
          val startStatus = message.optString("startStatus")
          if (jobId.isBlank() || executionId.isBlank() || destinationId.isBlank() ||
            destinationName.isBlank() || runtimeId.isBlank() ||
            (guidanceKind != "BOOK_GUIDANCE" && guidanceKind != "LOCATION_GUIDANCE") ||
            (startStatus != "ACCEPTED" && startStatus != "FAILED")) return
          emit(mapOf(
            "type" to "guidance_started",
            "jobId" to jobId,
            "executionId" to executionId,
            "guidanceKind" to guidanceKind,
            "startStatus" to startStatus,
            "destinationId" to destinationId,
            "destinationName" to destinationName,
            "runtimeId" to runtimeId,
          ))
        }
        // The server can report a listening state during the handshake. The
        // kiosk is not actually ready until Android capture has started.
        "listen" -> if (captureRunning) emit(mapOf("type" to "listening", "state" to message.optString("state")))
        "error" -> emit(mapOf("type" to "error", "text" to message.optString("message")))
      }
    } catch (_: Exception) {
      // Xiaozhi occasionally sends non-JSON diagnostics; they are not user-facing events.
    }
  }

  private fun startCapture() {
    if (captureRunning) return
    mainHandler.post {
      if (captureRunning || intentionallyClosed || webSocket == null) return@post
      val context = contextProvider()
      if (context == null) {
        emit(mapOf("type" to "error", "code" to "SPEECH_CONTEXT_UNAVAILABLE", "text" to "Không thể khởi tạo nhận diện giọng nói."))
        return@post
      }
      if (!SpeechRecognizer.isRecognitionAvailable(context)) {
        emit(mapOf("type" to "error", "code" to "SPEECH_SERVICE_UNAVAILABLE", "text" to "Thiết bị chưa có Google Speech Services. Hãy cài hoặc cập nhật Speech Services by Google."))
        return@post
      }
      try {
        val recognizer = SpeechRecognizer.createSpeechRecognizer(context)
        speechRecognizer = recognizer
        captureRunning = true
        submittedSpeechTurn = false
        emit(mapOf("type" to "listening"))
        recognizer.setRecognitionListener(object : RecognitionListener {
          override fun onReadyForSpeech(params: Bundle?) = Unit
          override fun onBeginningOfSpeech() {
            // A reader has started a turn even before Google can provide a
            // partial transcript. Let React Native reset its idle timer now;
            // otherwise a slow recognizer can close the modal mid-sentence.
            emit(mapOf("type" to "speech_started"))
          }
          override fun onRmsChanged(rmsdB: Float) = Unit
          override fun onBufferReceived(buffer: ByteArray?) = Unit
          override fun onEndOfSpeech() {
            if (captureRunning) emit(mapOf("type" to "thinking"))
          }
          override fun onPartialResults(results: Bundle?) {
            val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.trim()
            if (!text.isNullOrBlank() && captureRunning && !submittedSpeechTurn) {
              emit(mapOf("type" to "stt_partial", "text" to text))
            }
          }
          override fun onResults(results: Bundle?) {
            val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
            submitSpeechTurn(text.orEmpty())
          }
          override fun onError(error: Int) {
            if (submittedSpeechTurn || intentionallyClosed) return
            Log.w(LOG_TAG, "speech_recognizer_error code=$error")
            stopCapture()
            if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
              startCapture()
            } else {
              emit(mapOf("type" to "error", "code" to "SPEECH_RECOGNITION_$error", "text" to "Không thể nhận diện giọng nói. Vui lòng kiểm tra mạng và Speech Services by Google."))
            }
          }
          override fun onEvent(eventType: Int, params: Bundle?) = Unit
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
          .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
          .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "vi-VN")
          .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
          .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
          .putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, false)
        recognizer.startListening(intent)
        Log.i(LOG_TAG, "speech_recognizer_listening language=vi-VN")
      } catch (error: Exception) {
        captureRunning = false
        speechRecognizer?.runCatching { destroy() }
        speechRecognizer = null
        if (!intentionallyClosed) emit(mapOf("type" to "error", "code" to "SPEECH_START_FAILED", "text" to (error.message ?: "Không thể khởi tạo nhận diện giọng nói.")))
      }
    }
  }

  private fun submitSpeechTurn(rawText: String) {
    val text = rawText.trim()
    if (text.isBlank() || submittedSpeechTurn || !captureRunning) return
    if (INTERNAL_TOOL_TEXT.matches(text)) {
      Log.w(LOG_TAG, "ignored_internal_tool_transcript")
      stopCapture()
      startCapture()
      return
    }
    submittedSpeechTurn = true
    stopCapture()
    Log.i(LOG_TAG, "speech_recognizer_final chars=${text.length}")
    emit(mapOf("type" to "stt", "text" to text))
    webSocket?.send(JSONObject().put("type", "listen").put("state", "detect").put("text", text).toString())
  }

  private fun sanitizeAssistantText(rawText: String): String? {
    val text = rawText.trim()
    if (text.isBlank() || INTERNAL_TOOL_TEXT.matches(text)) {
      Log.w(LOG_TAG, "ignored_internal_tool_tts")
      return null
    }
    if (text.any { char -> char.code in 0x3400..0x9FFF || char.code in 0xF900..0xFAFF }) {
      Log.w(LOG_TAG, "blocked_non_vietnamese_tts")
      return "Robot chưa thể trả lời bằng tiếng Việt. Bạn vui lòng nói lại."
    }
    return text
  }

  private fun stopCapture() {
    captureRunning = false
    val recognizer = speechRecognizer
    speechRecognizer = null
    // SpeechRecognizer must be cancelled and destroyed on Android's main
    // thread. WebSocket close callbacks can arrive on an OkHttp thread.
    mainHandler.post {
      recognizer?.runCatching { cancel(); destroy() }
    }
  }

  private fun prepareNativeTts() {
    mainHandler.post {
      if (textToSpeech != null) return@post
      val context = contextProvider() ?: return@post
      var createdEngine: TextToSpeech? = null
      // Samsung's default TTS can accept a Vietnamese utterance yet produce no
      // audible output on some kiosk devices. Google Speech Services is already
      // the recognizer provider and is a more reliable Vietnamese TTS engine.
      val engine = TextToSpeech(context.applicationContext, { status ->
        if (status != TextToSpeech.SUCCESS) {
          if (!intentionallyClosed) emit(mapOf("type" to "error", "code" to "ANDROID_TTS_INIT_FAILED", "text" to "Không thể khởi tạo giọng nói tiếng Việt trên thiết bị."))
          return@TextToSpeech
        }
        val languageStatus = (createdEngine ?: textToSpeech)?.setLanguage(Locale("vi", "VN"))
          ?: TextToSpeech.ERROR
        if (languageStatus == TextToSpeech.LANG_MISSING_DATA || languageStatus == TextToSpeech.LANG_NOT_SUPPORTED) {
          if (!intentionallyClosed) emit(mapOf("type" to "error", "code" to "ANDROID_TTS_VI_UNAVAILABLE", "text" to "Thiết bị chưa có giọng đọc tiếng Việt. Hãy cài dữ liệu tiếng Việt trong Speech Services by Google."))
          return@TextToSpeech
        }
        textToSpeechReady = true
        drainPendingTts()
      }, GOOGLE_TTS_ENGINE)
      createdEngine = engine
      engine.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build(),
      )
      engine.setSpeechRate(1.0f)
      engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
        override fun onStart(utteranceId: String) = Unit
        override fun onDone(utteranceId: String) {
          mainHandler.post {
            activeUtterances.remove(utteranceId)
            if (utteranceId == greetingUtteranceId) {
              greetingUtteranceId = null
              drainQueuedTts()
              if (activeTtsUtteranceId == null && !intentionallyClosed && webSocket != null) startCapture()
              return@post
            }
            if (utteranceId == activeTtsUtteranceId) {
              activeTtsUtteranceId = null
              drainQueuedTts()
            }
            resumeWhenTtsFinished()
          }
        }
        @Deprecated("Deprecated in Java")
        override fun onError(utteranceId: String) {
          mainHandler.post {
            activeUtterances.remove(utteranceId)
            if (!intentionallyClosed) emit(mapOf("type" to "error", "code" to "ANDROID_TTS_PLAYBACK_FAILED", "text" to "Không thể phát giọng nói tiếng Việt."))
            if (utteranceId == greetingUtteranceId) {
              greetingUtteranceId = null
              drainQueuedTts()
              if (activeTtsUtteranceId == null && !intentionallyClosed && webSocket != null) startCapture()
              return@post
            }
            if (utteranceId == activeTtsUtteranceId) {
              activeTtsUtteranceId = null
              drainQueuedTts()
            }
            resumeWhenTtsFinished()
          }
        }
      })
      textToSpeech = engine
    }
  }

  private fun startNativeTts(rawText: String) {
    val text = rawText.trim()
    if (text.isBlank() || text.equals("none", ignoreCase = true)) return
    mainHandler.post {
      serverTtsStopped = false
      if (!textToSpeechReady) {
        queuedTtsText.addLast(text)
        prepareNativeTts()
        return@post
      }
      queuedTtsText.addLast(text)
      drainQueuedTts()
    }
  }

  private fun drainQueuedTts() {
    if (activeTtsUtteranceId != null || greetingUtteranceId != null) return
    val text = queuedTtsText.removeFirstOrNull() ?: return
    val engine = textToSpeech
    if (engine == null || !textToSpeechReady) {
      queuedTtsText.addFirst(text)
      return
    }
    // Server TTS arrives sentence by sentence. Feed the engine only one
    // sentence at a time so long replies cannot overrun or corrupt its queue.
    stopCapture()
    val utteranceId = "libot-${++utteranceSequence}"
    activeTtsUtteranceId = utteranceId
    activeUtterances.add(utteranceId)
    if (engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId) == TextToSpeech.ERROR) {
      activeUtterances.remove(utteranceId)
      activeTtsUtteranceId = null
      if (!intentionallyClosed) emit(mapOf("type" to "error", "code" to "ANDROID_TTS_QUEUE_FAILED", "text" to "Không thể phát câu trả lời tiếng Việt."))
      drainQueuedTts()
    }
  }

  private fun drainPendingTts() {
    pendingGreetingText?.let { text ->
      pendingGreetingText = null
      speakGreetingText(text)
    }
    drainQueuedTts()
  }

  private fun speakGreetingText(text: String) {
    val engine = textToSpeech
    if (engine == null || !textToSpeechReady) {
      pendingGreetingText = text
      prepareNativeTts()
      return
    }
    stopCapture()
    val utteranceId = "libot-greeting-${++utteranceSequence}"
    greetingUtteranceId = utteranceId
    activeUtterances.add(utteranceId)
    if (engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId) == TextToSpeech.ERROR) {
      activeUtterances.remove(utteranceId)
      greetingUtteranceId = null
      if (!intentionallyClosed) emit(mapOf("type" to "error", "code" to "ANDROID_TTS_QUEUE_FAILED", "text" to "Không thể phát lời chào tiếng Việt."))
    }
  }

  private fun finishTtsPlayback() {
    mainHandler.post {
      serverTtsStopped = true
      resumeWhenTtsFinished()
    }
  }

  private fun resumeWhenTtsFinished() {
    if (!serverTtsStopped || activeUtterances.isNotEmpty() || queuedTtsText.isNotEmpty() || activeTtsUtteranceId != null) return
    if (!intentionallyClosed && webSocket != null) {
      startCapture()
      emit(mapOf("type" to "listening"))
    }
  }

  private fun releaseAudio(onReleased: (() -> Unit)? = null) {
    stopCapture()
    mainHandler.post {
      textToSpeech?.stop()
      textToSpeech?.shutdown()
      textToSpeech = null
      textToSpeechReady = false
      queuedTtsText.clear()
      activeUtterances.clear()
      activeTtsUtteranceId = null
      serverTtsStopped = false
      pendingGreetingText = null
      greetingUtteranceId = null
      onReleased?.invoke()
    }
  }
}
