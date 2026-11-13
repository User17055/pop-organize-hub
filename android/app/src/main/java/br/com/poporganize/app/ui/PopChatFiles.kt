package br.com.poporganize.app.ui

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream

internal data class PopChatFile(val name: String, val dataUrl: String, val size: Int)
internal data class PopChatMessage(val id: String, val role: String, val text: String, val files: List<String> = emptyList())

internal suspend fun readPopChatFile(context: Context, uri: Uri): PopChatFile = withContext(Dispatchers.IO) {
    val name = context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
        if(it.moveToFirst()) it.getString(0) else null
    }?.take(180) ?: "arquivo.txt"
    require(name.substringAfterLast('.').lowercase() in setOf("pdf","txt","md","csv","json","html","xml","docx","xlsx","pptx","jpg","jpeg","png","webp")) {
        "Use PDF, DOCX, XLSX, PPTX, imagem (JPG, PNG, WebP) ou texto."
    }
    val bytes = context.contentResolver.openInputStream(uri)?.use { stream ->
        val output = ByteArrayOutputStream()
        val buffer = ByteArray(8192)
        while(true) {
            val count = stream.read(buffer); if(count < 0) break
            require(output.size()+count <= 5*1024*1024) { "Cada arquivo pode ter até 5 MB." }
            output.write(buffer,0,count)
        }
        output.toByteArray()
    } ?: error("Não foi possível abrir este arquivo.")
    require(bytes.isNotEmpty()) { "O arquivo está vazio." }
    val mime = context.contentResolver.getType(uri) ?: "application/octet-stream"
    PopChatFile(name,"data:$mime;base64,"+Base64.encodeToString(bytes,Base64.NO_WRAP),bytes.size)
}
