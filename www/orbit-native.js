(function(){
  if(window.__orbitNativeLoaded) return;
  window.__orbitNativeLoaded = true;
  function hasCap(){ return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  function plugin(n){ try{ return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[n]; }catch(e){ return null; } }

  var LIVE_URL = "https://orbitbillsphone.onrender.com";
  var PREFER_LIVE = true;

  function isOnLiveHost(){
    try{ return (location.hostname||"").toLowerCase().indexOf("onrender.com") >= 0; }catch(e){ return false; }
  }
  function isLocalCapOrigin(){
    try{
      var h=(location.hostname||"").toLowerCase(), p=(location.protocol||"").toLowerCase();
      return p==="capacitor:"||p==="ionic:"||h==="localhost"||h==="127.0.0.1";
    }catch(e){ return false; }
  }
  async function tryHybridLiveRedirect(){
    if(!hasCap()||!PREFER_LIVE||isOnLiveHost()) return false;
    if(!isLocalCapOrigin() && location.protocol!=="file:") return false;
    try{ if(sessionStorage.getItem("orbit_skip_live_redirect")==="1") return false; }catch(e){}
    var online=navigator.onLine;
    try{ var N=plugin("Network"); if(N&&N.getStatus){ var st=await N.getStatus(); online=!!(st&&st.connected);} }catch(e){}
    if(!online) return false;
    try{ sessionStorage.setItem("orbit_live_redirected","1"); }catch(e){}
    try{
      var path=(location.pathname&&location.pathname!=="/")?location.pathname:"/index.html";
      window.location.replace(LIVE_URL.replace(/\/$/,"")+path+(location.search||"")+(location.hash||""));
    }catch(e){ try{ window.location.href=LIVE_URL; }catch(e2){} }
    return true;
  }

  async function setChromeColors(){
    var brand="#ffffff";
    try{
      var StatusBar=plugin("StatusBar");
      if(StatusBar){
        if(StatusBar.setBackgroundColor) await StatusBar.setBackgroundColor({color:brand});
        if(StatusBar.setStyle) await StatusBar.setStyle({style:"DARK"});
        if(StatusBar.setOverlaysWebView) await StatusBar.setOverlaysWebView({overlay:false});
      }
    }catch(e){}
    try{
      var meta=document.querySelector('meta[name="theme-color"]');
      if(meta) meta.setAttribute("content",brand);
      else{ meta=document.createElement("meta"); meta.name="theme-color"; meta.content=brand; document.head.appendChild(meta); }
    }catch(e){}
  }

  function ensureOfflineModal(){
    if(document.getElementById("orbitOfflineModal")) return;
    var wrap=document.createElement("div");
    wrap.id="orbitOfflineModal";
    wrap.style.cssText="display:none;position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.45);align-items:center;justify-content:center;padding:20px;box-sizing:border-box;";
    wrap.innerHTML='<div style="width:100%;max-width:340px;background:#fff;border-radius:16px;padding:22px 18px 16px;font-family:system-ui,sans-serif;">'
      +'<h3 style="margin:0 0 8px;font-size:17px;font-weight:700;">You are offline</h3>'
      +'<p style="margin:0 0 14px;font-size:14px;color:#5b6b82;line-height:1.45;">Data stays on this device.</p>'
      +'<div id="orbitOffLearn" style="display:none;margin:0 0 14px;padding:12px;border-radius:12px;background:#f5f8fe;font-size:13.5px;line-height:1.45;"><strong>Latest features may not work in offline mode</strong><br>Updates appear next time you open online.</div>'
      +'<button type="button" id="orbitOffLearnBtn" style="width:100%;margin-bottom:8px;min-height:44px;border:1px solid #dfe7f5;background:#fff;color:#0b3d91;font-weight:700;border-radius:11px;">Learn more</button>'
      +'<button type="button" id="orbitOffOk" style="width:100%;min-height:44px;border:0;background:#0b3d91;color:#fff;font-weight:700;border-radius:11px;">OK</button></div>';
    (document.body||document.documentElement).appendChild(wrap);
    document.getElementById("orbitOffLearnBtn").onclick=function(){
      var b=document.getElementById("orbitOffLearn"); var open=b.style.display==="block";
      b.style.display=open?"none":"block"; this.textContent=open?"Learn more":"Hide details";
    };
    document.getElementById("orbitOffOk").onclick=function(){ wrap.style.display="none"; try{ sessionStorage.setItem("orbit_offline_modal_dismissed","1"); }catch(e){} };
  }
  function showOfflineModal(){
    try{ if(sessionStorage.getItem("orbit_offline_modal_dismissed")==="1") return; }catch(e){}
    ensureOfflineModal(); document.getElementById("orbitOfflineModal").style.display="flex";
  }

  async function ready(){
    try{ if(await tryHybridLiveRedirect()) return true; }catch(e){}
    if(!hasCap()){ setupNetwork(); setupBackButton(); return false; }
    await setChromeColors();
    try{ var Splash=plugin("SplashScreen"); if(Splash&&Splash.hide) await Splash.hide({fadeOutDuration:150}); }catch(e){}
    try{ var Keyboard=plugin("Keyboard"); if(Keyboard&&Keyboard.setResizeMode) await Keyboard.setResizeMode({mode:"body"}); }catch(e){}
    setupNetwork(); setupBackButton();
    return true;
  }
  function setupNetwork(){
    var Network=plugin("Network");
    function setOnline(ok){
      var bar=document.getElementById("orbitOfflineBanner");
      if(!bar){
        bar=document.createElement("div"); bar.id="orbitOfflineBanner";
        bar.style.cssText="display:none;position:fixed;left:0;right:0;top:0;z-index:99999;background:#b91c1c;color:#fff;font:600 13px/1.3 system-ui,sans-serif;padding:8px 12px;padding-top:max(8px,env(safe-area-inset-top));text-align:center;";
        bar.textContent="You are offline — data stays on this device";
        (document.body||document.documentElement).appendChild(bar);
      }
      if(ok){ bar.style.display="none"; return; }
      bar.style.display="block"; try{ showOfflineModal(); }catch(e){}
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
      var openModal=document.querySelector(".modal-bg.open, .modal-backdrop.open");
      if(openModal){ openModal.classList.remove("open"); return true; }
      if(window.history.length>1){ history.back(); return true; }
      return false;
    };
    if(App&&App.addListener) App.addListener("backButton", function(){ var h=false; try{ h=!!window.__orbitAndroidBack(); }catch(e){} if(!h&&App.exitApp) App.exitApp(); });
  }
  window.__orbitHaptic=async function(style){
    try{
      if(!hasCap()){ if(navigator.vibrate) navigator.vibrate(style==="error"?40:18); return; }
      var H=plugin("Haptics"); if(!H) return;
      if(style==="success"&&H.notification) await H.notification({type:"SUCCESS"});
      else if(H.impact) await H.impact({style:"MEDIUM"});
    }catch(e){}
  };

  function blobToB64(blob){
    return new Promise(function(resolve,reject){
      var r=new FileReader();
      r.onload=function(){ var s=String(r.result||""); var i=s.indexOf(","); resolve(i>=0?s.slice(i+1):s); };
      r.onerror=reject; r.readAsDataURL(blob);
    });
  }

  /** Share or save any file — works on Capacitor APK and mobile browser */
  window.__orbitNativeShare=async function(opts){
    opts=opts||{};
    var blob=opts.blob, filename=opts.filename||"file.bin", title=opts.title||"OrbitBills";
    var text=opts.text||"", mime=opts.mime||(blob&&blob.type)||"application/octet-stream";
    var dialogTitle=opts.dialogTitle||"Share";
    if(!blob) return false;

    // 1) Capacitor Share with file URI
    try{
      if(hasCap()){
        var Share=plugin("Share"), FS=plugin("Filesystem");
        if(Share&&Share.share&&FS&&FS.writeFile){
          var b64=await blobToB64(blob);
          var path="OrbitBills/"+filename;
          var dirs=["CACHE","DATA","DOCUMENTS","EXTERNAL"];
          var uri=null;
          for(var i=0;i<dirs.length&&!uri;i++){
            try{
              await FS.writeFile({path:path,data:b64,directory:dirs[i],recursive:true});
              var res=await FS.getUri({path:path,directory:dirs[i]});
              uri=res&&(res.uri||res);
            }catch(e){}
          }
          if(uri){
            try{ await Share.share({title:title,text:text,url:String(uri),dialogTitle:dialogTitle}); return true; }catch(e1){}
            try{ await Share.share({title:title,text:text,files:[String(uri)],dialogTitle:dialogTitle}); return true; }catch(e2){}
          }
        }
      }
    }catch(e){ console.warn("cap share", e); }

    // 2) Web Share Level 2 (files)
    try{
      var file=null;
      try{ file=new File([blob],filename,{type:mime,lastModified:Date.now()}); }catch(e){}
      if(file&&navigator.share){
        try{
          if(!navigator.canShare||navigator.canShare({files:[file]})){
            await navigator.share({files:[file],title:title,text:text}); return true;
          }
        }catch(eS){ if(eS&&eS.name==="AbortError") return true; }
      }
    }catch(e){}

    // 3) Force download via anchor (works more often with blob URL)
    try{
      var url=URL.createObjectURL(blob);
      var a=document.createElement("a");
      a.href=url; a.download=filename; a.style.display="none";
      document.body.appendChild(a); a.click();
      setTimeout(function(){ try{ document.body.removeChild(a); URL.revokeObjectURL(url); }catch(e){} }, 4000);
      return true;
    }catch(e){}

    return false;
  };

  /** Explicit save/download helper */
  window.__orbitNativeDownload=async function(blob, filename){
    if(!blob) return false;
    filename=filename||"download.bin";
    // Cap write to documents
    try{
      if(hasCap()){
        var FS=plugin("Filesystem");
        if(FS&&FS.writeFile){
          var b64=await blobToB64(blob);
          var path="OrbitBills/"+filename;
          var dirs=["DOCUMENTS","DATA","CACHE","EXTERNAL"];
          for(var i=0;i<dirs.length;i++){
            try{
              await FS.writeFile({path:path,data:b64,directory:dirs[i],recursive:true});
              // then share so user can Save to Files / Gallery
              return await window.__orbitNativeShare({blob:blob,filename:filename,title:filename,text:"Saved from OrbitBills",dialogTitle:"Save file"});
            }catch(e){}
          }
        }
      }
    }catch(e){}
    return await window.__orbitNativeShare({blob:blob,filename:filename,title:filename,dialogTitle:"Save file"});
  };

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", ready); else ready();
  window.addEventListener("load", ready);
})();
