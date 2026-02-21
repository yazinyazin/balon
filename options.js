const api = globalThis.browser ?? globalThis.chrome;

let SUPPORTED_DOMAINS = [];

const DEFAULTS = {
  enabledDomains: []
};

async function loadRules() {
  const url = api.runtime.getURL("rules.json");
  const res = await fetch(url);
  const rules = await res.json();

  SUPPORTED_DOMAINS = Object.keys(rules.sites || {});
}

async function load() {
  await loadRules();

  const { enabledDomains = SUPPORTED_DOMAINS } =
    await api.storage.local.get({ enabledDomains: SUPPORTED_DOMAINS });

  const enabled = new Set(enabledDomains);

  const list = document.getElementById("list");
  list.innerHTML = "";

  for (const domain of SUPPORTED_DOMAINS) {
    const row = document.createElement("div");
    row.className = "row";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = enabled.has(domain);

    const label = document.createElement("label");
    label.textContent = domain;

    cb.addEventListener("change", async () => {
      if (cb.checked) enabled.add(domain);
      else enabled.delete(domain);

      await api.storage.local.set({
        enabledDomains: Array.from(enabled)
      });
    });

    row.appendChild(cb);
    row.appendChild(label);
    list.appendChild(row);
  }
}

load();

