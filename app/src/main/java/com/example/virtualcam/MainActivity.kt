package com.example.virtualcam

import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.floatingactionbutton.FloatingActionButton
import java.io.InputStream
import android.util.Base64

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var btnPick: FloatingActionButton
    private var lastSelectedImageDataUrl: String? = null

    private val pickImage = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let { dataUri ->
            val dataUrl = toDataUrl(dataUri)
            lastSelectedImageDataUrl = dataUrl
            val js = "window.__virtualcam_setImage('${escapeForJs(dataUrl)}');"
            webView.post { webView.evaluateJavascript(js, null) }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        btnPick = findViewById(R.id.btnPick)

        configureWebView()

        btnPick.setOnClickListener {
            pickImage.launch("image/*")
        }

        webView.loadUrl("file:///android_asset/webapp/index.html")
    }

    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.domStorageEnabled = true
        settings.userAgentString = createSamsungUserAgent(settings.userAgentString)

        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()
        webView.addJavascriptInterface(JSBridge(), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                val shim = assets.readText("webapp/virtualcam-shim.js")
                view?.evaluateJavascript(shim, null)
                lastSelectedImageDataUrl?.let { dataUrl ->
                    view?.evaluateJavascript("window.__virtualcam_setImage('${escapeForJs(dataUrl)}');", null)
                }
            }
        }
    }

    private fun toDataUrl(uri: Uri): String {
        val stream: InputStream? = contentResolver.openInputStream(uri)
        val bytes = stream?.readBytes() ?: ByteArray(0)
        val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
        val type = contentResolver.getType(uri) ?: "image/png"
        return "data:$type;base64,$base64"
    }

    private fun createSamsungUserAgent(original: String?): String {
        val deviceId = "Samsung SM-G991B"
        return (original ?: "Mozilla/5.0") + " ($deviceId)"
    }

    private fun escapeForJs(s: String): String {
        return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")
    }

    inner class JSBridge {
        @JavascriptInterface
        fun requestPickImage() {
            runOnUiThread { pickImage.launch("image/*") }
        }
    }
}

private val android.content.res.AssetManager
    get() = this

private fun android.content.res.AssetManager.readText(path: String): String {
    open(path).use { stream ->
        return stream.reader(Charsets.UTF_8).readText()
    }
}
