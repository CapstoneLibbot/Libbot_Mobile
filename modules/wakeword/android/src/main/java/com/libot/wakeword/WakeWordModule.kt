package com.libot.wakeword

import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.audiofx.AutomaticGainControl
import android.os.Handler
import android.os.Looper
import android.util.Log
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val TAG = "WakeWordModule"
private const val SAMPLE_RATE = 16000
private const val CHUNK_SAMPLES = 1280 // 80ms at 16kHz

class WakeWordModule : Module() {
  private var engine: OpenWakeWordEngine? = null
  private var recorder: AudioRecord? = null
  private var workerThread: Thread? = null
  @Volatile private var isRunning = false

  private var currentKeyword = "Hey Bot"
  private var currentThreshold = 0.5f
  private var consecutiveHits = 0
  private val mainHandler = Handler(Looper.getMainLooper())

  override fun definition() = ModuleDefinition {
    Name("WakeWord")
    Events("onWakeWord", "onListeningStateChange", "onError")

    AsyncFunction("initModels") { classifierAsset: String?, promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject("CONTEXT_NULL", "ReactContext is null", null)
        return@AsyncFunction
      }
      try {
        if (engine == null) {
          engine = OpenWakeWordEngine(context)
        }
        val targetClassifier = classifierAsset ?: "wakeword/hey_bot.onnx"
        engine?.load(classifierAsset = targetClassifier)
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("LOAD_FAILED", e.message ?: "Failed to load ONNX models", e)
      }
    }

    AsyncFunction("startListening") { options: Map<String, Any>?, promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject("CONTEXT_NULL", "ReactContext is null", null)
        return@AsyncFunction
      }

      val keyword = (options?.get("keyword") as? String) ?: "Hey Bot"
      val threshold = ((options?.get("threshold") as? Number)?.toFloat()) ?: 0.5f
      val classifierAsset = (options?.get("classifierAsset") as? String) ?: "wakeword/hey_bot.onnx"

      currentKeyword = keyword
      currentThreshold = threshold
      consecutiveHits = 0

      try {
        if (engine == null || !engine!!.isLoaded) {
          engine = OpenWakeWordEngine(context).apply {
            load(classifierAsset = classifierAsset)
          }
        }
        engine?.reset()

        if (isRunning) {
          stopInternal()
        }

        startAudioCapture()
        promise.resolve(true)
      } catch (e: Exception) {
        Log.e(TAG, "Failed to start wake word listener: ${e.message}", e)
        promise.reject("START_FAILED", e.message ?: "Failed to start AudioRecord", e)
      }
    }

    AsyncFunction("stopListening") { promise: Promise ->
      stopInternal()
      promise.resolve(true)
    }

    Function("isListening") {
      return@Function isRunning
    }

    OnDestroy {
      stopInternal()
      engine?.close()
      engine = null
    }
  }

  private fun startAudioCapture() {
    val minBuf = AudioRecord.getMinBufferSize(
      SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT
    )
    val recordBufSize = maxOf(CHUNK_SAMPLES * 2 * 2, minBuf)

    val rec = AudioRecord(
      MediaRecorder.AudioSource.MIC,
      SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
      recordBufSize
    )

    if (rec.state != AudioRecord.STATE_INITIALIZED) {
      rec.release()
      throw IllegalStateException("AudioRecord initialization failed")
    }

    if (AutomaticGainControl.isAvailable()) {
      try {
        val agc = AutomaticGainControl.create(rec.audioSessionId)
        agc?.enabled = true
      } catch (_: Exception) {}
    }

    recorder = rec
    isRunning = true

    workerThread = Thread {
      try {
        rec.startRecording()
        Log.i(TAG, "AudioRecord started listening at 16kHz for wake word: $currentKeyword")
        sendEvent("onListeningStateChange", mapOf("isListening" to true))

        val shortBuf = ShortArray(CHUNK_SAMPLES)
        val floatBuf = FloatArray(CHUNK_SAMPLES)

        while (isRunning) {
          var samplesRead = 0
          while (samplesRead < CHUNK_SAMPLES && isRunning) {
            val read = rec.read(shortBuf, samplesRead, CHUNK_SAMPLES - samplesRead)
            if (read < 0) {
              Log.e(TAG, "AudioRecord read error: $read")
              break
            }
            samplesRead += read
          }

          if (!isRunning) break

          if (samplesRead == CHUNK_SAMPLES) {
            for (i in 0 until CHUNK_SAMPLES) {
              floatBuf[i] = shortBuf[i].toFloat()
            }

            val score = engine?.process1280Samples(floatBuf)
            if (score != null) {
              if (score >= currentThreshold) {
                consecutiveHits++
                Log.d(TAG, "Wake word score=$score (hit $consecutiveHits / 2)")
                if (consecutiveHits >= 2) {
                  consecutiveHits = 0
                  val hitScore = score
                  Log.i(TAG, "Wake word DETECTED! keyword=$currentKeyword, score=$hitScore")
                  mainHandler.post {
                    sendEvent("onWakeWord", mapOf(
                      "keyword" to currentKeyword,
                      "score" to hitScore.toDouble()
                    ))
                  }
                }
              } else {
                consecutiveHits = 0
              }
            }
          }
        }
      } catch (e: Exception) {
        Log.e(TAG, "Error in wake word worker loop: ${e.message}", e)
        mainHandler.post {
          sendEvent("onError", mapOf("message" to (e.message ?: "Wake word audio error")))
        }
      } finally {
        try {
          rec.stop()
          rec.release()
        } catch (_: Exception) {}
        recorder = null
        mainHandler.post {
          sendEvent("onListeningStateChange", mapOf("isListening" to false))
        }
      }
    }.apply {
      name = "WakeWordAudioThread"
      start()
    }
  }

  private fun stopInternal() {
    isRunning = false
    try {
      workerThread?.join(500)
    } catch (_: Exception) {}
    workerThread = null
    try {
      recorder?.release()
    } catch (_: Exception) {}
    recorder = null
    engine?.reset()
    consecutiveHits = 0
    Log.i(TAG, "WakeWord audio capture stopped")
  }
}
