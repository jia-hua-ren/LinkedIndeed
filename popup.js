// popup.js — Linked, Indeed! popup logic

const SUPPORTED_SITES = ["indeed", "linkedin"];
const SITE_LABELS = {
  indeed: "Indeed",
  linkedin: "LinkedIn",
};

let jobInfo = null;

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  bindPanelEvents();
  updateSavedCount();
  await loadCurrentJob();
});

async function loadCurrentJob() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);
  const host = url.hostname;

  const isSupported = SUPPORTED_SITES.some((s) => host.includes(s));

  if (!isSupported) {
    renderUnsupported();
    return;
  }

  try {
    jobInfo = await chrome.tabs.sendMessage(tab.id, { action: "getJobInfo" });
    renderSnapTab();
  } catch (e) {
    // Content script may not have loaded yet (e.g. on a search results page)
    renderNotAJobPage();
  }
}

// ── Render States ─────────────────────────────────────────────────────────────

function renderUnsupported() {
  setPanel(`
    <div class="unsupported">
      <div class="unsupported-icon">🔍</div>
      <h3>Not a supported job site</h3>
      <p>Navigate to a job listing on one of these sites to use Linked, Indeed!:</p>
      <div class="supported-sites">
        ${SUPPORTED_SITES.map((s) => `<span class="site-chip">${SITE_LABELS[s]}</span>`).join("")}
      </div>
    </div>
  `);
}

function renderNotAJobPage() {
  setPanel(`
    <div class="unsupported">
      <div class="unsupported-icon">📄</div>
      <h3>No job listing detected</h3>
      <p>Open an individual job listing page and try again.</p>
    </div>
  `);
}

function renderSnapTab() {
  if (!jobInfo) return;

  const { site, title, company, location, salary, cleanUrl } = jobInfo;
  const label = SITE_LABELS[site] || site;

  const locationHTML = location
    ? `
    <div class="meta-item">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
      ${escHTML(location)}
    </div>`
    : "";

  const salaryHTML = salary
    ? `
    <div class="meta-item">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
      ${escHTML(salary)}
    </div>`
    : "";

  const isSaved = isAlreadySaved(cleanUrl);

  setPanel(`
    <div id="snapView">
      <div class="job-card">
        <div class="site-badge">${escHTML(label)}</div>
        <div class="job-title">${escHTML(title || "Job Title Unknown")}</div>
        ${company ? `<div class="job-company">${escHTML(company)}</div>` : ""}
        <div class="job-meta">
          ${locationHTML}
          ${salaryHTML}
        </div>
        <div class="url-row">
          <div class="url-text" title="${escHTML(cleanUrl)}">${escHTML(cleanUrl)}</div>
          <button class="copy-btn" id="copyBtn" data-action="copy-current-url">Copy</button>
        </div>
      </div>

      <button class="save-btn" id="saveBtn" data-action="save-job" ${isSaved ? "disabled" : ""}>
        ${isSaved ? "✓ Already Saved" : "Save Job"}
      </button>
    </div>
  `);
}

// ── Actions ───────────────────────────────────────────────────────────────────

function copyURL() {
  if (!jobInfo) return;
  copyText(jobInfo.cleanUrl);
  const btn = document.getElementById("copyBtn");
  if (btn) {
    btn.textContent = "Copied!";
    btn.classList.add("copied");
  }
}

function copyText(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => showToast("Copied to clipboard!"));
}

function saveJob() {
  if (!jobInfo) return;
  chrome.storage.local.get(["jobs"], ({ jobs }) => {
    const list = jobs || [];
    const entry = {
      title: jobInfo.title,
      company: jobInfo.company,
      location: jobInfo.location,
      salary: jobInfo.salary,
      site: jobInfo.site,
      cleanUrl: jobInfo.cleanUrl,
      savedAt: Date.now(),
    };
    list.push(entry);
    chrome.storage.local.set({ jobs: list }, () => {
      showToast("Job saved! 🎉");
      updateSavedCount();
      const btn = document.getElementById("saveBtn");
      if (btn) {
        btn.textContent = "✓ Already Saved";
        btn.disabled = true;
      }
    });
  });
}

function isAlreadySaved(url) {
  // Sync check not possible; we'll rely on async but default to false for UI speed
  return false;
}

function updateSavedCount() {
  chrome.storage.local.get(["jobs"], ({ jobs }) => {
    const n = (jobs || []).length;
    const el = document.getElementById("savedCount");
    if (el) el.textContent = `${n} saved`;
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setPanel(html) {
  document.getElementById("mainPanel").innerHTML = html;
}

function bindPanelEvents() {
  const panel = document.getElementById("mainPanel");
  if (!panel || panel.dataset.bound === "true") return;

  panel.dataset.bound = "true";
  panel.addEventListener("click", handlePanelClick);
}

function handlePanelClick(event) {
  const actionEl = event.target.closest("[data-action]");
  if (!actionEl || !document.getElementById("mainPanel").contains(actionEl))
    return;

  const { action } = actionEl.dataset;
  if (actionEl.disabled) return;

  switch (action) {
    case "copy-current-url":
      copyURL();
      break;
    case "save-job":
      saveJob();
      break;
    case "copy-text":
      copyText(actionEl.dataset.text || "");
      break;
  }
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
}

function escHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
