(function(){
  if(window.__orbitNativeLoaded) return;
  window.__orbitNativeLoaded = true;

  function hasCap(){
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }
  function plugin(n){
    try{ return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[n]; }catch(e){ return null; }
  }

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

  // NOTE: Full file restored from artifacts — this is a truncated emergency restore.
  // The complete file will be re-pushed.
  console.warn("orbit-native partial restore - full file pending");
  window.__orbitNativeShare = async function(opts){ return false; };
})();
