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
    try{
      if(sessionStorage.getItem("orbit_skip_live_redirect") === "1") return false;
    }catch(e){}
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
    try{
      var meta = document.querySelector('meta[name="theme-color"]');
      if(meta) meta.setAttribute("content", brand);
      else {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        meta.content = brand;
        document.head.appendChild(meta);
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
    if(hasCap() && Share && Share.share && Filesystem && Filesystem.writeFile && blob){
      try{
        var b64 = await blobToBase64(blob);
        var attempts = [
          { path: filename, directory: "CACHE" },
          { path: "share_" + filename, directory: "CACHE" },
          { path: "TechSerenia/" + filename, directory: "CACHE" },
          { path: filename, directory: "DATA" }
        ];
        var fileUri = null;
        for(var i = 0; i < attempts.length && !fileUri; i++){
          try{
            var writeRes = await Filesystem.writeFile({ path: attempts[i].path, data: b64, directory: attempts[i].directory, recursive: true });
            var candidate = writeRes && writeRes.uri;
            if(!candidate){
              var uriRes = await Filesystem.getUri({ path: attempts[i].path, directory: attempts[i].directory });
              candidate = uriRes && (uriRes.uri || uriRes);
            }
            candidate = toFileUri(candidate);
            if(candidate && candidate.indexOf("file://") === 0) fileUri = candidate;
            else if(candidate && !fileUri) fileUri = candidate;
          }catch(eW){}
        }
        if(fileUri){
          if(fileUri.indexOf("file://") === 0){
            try{ await Share.share({ title: title, text: text, dialogTitle: "Share invoice", files: [fileUri] }); return true; }catch(e1){}
          }
          try{ await Share.share({ title: title, text: text, dialogTitle: "Share invoice", url: fileUri }); return true; }catch(e2){}
          try{ await Share.share({ title: title, text: text, dialogTitle: "Share invoice", files: [fileUri], url: fileUri }); return true; }catch(e3){}
        }
      }catch(eCap){ try{ console.warn("orbit native share", eCap); }catch(e){} }
    }
    if(navigator.share && blob){
      try{
        var file = new File([blob], filename, { type: blob.type || (/\.pdf$/i.test(filename) ? "application/pdf" : "image/png") });
        var data = { title: title, text: text, files: [file] };
        if(navigator.canShare && !navigator.canShare(data)){ await navigator.share({ title: title, text: text }); return true; }
        await navigator.share(data); return true;
      }catch(e){ if(e && e.name === "AbortError") return true; }
    }
    return false;
  };

  /* After Pay & Print / Pay Later / Create — open share sheet with invoice file */
  function orbitBindPostSaleShareButtons(){
    ["btnPayPrint","plConfirm","createInvoiceBtn"].forEach(function(id){
      var el = document.getElementById(id);
      if(!el || el.dataset.orbitShareBound2 === "1") return;
      el.dataset.orbitShareBound2 = "1";
      el.addEventListener("click", function(){
        var before = window.lastInvoiceId;
        var n = 0;
        var iv = setInterval(function(){
          n++;
          try{
            if(window.lastInvoiceId && window.lastInvoiceId !== before && window.lastInvoicePayload){
              clearInterval(iv);
              setTimeout(function(){
                try{
                  if(typeof window.prepareAndOpenInvoiceShare === "function"){
                    window.prepareAndOpenInvoiceShare("png");
                  }
                }catch(e){}
              }, 280);
            }
          }catch(e){}
          if(n > 50) clearInterval(iv);
        }, 150);
      });
    });
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", orbitBindPostSaleShareButtons);
  else orbitBindPostSaleShareButtons();
  window.addEventListener("load", orbitBindPostSaleShareButtons);
  setTimeout(orbitBindPostSaleShareButtons, 400);
  setTimeout(orbitBindPostSaleShareButtons, 1200);
  setTimeout(orbitBindPostSaleShareButtons, 3000);

  async function ready(){
    try{ if(await tryHybridLiveRedirect()) return true; }catch(e){}
    if(!hasCap()){ return false; }
    try{ await setChromeColors(); }catch(e){}
    try{ var Splash = plugin("SplashScreen"); if(Splash && Splash.hide) await Splash.hide({ fadeOutDuration: 250 }); }catch(e){}
    return true;
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
  window.addEventListener("load", ready);
})();
