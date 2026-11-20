package com.libot.wakeword

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import android.util.Log
import java.io.File
import java.nio.FloatBuffer
import java.util.ArrayDeque

private const val TAG = "OpenWakeWordEngine"
private const val MELSPEC_INPUT_SIZE = 1760 // 480 context + 1280 new samples
private const val MELSPEC_OUTPUT_FRAMES = 8
private const val MEL_BINS = 32
private const val WINDOW_MEL_FRAMES = 76
private const val EMBEDDING_DIM = 96
private const val CONTEXT_EMBEDDING_FRAMES = 16

class OpenWakeWordEngine(private val context: Context) {
  private val env: OrtEnvironment = OrtEnvironment.getEnvironment()
  private var melspecSession: OrtSession? = null
  private var embeddingSession: OrtSession? = null
  private var classifierSession: OrtSession? = null

  private val prevSamples = FloatArray(480)
  private val melspecBuffer = ArrayDeque<FloatArray>()
  private val embeddingBuffer = ArrayDeque<FloatArray>()

  var isLoaded = false
    private set

  private fun loadBytes(pathOrAsset: String): ByteArray {
    val directFile = File(pathOrAsset)
    if (directFile.exists() && directFile.isFile) {
      return directFile.readBytes()
    }
    val internalFile = File(context.filesDir, pathOrAsset)
    if (internalFile.exists() && internalFile.isFile) {
      return internalFile.readBytes()
    }
    return context.assets.open(pathOrAsset).readBytes()
  }

  fun load(
    melspecAsset: String = "wakeword/melspectrogram.onnx",
    embeddingAsset: String = "wakeword/embedding_model.onnx",
    classifierAsset: String = "wakeword/hey_bot.onnx"
  ) {
    try {
      val sessionOptions = OrtSession.SessionOptions().apply {
        setIntraOpNumThreads(1)
        setOptimizationLevel(OrtSession.SessionOptions.OptLevel.BASIC_OPT)
      }

      val melspecBytes = loadBytes(melspecAsset)
      melspecSession = env.createSession(melspecBytes, sessionOptions)

      val embeddingBytes = loadBytes(embeddingAsset)
      embeddingSession = env.createSession(embeddingBytes, sessionOptions)

      val classifierBytes = loadBytes(classifierAsset)
      classifierSession = env.createSession(classifierBytes, sessionOptions)

      isLoaded = true
      Log.i(TAG, "Successfully loaded openWakeWord ONNX models from assets/storage")
    } catch (e: Exception) {
      Log.e(TAG, "Failed to load openWakeWord models: ${e.message}", e)
      isLoaded = false
      throw e
    }
  }

  fun reset() {
    prevSamples.fill(0f)
    melspecBuffer.clear()
    embeddingBuffer.clear()
  }

  /**
   * Processes a chunk of 1280 audio samples (80ms at 16kHz).
   * Returns prediction score (0.0f..1.0f) or null if buffer is not yet full.
   */
  fun process1280Samples(samples: FloatArray): Float? {
    val melspecSess = melspecSession ?: return null
    val embedSess = embeddingSession ?: return null
    val classSess = classifierSession ?: return null

    if (samples.size != 1280) {
      Log.w(TAG, "process1280Samples expected 1280 samples, got ${samples.size}")
      return null
    }

    try {
      // 1. Prepare 1760 samples (480 previous + 1280 new)
      val input1760 = FloatArray(MELSPEC_INPUT_SIZE)
      System.arraycopy(prevSamples, 0, input1760, 0, 480)
      System.arraycopy(samples, 0, input1760, 480, 1280)
      System.arraycopy(samples, 800, prevSamples, 0, 480)

      // 2. Run Melspectrogram model
      val melspecInputTensor = OnnxTensor.createTensor(
        env,
        FloatBuffer.wrap(input1760),
        longArrayOf(1, MELSPEC_INPUT_SIZE.toLong())
      )
      val melspecResult = melspecSess.run(mapOf("input" to melspecInputTensor))
      val melspecOutputTensor = melspecResult.get(0) as OnnxTensor
      val melspecFloatBuf = melspecOutputTensor.floatBuffer

      // Output shape: [1, 1, 8, 32] -> Transform: value / 10.0f + 2.0f
      for (f in 0 until MELSPEC_OUTPUT_FRAMES) {
        val frame = FloatArray(MEL_BINS)
        for (b in 0 until MEL_BINS) {
          val rawVal = melspecFloatBuf.get()
          frame[b] = (rawVal / 10.0f) + 2.0f
        }
        melspecBuffer.addLast(frame)
      }

      melspecInputTensor.close()
      melspecResult.close()

      while (melspecBuffer.size > 120) {
        melspecBuffer.removeFirst()
      }

      // 3. Run Embedding model when melspecBuffer has at least 76 frames
      if (melspecBuffer.size < WINDOW_MEL_FRAMES) {
        return null
      }

      val window76 = FloatArray(WINDOW_MEL_FRAMES * MEL_BINS)
      val melspecList = melspecBuffer.toList()
      val startIndex = melspecList.size - WINDOW_MEL_FRAMES
      for (i in 0 until WINDOW_MEL_FRAMES) {
        val frame = melspecList[startIndex + i]
        System.arraycopy(frame, 0, window76, i * MEL_BINS, MEL_BINS)
      }

      val embedInputTensor = OnnxTensor.createTensor(
        env,
        FloatBuffer.wrap(window76),
        longArrayOf(1, WINDOW_MEL_FRAMES.toLong(), MEL_BINS.toLong(), 1)
      )
      val embedResult = embedSess.run(mapOf("input_1" to embedInputTensor))
      val embedOutputTensor = embedResult.get(0) as OnnxTensor
      val embedFloatBuf = embedOutputTensor.floatBuffer

      // Output shape: [1, 1, 1, 96]
      val embedding = FloatArray(EMBEDDING_DIM)
      embedFloatBuf.get(embedding)
      embeddingBuffer.addLast(embedding)

      embedInputTensor.close()
      embedResult.close()

      while (embeddingBuffer.size > CONTEXT_EMBEDDING_FRAMES) {
        embeddingBuffer.removeFirst()
      }

      // 4. Run Wake Word Classifier when we have 16 embedding vectors
      if (embeddingBuffer.size < CONTEXT_EMBEDDING_FRAMES) {
        return null
      }

      val features16 = FloatArray(CONTEXT_EMBEDDING_FRAMES * EMBEDDING_DIM)
      val embedList = embeddingBuffer.toList()
      for (i in 0 until CONTEXT_EMBEDDING_FRAMES) {
        System.arraycopy(embedList[i], 0, features16, i * EMBEDDING_DIM, EMBEDDING_DIM)
      }

      val classInputTensor = OnnxTensor.createTensor(
        env,
        FloatBuffer.wrap(features16),
        longArrayOf(1, CONTEXT_EMBEDDING_FRAMES.toLong(), EMBEDDING_DIM.toLong())
      )
      val classResult = classSess.run(mapOf("onnx::Flatten_0" to classInputTensor))
      val classOutputTensor = classResult.get(0) as OnnxTensor
      val classFloatBuf = classOutputTensor.floatBuffer
      val score = classFloatBuf.get(0)

      classInputTensor.close()
      classResult.close()

      return score
    } catch (e: Exception) {
      Log.e(TAG, "Inference error: ${e.message}", e)
      return null
    }
  }

  fun close() {
    isLoaded = false
    try {
      melspecSession?.close()
      embeddingSession?.close()
      classifierSession?.close()
    } catch (_: Exception) {}
    melspecSession = null
    embeddingSession = null
    classifierSession = null
  }
}
