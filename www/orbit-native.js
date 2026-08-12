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
      return h.indexOf("onrender.com") >= 0 || h === "orbitbillsphone.onrender.com";
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
  window.__orbitNativeShare = async function(opts){
    opts = opts || {};
    var title = opts.title || "Invoice · TechSerenia";
    var text = opts.text || "Invoice from TechSerenia";
    var filename = String(opts.filename || ("invoice-" + Date.now() + ".png")).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0,120);
    var blob = opts.blob;
    var Share = plugin("Share");
    var Filesystem = plugin("Filesystem");
    function blobToBase64(blob){
      return new Promise(function(resolve, reject){
        var r = new FileReader();
        r.onload = function(){ var s = String(r.result || ""); var i = s.indexOf(","); resolve(i >= 0 ? s.slice(i + 1) : s); };
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    }
    if(hasCap() && Share && Share.share && Filesystem && Filesystem.writeFile && blob){
      try{
        var b64 = await blobToBase64(blob);
        var attempts = [{ path: filename, directory: "CACHE" }, { path: "TechSerenia/" + filename, directory: "CACHE" }];
        var fileUri = null;
        for(var i = 0; i < attempts.length && !fileUri; i++){
          try{
            var writeRes = await Filesystem.writeFile({ path: attempts[i].path, data: b64, directory: attempts[i].directory, recursive: true });
            fileUri = writeRes && writeRes.uri;
            if(!fileUri){
              var uriRes = await Filesystem.getUri({ path: attempts[i].path, directory: attempts[i].directory });
              fileUri = uriRes && (uriRes.uri || uriRes);
            }
          }catch(eW){}
        }
        if(fileUri){
          try{ await Share.share({ title: title, text: text, dialogTitle: "Share invoice", files: [fileUri] }); return true; }catch(e1){}
          try{ await Share.share({ title: title, text: text, dialogTitle: "Share invoice", url: fileUri }); return true; }catch(e2){}
        }
      }catch(e){}
    }
    if(navigator.share && blob){
      try{
        var file = new File([blob], filename, { type: blob.type || "image/png" });
        await navigator.share({ title: title, text: text, files: [file] });
        return true;
      }catch(e){ if(e && e.name === "AbortError") return true; }
    }
    return false;
  };
  async function ready(){
    try{ var redirected = await tryHybridLiveRedirect(); if(redirected) return; }catch(e){}
    try{
      var Splash = plugin("SplashScreen");
      if(Splash && Splash.hide) await Splash.hide({ fadeOutDuration: 250 });
    }catch(e){}
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
  window.addEventListener("load", ready);
})();
