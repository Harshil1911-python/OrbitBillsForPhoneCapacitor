(function(){
  if(window.__orbitPostPayLoaded) return;
  window.__orbitPostPayLoaded = true;

  function ensureModal(){
    if(document.getElementById("postPayActionModal")) return;
    var wrap = document.createElement("div");
    wrap.className = "modal-bg";
    wrap.id = "postPayActionModal";
    wrap.innerHTML = '<div class="modal" style="padding-bottom:calc(14px + env(safe-area-inset-bottom,0px))">'+
      '<h3>Bill ready</h3>'+
      '<p id="postPaySub" style="font-size:13px;color:var(--muted);margin:0 0 14px">Invoice saved</p>'+
      '<div style="display:flex;flex-direction:column;gap:10px">'+
      '<button type="button" class="btn btn-primary" id="postPayShare" style="min-height:50px;font-size:15px;font-weight:700">Share Bill</button>'+
      '<button type="button" class="btn" id="postPayDownload" style="min-height:50px;font-size:15px;font-weight:600;background:#0f766e;color:#fff;border-color:#0f766e">Download</button>'+
      '<button type="button" class="btn btn-ghost" id="postPayPreview" style="min-height:50px;font-size:15px;font-weight:600">Preview</button>'+
      '<button type="button" class="btn btn-ghost" id="postPayCancel" style="min-height:46px;font-size:14px">Cancel</button>'+
      '</div>'+
      '<p id="postPayHint" style="font-size:11px;color:var(--muted);margin:12px 0 0;line-height:1.4"></p>'+
      '</div>';
    (document.body||document.documentElement).appendChild(wrap);
  }

  async function buildLastInvoicePngBlob(){
    if(!window.lastInvoicePayload) return null;
    try{
      if(typeof invoiceHtmlToCanvas !== "function") return null;
      var canvas = await invoiceHtmlToCanvas(window.lastInvoicePayload, 2);
      var blob = await new Promise(function(resolve){
        try{ canvas.toBlob(function(b){ resolve(b); }, "image/png"); }catch(e){ resolve(null); }
      });
      if(!blob){
        var pngUrl = canvas.toDataURL("image/png");
        var res = await fetch(pngUrl);
        blob = await res.blob();
      }
      var invNo = String((window.lastInvoicePayload.invoiceNumber||"invoice")).replace(/[^a-zA-Z0-9_-]/g, "_");
      return { blob: blob, filename: "invoice-"+invNo+".png", invNo: invNo };
    }catch(e){ console.warn(e); return null; }
  }

  function invoiceShareMessageText(){
    try{
      if(typeof window.invoiceShareMessageText === "function") return window.invoiceShareMessageText();
    }catch(e){}
    var inv = window.lastInvoicePayload || {};
    var brand = (window.branding && (window.branding.brand_name||window.branding.brandName)) || "OrbitBills";
    var total = (typeof money === "function") ? money(inv.total) : String(inv.total||"");
    return "Hello"+(inv.clientName?" "+inv.clientName:"")+",\nPlease find your invoice *"+(inv.invoiceNumber||"")+"* from *"+brand+"*.\nTotal: "+total+"\nStatus: "+(inv.status||"");
  }

  async function openPostPayActions(opts){
    opts = opts || {};
    ensureModal();
    if(!window.lastInvoicePayload){
      try{ if(typeof openModal==="function") openModal("exportModal"); }catch(e){}
      return;
    }
    var sub = document.getElementById("postPaySub");
    var hint = document.getElementById("postPayHint");
    var invNo = window.lastInvoicePayload.invoiceNumber || "Invoice";
    var totalTxt = (typeof money === "function") ? money(window.lastInvoicePayload.total) : String(window.lastInvoicePayload.total||"");
    var client = window.lastInvoicePayload.clientName || "Walk-in";
    if(sub) sub.textContent = invNo + " · " + totalTxt + " · " + client;
    var phone = "";
    try{ phone = (typeof clientPhoneForSale === "function") ? clientPhoneForSale() : ""; }catch(e){}
    if(hint){
      hint.textContent = phone
        ? ("Customer phone +"+phone+" — Share opens WhatsApp & other apps with invoice image attached.")
        : "Share opens WhatsApp & other apps. Pick a contact if no customer number is saved.";
    }
    window.__orbitPostPayBlob = null;
    window.__orbitPostPayFile = null;
    try{
      buildLastInvoicePngBlob().then(function(pack){
        if(pack){ window.__orbitPostPayBlob = pack.blob; window.__orbitPostPayFile = pack; }
      }).catch(function(){});
    }catch(e){}
    if(typeof openModal === "function") openModal("postPayActionModal");
    else document.getElementById("postPayActionModal").classList.add("open");
  }
  window.openPostPayActions = openPostPayActions;

  async function ensurePostPayBlob(){
    if(window.__orbitPostPayFile && window.__orbitPostPayBlob) return window.__orbitPostPayFile;
    var pack = await buildLastInvoicePngBlob();
    if(pack){ window.__orbitPostPayBlob = pack.blob; window.__orbitPostPayFile = pack; }
    return pack;
  }

  async function postPayShareBill(){
    var msgEl = document.getElementById("postPayHint");
    try{
      if(msgEl) msgEl.textContent = "Preparing invoice image…";
      var pack = await ensurePostPayBlob();
      if(!pack || !pack.blob){ if(typeof toast==="function") toast("Could not prepare invoice image"); return; }
      var text = invoiceShareMessageText();
      var title = "Invoice " + (pack.invNo || "");
      var phone = "";
      try{ phone = (typeof clientPhoneForSale === "function") ? clientPhoneForSale() : ""; }catch(e){}
      var textExtra = text + (phone ? ("\nPhone: +"+phone) : "");
      var shared = false;
      if(window.__orbitNativeShare){
        try{ shared = !!(await window.__orbitNativeShare({ blob: pack.blob, filename: pack.filename, title: title, text: textExtra })); }catch(e){}
      }
      if(!shared && navigator.share){
        try{
          var file = new File([pack.blob], pack.filename, { type: "image/png" });
          var data = { title: title, text: textExtra, files: [file] };
          if(!navigator.canShare || navigator.canShare(data)){ await navigator.share(data); shared = true; }
        }catch(e){ if(e && e.name === "AbortError") shared = true; }
      }
      if(!shared && phone){
        var waUrl = "https://wa.me/"+phone+"?text="+encodeURIComponent(text);
        try{
          var isCap = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
          if(isCap || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent||"")) window.location.href = waUrl;
          else { var w = window.open(waUrl, "_blank"); if(!w) window.location.href = waUrl; }
          if(typeof toast==="function") toast("WhatsApp opened for +"+phone+" · attach invoice from Gallery if needed");
          shared = true;
        }catch(e){ try{ window.location.href = waUrl; shared = true; }catch(e2){} }
      } else if(shared){
        if(typeof toast==="function") toast(phone ? ("Share opened · customer +"+phone) : "Pick WhatsApp or another app");
      } else {
        if(typeof toast==="function") toast("Share unavailable — try Download then WhatsApp");
      }
      try{ if(window.__orbitHaptic) window.__orbitHaptic("success"); }catch(e){}
      if(msgEl){
        msgEl.textContent = shared
          ? (phone ? ("Share / WhatsApp ready for +"+phone) : "Share sheet opened — choose WhatsApp or any app")
          : "Could not open share";
      }
    }catch(e){ console.error(e); if(typeof toast==="function") toast("Share failed"); }
  }

  async function postPayDownload(){
    try{
      var pack = await ensurePostPayBlob();
      if(!pack || !pack.blob){ if(typeof toast==="function") toast("Could not prepare invoice"); return; }
      var ok = false;
      if(typeof window.__orbitSaveToGallery === "function"){
        try{ ok = !!(await window.__orbitSaveToGallery({ blob: pack.blob, filename: pack.filename })); }catch(e){}
      }
      if(!ok && typeof downloadBlob === "function"){
        try{ await downloadBlob(pack.blob, pack.filename, { kind: "png", mime: "image/png", invoiceNumber: window.lastInvoicePayload && window.lastInvoicePayload.invoiceNumber, total: window.lastInvoicePayload && window.lastInvoicePayload.total }); ok = true; }catch(e){}
      }
      if(!ok){
        try{
          var url = URL.createObjectURL(pack.blob);
          var a = document.createElement("a"); a.href = url; a.download = pack.filename; a.click();
          setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
          ok = true;
        }catch(e){}
      }
      if(typeof toast==="function") toast(ok ? "Invoice saved — check Gallery / Downloads" : "Download failed");
      try{ if(window.__orbitHaptic) window.__orbitHaptic("success"); }catch(e){}
    }catch(e){ console.error(e); if(typeof toast==="function") toast("Download failed"); }
  }

  function postPayPreview(){
    try{ if(typeof closeModal==="function") closeModal("postPayActionModal"); else { var m=document.getElementById("postPayActionModal"); if(m) m.classList.remove("open"); } }catch(e){}
    try{
      if(window.lastInvoicePayload){
        var el = document.getElementById("exportLabel");
        if(el && typeof money==="function") el.textContent = (window.lastInvoicePayload.invoiceNumber||"")+" · "+money(window.lastInvoicePayload.total)+" · "+(window.lastInvoicePayload.status||"");
        if(typeof showLayoutPreview === "function") showLayoutPreview("exportPreview");
        var shell = document.getElementById("exportPreviewShell");
        if(shell) shell.style.display = "block";
      }
    }catch(e){}
    try{ if(typeof openModal==="function") openModal("exportModal"); else if(typeof toast==="function") toast("Preview unavailable"); }catch(e){ if(typeof toast==="function") toast("Preview unavailable"); }
  }

  function bind(){
    ensureModal();
    var a;
    a = document.getElementById("postPayShare");
    if(a && !a.dataset.bound){ a.dataset.bound="1"; a.addEventListener("click", function(){ postPayShareBill(); }); }
    a = document.getElementById("postPayDownload");
    if(a && !a.dataset.bound){ a.dataset.bound="1"; a.addEventListener("click", function(){ postPayDownload(); }); }
    a = document.getElementById("postPayPreview");
    if(a && !a.dataset.bound){ a.dataset.bound="1"; a.addEventListener("click", function(){ postPayPreview(); }); }
    a = document.getElementById("postPayCancel");
    if(a && !a.dataset.bound){
      a.dataset.bound="1";
      a.addEventListener("click", function(){ try{ if(typeof closeModal==="function") closeModal("postPayActionModal"); else document.getElementById("postPayActionModal").classList.remove("open"); }catch(e){} });
    }
  }

  function installHook(){
    if(typeof window.finalizeSale !== "function") return false;
    if(window.finalizeSale.__orbitPostPayHooked) return true;
    var orig = window.finalizeSale;
    window.finalizeSale = async function(payload, doPrint){
      var data = await orig.apply(this, arguments);
      if(data){
        try{ await openPostPayActions({ preferPrint: !!doPrint }); }catch(e){ console.error(e); }
      }
      return data;
    };
    window.finalizeSale.__orbitPostPayHooked = true;
    return true;
  }

  function boot(){
    bind();
    if(!installHook()){
      var n = 0;
      var t = setInterval(function(){
        n++;
        if(installHook() || n > 40) clearInterval(t);
      }, 250);
    }
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("load", boot);
  setTimeout(boot, 500);
})();
