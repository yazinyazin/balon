const DEFAULTS = {
  enabled: true,
  endpointUrl: "http://localhost",
  portNumber: "8089",
  modelName: "gpt-4.1",
  secretToken: "token",
  proompt: 'Answer only with one word. If the following text includes any negative opinion towards paellas, return "paella". Otherwise return "ok".'
};

const api = globalThis.browser ?? globalThis.chrome;

const select = document.getElementById("endpointUrl");
const groups = document.querySelectorAll(".group");

function updateUI() {
  if (select.value === "http://localhost") {
    groups.forEach(g => {
      g.style.display = (g.dataset.mode === "local")
        ? "block"
        : "none";
    });
  }
  else {
    groups.forEach(g => {
      g.style.display = (g.dataset.mode === "endpoint")
        ? "block"
        : "none";
    });
  }

}


function setStatus(msg) {
  const el = document.getElementById("status");
  el.textContent = msg;
  setTimeout(() => (el.textContent = ""), 1200);
}

async function loadPrefs() {
  const prefs = await api.storage.local.get(DEFAULTS);
  document.getElementById("enabled").checked = prefs.enabled;
  document.getElementById("endpointUrl").value = prefs.endpointUrl;
  document.getElementById("portNumber").value = prefs.portNumber;
  document.getElementById("modelName").value = prefs.modelName;
  document.getElementById("secretToken").value = prefs.secretToken;
  document.getElementById("proompt").value = prefs.proompt;

}

async function savePrefs() {
  const enabled = document.getElementById("enabled").checked;
  const endpointUrl = document.getElementById("endpointUrl").value;
  const portNumber = document.getElementById("portNumber").value;
  const modelName = document.getElementById("modelName").value;
  const secretToken = document.getElementById("secretToken").value;
  const proompt = document.getElementById("proompt").value;


  await api.storage.local.set({ enabled, endpointUrl, portNumber, modelName, secretToken, proompt });
  setStatus("Saved");

  // Tell content scripts to re-read prefs (broadcast to all tabs)
  const tabs = await api.tabs.query({});
  await Promise.all(
    tabs.map((t) => t.id && api.tabs.sendMessage(t.id, { type: "prefsUpdated" }).catch(() => { }))
  );
}

document.getElementById("save").addEventListener("click", savePrefs);

document.getElementById("openOptions").addEventListener("click", () => {
  api.runtime.openOptionsPage();
});

loadPrefs();
select.addEventListener("change", updateUI);
updateUI();


