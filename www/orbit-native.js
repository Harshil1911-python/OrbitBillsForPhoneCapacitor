(function(){
  if(window.__orbitNativeLoaded) return;
  window.__orbitNativeLoaded = true;
  function hasCap(){ return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  function plugin(n){ try{ return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[n]; }catch(e){ return null; } }

  // Hybrid mode: online → live site; offline → local www/ pages bundled in the APK.
  // Keep LIVE_URL in sync with app-config.json websiteUrl.
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
    // Only redirect from local bundle origins
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
    try{
      // Remember we are going live so back doesn't loop oddly
      sessionStorage.setItem("orbit_live_redirected","1");
    }catch(e){}
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
      var Nav = plugin("NavigationBar") || plugin("EdgeToEdge") || plugin("AndroidNavigationBar");
      if(Nav){
        if(Nav.setColor) await Nav.setColor({ color: brand, darkButtons: true });
        else if(Nav.setBackgroundColor) await Nav.setBackgroundColor({ color: brand });
        else if(Nav.setNavigationBarColor) await Nav.setNavigationBarColor({ color: brand });
      }
    }catch(e){}
    try{
      var E = plugin("EdgeToEdge");
      if(E && E.setBackgroundColor) await E.setBackgroundColor({ color: brand });
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
      ensureNavFill(brand);
    }catch(e){}
  }
  function ensureNavFill(brand){
    if(document.getElementById("orbitNavFill")) return;
    var fill = document.createElement("div");
    fill.id = "orbitNavFill";
    fill.setAttribute("aria-hidden","true");
    fill.style.cssText = "position:fixed;left:0;right:0;bottom:0;height:env(safe-area-inset-bottom,0px);min-height:0;background:"+(brand||"#ffffff")+";z-index:99998;pointer-events:none;";
    (document.body||document.documentElement).appendChild(fill);
  }

  function ensureOfflineModal(){
    if(document.getElementById("orbitOfflineModal")) return;
    var wrap = document.createElement("div");
    wrap.id = "orbitOfflineModal";
    wrap.setAttribute("aria-hidden","true");
    wrap.style.cssText = "display:none;position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.45);align-items:center;justify-content:center;padding:20px;padding-top:max(20px,env(safe-area-inset-top));padding-bottom:max(20px,env(safe-area-inset-bottom));box-sizing:border-box;";
    wrap.innerHTML = ''
      + '<div role="dialog" aria-labelledby="orbitOffTitle" style="width:100%;max-width:340px;background:#fff;border-radius:16px;padding:22px 18px 16px;box-shadow:0 20px 50px rgba(15,23,42,.25);font-family:system-ui,-apple-system,sans-serif;">'
      +   '<div style="width:44px;height:44px;border-radius:12px;background:#fef2f2;display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:22px;">📡</div>'
      +   '<h3 id="orbitOffTitle" style="margin:0 0 8px;font-size:17px;font-weight:700;color:#101a2b;">You are offline</h3>'
      +   '<p style="margin:0 0 14px;font-size:14px;line-height:1.45;color:#5b6b82;">Data stays on this device. You can keep billing and working as usual.</p>'
      +   '<div id="orbitOffLearn" style="display:none;margin:0 0 14px;padding:12px;border-radius:12px;background:#f5f8fe;border:1px solid #dfe7f5;font-size:13.5px;line-height:1.45;color:#101a2b;">'
      +     '<strong style="display:block;margin-bottom:4px;">Latest features may not work in offline mode</strong>'
      +     'When your phone is offline the app uses the pages stored inside it. New updates from the website appear automatically the next time you open the app while online.'
      +   '</div>'
      +   '<button type="button" id="orbitOffLearnBtn" style="width:100%;margin-bottom:8px;min-height:44px;border:1px solid #dfe7f5;background:#fff;color:#0b3d91;font-weight:700;font-size:14px;border-radius:11px;cursor:pointer;font-family:inherit;">Learn more</button>'
      +   '<button type="button" id="orbitOffOk" style="width:100%;min-height:44px;border:0;background:#0b3d91;color:#fff;font-weight:700;font-size:14px;border-radius:11px;cursor:pointer;font-family:inherit;">OK</button>'
      + '</div>';
    (document.body||document.documentElement).appendChild(wrap);
    wrap.addEventListener("click", function(e){ if(e.target === wrap) hideOfflineModal(); });
    var learnBtn = document.getElementById("orbitOffLearnBtn");
    var learnBox = document.getElementById("orbitOffLearn");
    if(learnBtn && learnBox){
      learnBtn.addEventListener("click", function(){
        var open = learnBox.style.display === "block";
        learnBox.style.display = open ? "none" : "block";
        learnBtn.textContent = open ? "Learn more" : "Hide details";
      });
    }
    var ok = document.getElementById("orbitOffOk");
    if(ok) ok.addEventListener("click", hideOfflineModal);
  }
  function showOfflineModal(){
    try{
      if(sessionStorage.getItem("orbit_offline_modal_dismissed") === "1") return;
    }catch(e){}
    ensureOfflineModal();
    var wrap = document.getElementById("orbitOfflineModal");
    if(wrap){
      wrap.style.display = "flex";
      wrap.setAttribute("aria-hidden","false");
    }
  }
  function hideOfflineModal(){
    var wrap = document.getElementById("orbitOfflineModal");
    if(wrap){
      wrap.style.display = "none";
      wrap.setAttribute("aria-hidden","true");
    }
    try{ sessionStorage.setItem("orbit_offline_modal_dismissed","1"); }catch(e){}
  }

  async function ready(){
    // Hybrid: if native + online + still on local bundle → open live link so website updates appear
    try{
      var redirected = await tryHybridLiveRedirect();
      if(redirected) return true;
    }catch(e){}

    if(!hasCap()){ setupNetwork(); setupBackButton(); try{ ensureNavFill("#ffffff"); }catch(e){} return false; }
    await setChromeColors();
    try{ var Splash=plugin("SplashScreen"); if(Splash&&Splash.hide) await Splash.hide({fadeOutDuration:250}); }catch(e){}
    try{ var Keyboard=plugin("Keyboard"); if(Keyboard&&Keyboard.setResizeMode) await Keyboard.setResizeMode({mode:"body"}); }catch(e){}
    setupNetwork(); setupBackButton();
    try{ if(/billing\.html/i.test(location.pathname||"") && navigator.wakeLock && navigator.wakeLock.request){ try{ window.__orbitWake=await navigator.wakeLock.request("screen"); }catch(e){} } }catch(e){}
    return true;
  }
  function setupNetwork(){
    var Network=plugin("Network");
    var bar=document.getElementById("orbitOfflineBanner");
    if(!bar){
      bar=document.createElement("div");
      bar.id="orbitOfflineBanner";
      bar.style.cssText="display:none;position:fixed;left:0;right:0;top:0;z-index:99999;background:#b91c1c;color:#fff;font:600 13px/1.3 system-ui,sans-serif;padding:8px 40px 8px 12px;padding-top:max(8px,env(safe-area-inset-top));text-align:center;box-sizing:border-box;";
      var msg=document.createElement("span");
      msg.id="orbitOfflineBannerText";
      msg.textContent="You are offline — data stays on this device";
      bar.appendChild(msg);
      var x=document.createElement("button");
      x.type="button";
      x.id="orbitOfflineBannerClose";
      x.setAttribute("aria-label","Dismiss offline notice");
      x.textContent="×";
      x.style.cssText="position:absolute;right:8px;top:50%;transform:translateY(-50%);margin-top:max(0px,env(safe-area-inset-top)/2);width:32px;height:32px;border:0;background:transparent;color:#fff;font:700 22px/1 system-ui,sans-serif;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent;";
      x.addEventListener("click",function(e){
        try{ e.preventDefault(); e.stopPropagation(); }catch(err){}
        try{ sessionStorage.setItem("orbit_offline_banner_dismissed","1"); }catch(err){}
        bar.style.display="none";
        bar.setAttribute("data-dismissed","1");
      });
      bar.appendChild(x);
      bar.style.position="fixed";
      (document.body||document.documentElement).appendChild(bar);
    }
    function isDismissed(){
      if(bar.getAttribute("data-dismissed")==="1") return true;
      try{ return sessionStorage.getItem("orbit_offline_banner_dismissed")==="1"; }catch(e){ return false; }
    }
    function setOnline(ok){
      if(ok){
        bar.style.display="none";
        try{ sessionStorage.removeItem("orbit_offline_banner_dismissed"); }catch(e){}
        bar.removeAttribute("data-dismissed");
        // If we came back online while still on local bundle, try live redirect once
        try{
          if(hasCap() && PREFER_LIVE && !isOnLiveHost() && (isLocalCapOrigin() || location.protocol === "file:")){
            if(sessionStorage.getItem("orbit_live_redirected") !== "1"){
              tryHybridLiveRedirect();
            }
          }
        }catch(e){}
        return;
      }
      if(isDismissed()){ bar.style.display="none"; }
      else { bar.style.display="block"; }
      // Popup once per session when offline
      try{ showOfflineModal(); }catch(e){}
    }
    if(Network&&Network.getStatus){
      Network.getStatus().then(function(s){ setOnline(!!s.connected); }).catch(function(){});
      if(Network.addListener) Network.addListener("networkStatusChange", function(s){ setOnline(!!s.connected); });
    } else {
      setOnline(navigator.onLine);
      window.addEventListener("online", function(){ setOnline(true); });
      window.addEventListener("offline", function(){ setOnline(false); });
    }
  }
  function setupBackButton(){
    var App=plugin("App");
    window.__orbitAndroidBack=function(){
      if(document.body&&document.body.classList.contains("m-cart-open")){ if(window.__orbitCloseMobileCart) window.__orbitCloseMobileCart(); else document.body.classList.remove("m-cart-open"); return true; }
      var menu=document.getElementById("mobileMenu");
      if(menu&&menu.classList.contains("open")){ if(window.__orbitCloseMobileMenu) window.__orbitCloseMobileMenu(); else menu.classList.remove("open"); return true; }
      var openModal=document.querySelector(".modal-bg.open");
      if(openModal){ openModal.classList.remove("open"); return true; }
      var offModal=document.getElementById("orbitOfflineModal");
      if(offModal && offModal.style.display === "flex"){ hideOfflineModal(); return true; }
      if(window.history.length>1){ history.back(); return true; }
      return false;
    };
    if(App&&App.addListener){ App.addListener("backButton", function(){ var handled=false; try{ handled=!!window.__orbitAndroidBack(); }catch(e){} if(!handled&&App.exitApp) App.exitApp(); }); }
  }
  window.__orbitHaptic=async function(style){
    try{
      if(!hasCap()){ if(navigator.vibrate) navigator.vibrate(style==="error"?30:12); return; }
      var H=plugin("Haptics"); if(!H) return;
      if(style==="success"&&H.notification) await H.notification({type:"SUCCESS"});
      else if(style==="error"&&H.notification) await H.notification({type:"ERROR"});
      else if(H.impact) await H.impact({style:"LIGHT"});
    }catch(e){}
  };
  window.__orbitNativeShare=async function(opts){
    opts=opts||{};
    var title=opts.title||"Invoice · TechSerenia";
    var text=opts.text||"Invoice from TechSerenia";
    var Share=plugin("Share"); var Filesystem=plugin("Filesystem");
    // Capacitor: write to cache + share file URI so WhatsApp/Drive get the attachment
    if(Share&&Share.share&&Filesystem&&opts.blob&&opts.filename){
      try{
        var b64=await new Promise(function(resolve,reject){
          var r=new FileReader();
          r.onload=function(){ var s=String(r.result||""); var i=s.indexOf(","); resolve(i>=0?s.slice(i+1):s); };
          r.onerror=reject;
          r.readAsDataURL(opts.blob);
        });
        var path="TechSerenia/"+opts.filename;
        await Filesystem.writeFile({path:path,data:b64,directory:"CACHE",recursive:true});
        var uriRes=await Filesystem.getUri({path:path,directory:"CACHE"});
        var uri=uriRes&&(uriRes.uri||uriRes);
        try{
          await Share.share({ title:title, text:text, url:uri, dialogTitle:"Share invoice", files: uri ? [uri] : undefined });
        }catch(e1){
          await Share.share({ title:title, text:text, url:uri, dialogTitle:"Share invoice" });
        }
        return true;
      }catch(e){}
    }
    // Web Share Level 2 — attach File (works in Chrome Android / many WebViews)
    if(navigator.share && opts.blob && opts.filename){
      try{
        var file=new File([opts.blob], opts.filename, {
          type: opts.blob.type || (/\.pdf$/i.test(opts.filename) ? "application/pdf" : "image/png")
        });
        var data={ title:title, text:text, files:[file] };
        if(navigator.canShare && !navigator.canShare(data)){
          await navigator.share({ title:title, text:text });
          return true;
        }
        await navigator.share(data);
        return true;
      }catch(e){
        if(e && e.name==="AbortError") return true;
      }
    }
    if(navigator.share){
      try{
        await navigator.share({ title:title, text:text, url:opts.url });
        return true;
      }catch(e){
        if(e && e.name==="AbortError") return true;
      }
    }
    return false;
  };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", ready); else ready();
  window.addEventListener("load", ready);
})();
