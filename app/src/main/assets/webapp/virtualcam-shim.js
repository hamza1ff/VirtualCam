// virtualcam-shim.js
(function(){
  if (window.__virtualcam_installed) return;
  window.__virtualcam_installed = true;

  window.__virtualcam_image = null;

  window.__virtualcam_setImage = function(dataUrl) {
    window.__virtualcam_image = dataUrl;
    if (window.__virtualcam_videoElement) {
      attachImageToStream(window.__virtualcam_image)
    }
  }

  const origEnumerate = navigator.mediaDevices && navigator.mediaDevices.enumerateDevices
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    navigator.mediaDevices.enumerateDevices = async function() {
      try {
        const original = await origEnumerate.call(navigator.mediaDevices)
        const hasVideo = original.some(d => d.kind === 'videoinput')
        if (!hasVideo) {
          original.push({ deviceId: 'virtualcam-0', kind: 'videoinput', label: 'Samsung SM-G991B', groupId: 'virtual-1' })
        }
        return original
      } catch (e) {
        return [{ deviceId: 'virtualcam-0', kind: 'videoinput', label: 'Samsung SM-G991B', groupId: 'virtual-1' }]
      }
    }
  }

  const origGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia = async function(constraints) {
      if (!window.__virtualcam_image) {
        if (window.AndroidBridge && window.AndroidBridge.requestPickImage) {
          window.AndroidBridge.requestPickImage()
        }
        const waited = await new Promise(resolve => {
          let waited = 0
          const iv = setInterval(()=>{
            if (window.__virtualcam_image) { clearInterval(iv); resolve(true); }
            waited += 100
            if (waited > 15000) { clearInterval(iv); resolve(false); }
          }, 100)
        })
        if (!waited) throw new Error('No image selected')
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = function() {
        canvas.width = img.width
        canvas.height = img.height
        drawFrame()
      }
      img.src = window.__virtualcam_image

      function drawFrame() {
        const brightness = 0.98 + Math.random()*0.04
        ctx.filter = `brightness(${brightness})`
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }

      window.__virtualcam_videoElement = canvas
      attachImageToStream(window.__virtualcam_image)

      const stream = canvas.captureStream(15)

      const t = setInterval(()=>{
        if (!img.complete) return
        drawFrame()
      }, 200)

      const tracks = stream.getVideoTracks()
      const origStop = tracks[0].stop.bind(tracks[0])
      tracks[0].stop = function(){ clearInterval(t); origStop(); }

      return stream
    }
  }

  function attachImageToStream(dataUrl) {
    if (!window.__virtualcam_videoElement) return
    const canvas = window.__virtualcam_videoElement
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = ()=>{
      const maxW = 1280
      const scale = Math.min(1, maxW / img.width)
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.src = dataUrl
  }

  try{
    const origGetSettings = MediaStreamTrack && MediaStreamTrack.prototype && MediaStreamTrack.prototype.getSettings
    if (MediaStreamTrack && MediaStreamTrack.prototype) {
      MediaStreamTrack.prototype.getSettings = function() {
        try{
          const s = origGetSettings ? origGetSettings.call(this) : {}
          if (this.kind === 'video') {
            return Object.assign({}, s, {
              deviceId: 'virtualcam-0',
              facingMode: 'environment',
              width: s.width || 1280,
              height: s.height || 720,
              frameRate: s.frameRate || 15,
              label: 'Samsung SM-G991B'
            })
          }
          return s
        }catch(e){ return {} }
      }
    }
  }catch(e){ }
})();
