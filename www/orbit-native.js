(function(){
  if(window.__orbitNativeLoaded) return;
  window.__orbitNativeLoaded = true;

  function hasCap(){
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }
  function plugin(n){
    try{ return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[n]; }catch(e){ return null; }
  }

  var LIVE_URL = "https://orbitbillsphone.onrender.com";
  var PREFER_LIVE = true;

  function isOnLiveHost(){
    try{
      var h = (location.hostname||"").toLowerCase();
      if(!h) return false;
      return h.indexOf("onrender.com") >= 0 || h === "orbitbillsphone.onrender.com" || h === "orbitbillsdemo2.onrender.com";
    }catch(e){ return false; }
  }
  function isLocalCapOrigin(){
    try{
      var h = (location.hostname||"").toLowerCase();
      var proto = (location.protocol||"").toLowerCase();
      if(proto === "capacitor:" || proto === "ionic:") return true;
      if(h === "localhost" || h === "127.0.0.1") return true;
      return false;
    }catch(e){ return false; }
  }

  async function tryHybridLiveRedirect(){
    if(!hasCap() || !PREFER_LIVE) return false;
    if(isOnLiveHost()) return false;
    if(!isLocalCapOrigin() && location.protocol !== "file:") return false;
    try{ if(sessionStorage.getItem("orbit_skip_live_redirect") === "1") return false; }catch(e){}
    var online = navigator.onLine;
    try{
      var Network = plugin("Network");
      if(Network && Network.getStatus){
        var st = await Network.getStatus();
        online = !!(st && st.connected);
      }
    }catch(e){}
    if(!online) return false;
    try{ sessionStorage.setItem("orbit_live_redirected","1"); }catch(e){}
    try{
      window.location.replace(LIVE_URL.replace(/\/$/,"") + (location.pathname && location.pathname !== "/" ? location.pathname : "/index.html") + (location.search||"") + (location.hash||""));
    }catch(e){
      try{ window.location.href = LIVE_URL; }catch(e2){}
    }
    return true;
  }

  async function setChromeColors(){
    var brand = "#ffffff";
    try{
      var StatusBar=plugin("StatusBar");
      if(StatusBar){
        if(StatusBar.setBackgroundColor) await StatusBar.setBackgroundColor({color:brand});
        if(StatusBar.setStyle) await StatusBar.setStyle({style:"DARK"});
        if(StatusBar.setOverlaysWebView) await StatusBar.setOverlaysWebView({overlay:false});
      }
    }catch(e){}
  }

  function blobToBase64(blob){
    return new Promise(function(resolve, reject){
      var r = new FileReader();
      r.onload = function(){
        var s = String(r.result || "");
        var i = s.indexOf(",");
        resolve(i >= 0 ? s.slice(i + 1) : s);
      };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  function sanitizeFilename(name){
    name = String(name || ("invoice-" + Date.now() + ".png"));
    name = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    if(!/\.(png|pdf|jpg|jpeg|webp)$/i.test(name)) name += ".png";
    return name.slice(0, 120);
  }

  function toFileUri(u){
    if(!u) return null;
    u = String(u);
    if(u.indexOf("file://") === 0 || u.indexOf("content://") === 0) return u;
    if(u.charAt(0) === "/") return "file://" + u;
    return u;
  }

  window.__orbitNativeShare = async function(opts){
    opts = opts || {};
    var title = opts.title || "Invoice · TechSerenia";
    var text = opts.text || "Invoice from TechSerenia";
    var filename = sanitizeFilename(opts.filename);
    var blob = opts.blob;
    var Share = plugin("Share");
    var Filesystem = plugin("Filesystem");
    var isPdf = /\.pdf$/i.test(filename) || (blob && blob.type && blob.type.indexOf("pdf") >= 0);

    if(hasCap() && Share && Share.share && Filesystem && Filesystem.writeFile && blob){
      try{
        var b64 = await blobToBase64(blob);
        var attempts = [
          { path: "share/" + filename, directory: "CACHE" },
          { path: filename, directory: "CACHE" },
          { path: "TechSerenia/" + filename, directory: "CACHE" },
          { path: "share/" + filename, directory: "DATA" },
          { path: filename, directory: "DATA" }
        ];
        var uris = [];
        for(var i = 0; i < attempts.length; i++){
          try{
            var writeRes = await Filesystem.writeFile({
              path: attempts[i].path,
              data: b64,
              directory: attempts[i].directory,
              recursive: true
            });
            var candidate = writeRes && (writeRes.uri || null);
            if(!candidate && Filesystem.getUri){
              var uriRes = await Filesystem.getUri({
                path: attempts[i].path,
                directory: attempts[i].directory
              });
              candidate = uriRes && (uriRes.uri || uriRes);
            }
            candidate = toFileUri(candidate);
            if(candidate && uris.indexOf(candidate) < 0) uris.push(candidate);
          }catch(eWrite){}
        }
        uris.sort(function(a, b){
          return (a.indexOf("content://") === 0 ? 0 : 1) - (b.indexOf("content://") === 0 ? 0 : 1);
        });
        for(var u = 0; u < uris.length; u++){
          var fileUri = uris[u];
          try{
            await Share.share({ title: title, dialogTitle: "Share invoice", files: [fileUri] });
            return true;
          }catch(e1){}
          try{
            await Share.share({ title: title, text: text, dialogTitle: "Share invoice", files: [fileUri] });
            return true;
          }catch(e2){}
          try{
            await Share.share({ title: title, text: text, dialogTitle: "Share invoice", files: [fileUri], url: fileUri });
            return true;
          }catch(e3){}
        }
      }catch(eCap){
        try{ console.warn("orbit native share", eCap); }catch(e2){}
      }
    }

    if(navigator.share && blob && filename){
      try{
        var mime = (blob.type) || (isPdf ? "application/pdf" : "image/png");
        var file = new File([blob], filename, { type: mime });
        if(navigator.canShare && !navigator.canShare({ files: [file] })) return false;
        await navigator.share({ files: [file], title: title, text: text });
        return true;
      }catch(e){
        if(e && e.name === "AbortError") return true;
      }
    }
    return false;
  };

  window.__orbitHaptic = async function(style){
    try{
      if(!hasCap()){
        if(navigator.vibrate) navigator.vibrate(style === "error" ? 30 : 12);
        return;
      }
      var H = plugin("Haptics");
      if(!H) return;
      if(style === "success" && H.notification) await H.notification({ type: "SUCCESS" });
      else if(style === "error" && H.notification) await H.notification({ type: "ERROR" });
      else if(H.impact) await H.impact({ style: "LIGHT" });
    }catch(e){}
  };

  async function ready(){
    try{
      var redirected = await tryHybridLiveRedirect();
      if(redirected) return true;
    }catch(e){}
    if(hasCap()) await setChromeColors();
    try{
      var Splash = plugin("SplashScreen");
      if(Splash && Splash.hide) await Splash.hide({ fadeOutDuration: 250 });
    }catch(e){}
    return true;
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
  window.addEventListener("load", ready);
})();
