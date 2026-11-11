package br.com.poporganize.app.data

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.util.LruCache
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

/** Small, shared thumbnails: never retain full-size profile photos or data URLs as cache keys. */
internal object ProfileImages {
    private const val MAX_BYTES = 8 * 1024 * 1024
    private val cache = object : LruCache<String, Bitmap>(4 * 1024 * 1024) {
        override fun sizeOf(key: String, value: Bitmap) = value.byteCount
    }
    // Fixed-size lock table avoids both duplicate concurrent downloads and an unbounded lock map.
    private val locks = Array(16) { Mutex() }

    suspend fun load(source: String?): Bitmap? = withContext(Dispatchers.IO) {
        if (source.isNullOrBlank()) return@withContext null
        val key = MessageDigest.getInstance("SHA-256").digest(source.toByteArray())
            .joinToString("") { "%02x".format(it) }
        locks[(key.hashCode() and Int.MAX_VALUE) % locks.size].withLock {
            cache.get(key)?.let { return@withLock it }
            try {
                val bytes = when {
                    source.startsWith("data:image") -> {
                        if (source.length > MAX_BYTES * 4 / 3 + 1024) return@withLock null
                        Base64.decode(source.substringAfter(",", ""), Base64.DEFAULT)
                    }
                    source.startsWith("https://") -> {
                        val connection = URL(source).openConnection() as HttpURLConnection
                        try {
                            connection.connectTimeout = 8_000
                            connection.readTimeout = 8_000
                            connection.inputStream.use { input ->
                                val output = ByteArrayOutputStream()
                                val buffer = ByteArray(8192)
                                while (true) {
                                    val count = input.read(buffer)
                                    if (count < 0) break
                                    if (output.size() + count > MAX_BYTES) return@withLock null
                                    output.write(buffer, 0, count)
                                }
                                output.toByteArray()
                            }
                        } finally { connection.disconnect() }
                    }
                    else -> return@withLock null
                }
                val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
                if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return@withLock null
                var sample = 1
                while (bounds.outWidth / sample > 256 || bounds.outHeight / sample > 256) sample *= 2
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size,
                    BitmapFactory.Options().apply { inSampleSize = sample })?.also { cache.put(key, it) }
            } catch (error: CancellationException) { throw error }
            catch (_: Exception) { null }
        }
    }
}
