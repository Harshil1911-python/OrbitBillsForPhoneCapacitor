(function(){
  if(window.__orbitNativeLoaded) return;
  window.__orbitNativeLoaded = true;
  function hasCap(){ return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  function plugin(n){ try{ return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[n]; }catch(e){ return null; } }
  function blobToBase64(blob){ return new Promise(function(resolve, reject){ var r = new FileReader(); r.onload = function(){ var s = String(r.result || ""); var i = s.indexOf(","); resolve(i >= 0 ? s.slice(i + 1) : s); }; r.onerror = reject; r.readAsDataURL(blob); }); }
  window.__orbitNativeShare = async function(opts){
    opts = opts || {}; var title = opts.title || "Invoice · TechSerenia"; var text = opts.text || "Invoice from TechSerenia"; var filename = opts.filename || ("invoice-" + Date.now() + ".png"); var blob = opts.blob; var Share = plugin("Share"); var Filesystem = plugin("Filesystem");
    if(hasCap() && Share && Share.share && Filesystem && Filesystem.writeFile && blob){
      try{
        var b64 = await blobToBase64(blob);
        var attempts = [{ path: "TechSerenia/" + filename, directory: "CACHE" }, { path: "TechSerenia/" + filename, directory: "DATA" }, { path: filename, directory: "CACHE" }];
        var uri = null;
        for(var i = 0; i < attempts.length && !uri; i++){
          try{ await Filesystem.writeFile({ path: attempts[i].path, data: b64, directory: attempts[i].directory, recursive: true }); var uriRes = await Filesystem.getUri({ path: attempts[i].path, directory: attempts[i].directory }); uri = uriRes && (uriRes.uri || uriRes); }catch(eWrite){}
        }
        if(uri){ try{ await Share.share({ title: title, text: text, dialogTitle: "Share invoice", files: [uri], url: uri }); return true; }catch(eFiles){ try{ await Share.share({ title: title, text: text, dialogTitle: "Share invoice", url: uri }); return true; }catch(eUrl){} } }
      }catch(eCap){}
    }
    if(navigator.share && blob && filename){ try{ var file = new File([blob], filename, { type: blob.type || (/\.pdf$/i.test(filename) ? "application/pdf" : "image/png") }); var data = { title: title, text: text, files: [file] }; if(navigator.canShare && !navigator.canShare(data)){ await navigator.share({ title: title, text: text }); return true; } await navigator.share(data); return true; }catch(e){ if(e && e.name === "AbortError") return true; } }
    if(navigator.share){ try{ await navigator.share({ title: title, text: text, url: opts.url }); return true; }catch(e){ if(e && e.name === "AbortError") return true; } }
    return false;
  };
  window.__orbitSaveToGallery = async function(opts){
    opts = opts || {}; var blob = opts.blob; var filename = opts.filename || ("invoice-" + Date.now() + ".png"); if(!blob) return false;
    var Filesystem = plugin("Filesystem"); var Share = plugin("Share");
    if(hasCap() && Filesystem && Filesystem.writeFile){
      try{
        var b64 = await blobToBase64(blob);
        var paths = [{ path: "Pictures/TechSerenia/" + filename, directory: "EXTERNAL_STORAGE" }, { path: "DCIM/TechSerenia/" + filename, directory: "EXTERNAL_STORAGE" }, { path: "TechSerenia/" + filename, directory: "DOCUMENTS" }, { path: "TechSerenia/" + filename, directory: "DATA" }, { path: "TechSerenia/" + filename, directory: "CACHE" }];
        var uri = null;
        for(var i = 0; i < paths.length && !uri; i++){
          try{ await Filesystem.writeFile({ path: paths[i].path, data: b64, directory: paths[i].directory, recursive: true }); var uriRes = await Filesystem.getUri({ path: paths[i].path, directory: paths[i].directory }); uri = uriRes && (uriRes.uri || uriRes); }catch(eW){}
        }
        if(uri && Share && Share.share){ try{ await Share.share({ title: "Save invoice", text: "Save to Gallery or Files", dialogTitle: "Save invoice", files: [uri], url: uri }); return true; }catch(eS){} }
        if(uri) return true;
      }catch(e){}
    }
    try{ var url = URL.createObjectURL(blob); var a = document.createElement("a"); a.href = url; a.download = filename; (document.body || document.documentElement).appendChild(a); a.click(); setTimeout(function(){ try{ a.remove(); URL.revokeObjectURL(url); }catch(e){} }, 1500); return true; }catch(e2){ return false; }
  };
  window.__orbitHaptic = async function(style){ try{ if(!hasCap()){ if(navigator.vibrate) navigator.vibrate(style === "error" ? 30 : 12); return; } var H = plugin("Haptics"); if(!H) return; if(style === "success" && H.notification) await H.notification({ type: "SUCCESS" }); else if(style === "error" && H.notification) await H.notification({ type: "ERROR" }); else if(H.impact) await H.impact({ style: "LIGHT" }); }catch(e){} };
  function setupBackButton(){
    var App = plugin("App");
    window.__orbitAndroidBack = function(){
      if(document.body && document.body.classList.contains("m-cart-open")){ if(window.__orbitCloseMobileCart) window.__orbitCloseMobileCart(); else document.body.classList.remove("m-cart-open"); return true; }
      var menu = document.getElementById("mobileMenu"); if(menu && menu.classList.contains("open")){ if(window.__orbitCloseMobileMenu) window.__orbitCloseMobileMenu(); else menu.classList.remove("open"); return true; }
      var postPay = document.getElementById("postPayActionModal"); if(postPay && postPay.classList.contains("open")){ postPay.classList.remove("open"); return true; }
      var openModalEl = document.querySelector(".modal-bg.open"); if(openModalEl){ openModalEl.classList.remove("open"); return true; }
      if(window.history.length > 1){ history.back(); return true; }
      return false;
    };
    if(App && App.addListener){ App.addListener("backButton", function(){ var handled = false; try{ handled = !!window.__orbitAndroidBack(); }catch(e){} if(!handled && App.exitApp) App.exitApp(); }); }
  }
  function loadPostPay(){
    try{
      if(window.__orbitPostPayLoaded) return;
      if(document.querySelector('script[src*="orbit-postpay"]')) return;
      var s = document.createElement("script");
      s.src = "orbit-postpay.js";
      s.async = true;
      (document.head || document.body || document.documentElement).appendChild(s);
    }catch(e){}
  }
  function ready(){ setupBackButton(); loadPostPay(); try{ var Splash = plugin("SplashScreen"); if(Splash && Splash.hide) Splash.hide({ fadeOutDuration: 250 }); }catch(e){} }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
  window.addEventListener("load", ready);
  setTimeout(loadPostPay, 300);
  setTimeout(loadPostPay, 1200);
})();
