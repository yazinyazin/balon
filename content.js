// -------- constants --------

const api = globalThis.browser ?? globalThis.chrome;
const host = location.hostname;

// -------- user preferences --------

const DEFAULTS = {
  enabled: true,
  endpointUrl: "http://localhost",
  portNumber:"8089",
  modelName:"gpt-4.1",
  secretToken:"token",
  proompt: 'Answer only with one word. If the following text includes any negative opinion towards paellas, return "paella". Otherwise return "ok".'
};

let PREFS = { ...DEFAULTS };

async function loadPrefs() {
  PREFS = await api.storage.local.get(DEFAULTS);
}



api.runtime.onMessage?.addListener((msg) => {
  if (msg && msg.type === "prefsUpdated") {
    init();
  }
});


// -------- site selector rules --------

let RULES = null;

async function loadRules() {
  if (RULES) return RULES;

  const url = api.runtime.getURL("rules.json");
  const res = await fetch(url);
  RULES = await res.json();
  return RULES;
}

async function getSelectorsForSite() {

  const rules = await loadRules();
  const host = location.hostname;
  
  const supportedDomains = Object.keys(rules.sites || {});

  const { enabledDomains = supportedDomains } =
    await api.storage.local.get({ enabledDomains: supportedDomains });

  if(!enabledDomains.includes(location.hostname)){
    return [];
  }  


  return (rules.sites && rules.sites[host]) ? rules.sites[host] : (rules.default || []);
}

// -------- call to endpoint --------

const allowCache = new WeakMap();

async function isAllowedByEndpoint(target) {
  // Cache per element so we don't call the endpoint repeatedly
  const cached = allowCache.get(target);
  if (cached !== undefined) {
    return typeof cached === "boolean" ? cached : await cached;
  }

  const p = (async () => {
    const text = (target.textContent || "").trim();

    // If empty, treat as allowed. 
    if (!text) return "ok";

    const res = await api.runtime.sendMessage({
          type: "checkText",
          text
    });


    return res.body;
  })().catch(() => "Connection error"); // on error: cover

  allowCache.set(target, p);

  const allowed = await p;
  allowCache.set(target, allowed);
  return allowed;
}

// -------- overlay --------

// overlay state
const overlayByTarget = new WeakMap();
const labelByTarget = new WeakMap();
const dismissedTargets = new WeakSet();

function setOverlayLabel(target, labelText) {
  const label = labelByTarget.get(target);
  if (label) {
    label.textContent = labelText;
  }
}

function ensureOverlay(target,labelText) {
  let overlay = overlayByTarget.get(target);

  if (!overlay || !overlay.isConnected) {
    overlay = document.createElement("div");

    overlay.style.position = "absolute";
    overlay.style.background = "gray";
    overlay.style.zIndex = "2147483647";
    overlay.style.pointerEvents = "auto";
    overlay.style.userSelect = "none";
    overlay.style.cursor = "pointer";


    // Center label
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";


    const label = document.createElement("div");
    label.textContent = labelText;
    label.style.color = "white";
    label.style.fontSize = "16px";
    label.style.fontFamily = "sans-serif";
    label.style.fontWeight = "bold";
    label.style.opacity = "0.85";

    labelByTarget.set(target, label);
    overlay.appendChild(label);

    overlay.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      dismissedTargets.add(target); // keep it uncovered
      overlay.remove();
    });

    document.documentElement.appendChild(overlay);
    overlayByTarget.set(target, overlay);
  }

  return overlay;
}

function positionOverlay(target, overlay) {
  const r = target.getBoundingClientRect();
  const x = r.left + window.scrollX;
  const y = r.top + window.scrollY;

  if (r.width <= 0 || r.height <= 0) {
    overlay.style.display = "none";
    return;
  }

  overlay.style.display = "flex";
  overlay.style.left = `${x}px`;
  overlay.style.top = `${y}px`;
  overlay.style.width = `${r.width}px`;
  overlay.style.height = `${r.height}px`;
}

function removeOverlay(target) {
  const overlay = overlayByTarget.get(target);
  if (overlay && overlay.isConnected) overlay.remove();
}

// -------- observers --------
let selectors = [];
const observedTargets = new WeakSet();

// Track “visible” elements and keep overlays positioned without polling:
let visibleTargets = new Set();
let rafScheduled = false;

function scheduleReposition() {
  if (rafScheduled) return;
  rafScheduled = true;
  requestAnimationFrame(() => {
    rafScheduled = false;
    for (const target of visibleTargets) {
      const overlay = overlayByTarget.get(target);
      if (overlay && overlay.isConnected) positionOverlay(target, overlay);
    }
  });
}

window.addEventListener("scroll", scheduleReposition, { passive: true });
window.addEventListener("resize", scheduleReposition);

const io = new IntersectionObserver(async (entries) => {
  
  if(PREFS.enabled){

    for (const entry of entries) {
      const target = entry.target;

      if (dismissedTargets.has(target)) {
        removeOverlay(target);
        continue;
      }

      if (!entry.isIntersecting) {
        visibleTargets.delete(target);
        removeOverlay(target);
        continue;
      }

      visibleTargets.add(target);
      const overlay = ensureOverlay(target,"Checking...");
      positionOverlay(target, overlay);
      
    }
     for (const entry of entries) {
      const target = entry.target;

      if (dismissedTargets.has(target)) {
        continue;
      }

      if (!entry.isIntersecting) {
        continue;
      }

     const resp = await isAllowedByEndpoint(target);
      if (resp === "ok") {
        removeOverlay(target);
        continue;
      }
      else{
        setOverlayLabel(target,resp);
      }
      
    }    

    return;
  }


  for (const entry of entries) {
    const target = entry.target;

    if (dismissedTargets.has(target)) {
      removeOverlay(target);
      continue;
    }

    if (!entry.isIntersecting) {
      // Not visible => optional: remove overlay to reduce DOM clutter
      visibleTargets.delete(target);
      removeOverlay(target);
      continue;
    }

    // Ask endpoint only when it becomes visible (and cached thereafter)
    const resp = await isAllowedByEndpoint(target);
    if (resp === "ok") {
      continue;
    }

    visibleTargets.add(target);
    const overlay = ensureOverlay(target,resp);
    positionOverlay(target, overlay);
  }
}, {
  // Start covering slightly before it enters viewport (smoother)
  root: null,
  rootMargin: "200px 0px 200px 0px",
  threshold: 0.01
});

function maybeObserve(el) {
  if (observedTargets.has(el)) return;
  observedTargets.add(el);
  io.observe(el);
}

function scanSubtreeForMatches(root) {

  // root might itself match
  for (const sel of selectors) {
    try {
      if (root.nodeType === 1 && root.matches(sel)) maybeObserve(root);
      root.querySelectorAll(sel).forEach(maybeObserve);
    } catch {
      // ignore invalid selector
    }
  }
}

const mo = new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType !== 1) continue; // elements only
      scanSubtreeForMatches(node);
    }
  }
});

function recheckVisible() {
  // Force re-evaluation for currently visible targets after endpoint changes
  for (const t of visibleTargets) {
    // Re-trigger by unobserve/observe
    io.unobserve(t);
    io.observe(t);
  }
}

// -------- init --------
(async () => {
  init();
})();

async function init(){

  selectors = await getSelectorsForSite();

  if (!selectors.length) return; //the user did not enable this site.
  
  await loadPrefs();
  
  // Initial scan
  scanSubtreeForMatches(document.documentElement);

  // Watch future changes
  mo.observe(document.documentElement, { childList: true, subtree: true });
}