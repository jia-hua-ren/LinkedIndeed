// popup.js — Linked, Indeed! popup logic

const SUPPORTED_SITES = [
  "indeed",
  "linkedin",
  "greenhouse",
  "ashby",
  "ziprecruiter",
];
const SITE_LABELS = {
  indeed: "Indeed",
  linkedin: "LinkedIn",
  greenhouse: "Greenhouse",
  ashby: "Ashby",
  ziprecruiter: "ZipRecruiter",
};

let jobInfo = null;
let excelColumns = [];
let excelColumnsSet = false;
let pageMode = "unknown";

const DEFAULT_COLUMNS = ["company", "blank", "title", "salary", "cleanUrl"];

const COLUMN_OPTIONS = [
  { val: "company", label: "Company" },
  { val: "title", label: "Role / Title" },
  { val: "location", label: "Location" },
  { val: "salary", label: "Salary" },
  { val: "date", label: "Date" },
  { val: "cleanUrl", label: "Clean URL" },
  { val: "blank", label: "(Blank)" },
];

let dateFormats = {}; // map column index -> format string

const DATE_FORMAT_OPTIONS = [
  { val: "MM/DD/YYYY", label: "mm/dd/yyyy" },
  { val: "DD/MM/YYYY", label: "dd/mm/yyyy" },
  { val: "YYYY-MM-DD", label: "yyyy-mm-dd" },
];

// Initialize UI and load state when the popup DOM is ready.
document.addEventListener("DOMContentLoaded", async () => {
  bindPanelEvents();
  await loadSettings();
  await loadCurrentJob();
});

/**
 * Query the active tab, determine whether it's a supported job URL, and
 * either request job info from the content script or render a helpful panel.
 */
async function loadCurrentJob() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);

  if (!isSupportedJobSite(url)) {
    pageMode = "unsupported-site";
    renderUnsupported();
    return;
  }

  if (!detectJobPageSite(url)) {
    pageMode = "supported-site-non-job";
    renderNotAJobPage();
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        "urlUtils.js",
        "jobsites/indeed.js",
        "jobsites/linkedin.js",
        "jobsites/greenhouse.js",
        "jobsites/ashby.js",
        "jobsites/ziprecruiter.js",
        "content.js",
      ],
    });

    jobInfo = await chrome.tabs.sendMessage(tab.id, {
      action: "getJobInfo",
    });

    pageMode = "job-page";
    renderSnapTab();
  } catch (e) {
    // Content script may not have loaded yet (e.g. on a search results page)
    pageMode = "supported-site-non-job";
    renderNotAJobPage();
  }
}

// ── Render States ─────────────────────────────────────────────────────────────

function renderUnsupported() {
  setPanel(`
    <div class="tabs">
      <div class="tab active" data-action="switch-tab" data-tab="snap">Snap</div>
      <div class="tab" data-action="switch-tab" data-tab="settings">Settings</div>
    </div>
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
    <div class="tabs">
      <div class="tab active" data-action="switch-tab" data-tab="snap">Snap</div>
      <div class="tab" data-action="switch-tab" data-tab="settings">Settings</div>
    </div>
    <div class="unsupported">
      <h3>Please open a job post directly</h3>
      <p>Happy Job Applying! From a listings page, Ctrl/Cmd-click the job or right-click and open it in a new tab.</p>
    </div>
  `);
}

/**
 * Render the main "Snap" tab with job info and actions, based on the `jobInfo` object
 * retrieved from the content script.
 *
 *
 */
function renderSnapTab() {
  const tabs = `
    <div class="tabs">
      <div class="tab active" data-action="switch-tab" data-tab="snap">Snap</div>
      <div class="tab" data-action="switch-tab" data-tab="settings">Settings</div>
    </div>
  `;

  if (!jobInfo) {
    if (pageMode === "unsupported-site") {
      renderUnsupported();
      return;
    }

    if (pageMode === "supported-site-non-job") {
      renderNotAJobPage();
      return;
    }

    /**
     * This is a rare fallback default case where jobInfo isn't set but
     * there is pageMode that indicates otherwise. Left to catch rare errors
     * if any.
     */

    setPanel(
      tabs +
        `
    <div class="errorunknown">
      <h3>Error please reload extension</h3>
      <div class="supported-sites">
        ${SUPPORTED_SITES.map((s) => `<span class="site-chip">${SITE_LABELS[s]}</span>`).join("")}
      </div>
    </div>
  `,
    );
    return;
  }

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

  const snapHtml = `
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
        <div style="margin-top:8px; display:flex; gap:8px;">
          <button class="save-btn" data-action="copy-excel">Copy Excel</button>
        </div>
      </div>
    </div>
  `;

  setPanel(tabs + snapHtml);
}

// ── Actions ───────────────────────────────────────────────────────────────────

function copyURL() {
  if (!jobInfo) return;
  const toCopy =
    jobInfo.cleanUrl && jobInfo.cleanUrl.length ? jobInfo.cleanUrl : "";
  copyText(toCopy);
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function setPanel(html) {
  document.getElementById("mainPanel").innerHTML = html;
}

function bindPanelEvents() {
  const panel = document.getElementById("mainPanel");
  if (!panel || panel.dataset.bound === "true") return;

  panel.dataset.bound = "true";
  panel.addEventListener("click", handlePanelClick);
  panel.addEventListener("change", handlePanelChange);
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
    case "copy-excel":
      copyExcel();
      break;
    case "switch-tab":
      const tab = actionEl.dataset.tab;
      if (tab === "settings") renderSettingsTab();
      else renderSnapTab();
      // update active class on tabs
      document
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
      break;
    case "toggle-date-more":
      const di = parseInt(actionEl.dataset.index, 10);
      if (!isNaN(di)) {
        const optionsEl = document.querySelector(
          `.date-options[data-index="${di}"]`,
        );
        if (optionsEl)
          optionsEl.style.display =
            optionsEl.style.display === "none" ? "block" : "none";
      }
      break;
    case "add-col":
      excelColumns.push("blank");
      renderSettingsTab();
      break;
    case "remove-col":
      const idx = parseInt(actionEl.dataset.index, 10);
      if (!isNaN(idx)) {
        excelColumns.splice(idx, 1);
        renderSettingsTab();
      }
      break;
    case "save-settings":
      saveSettings().then(() => showToast("Settings saved"));
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

// --- Settings / Excel helpers ---
function renderSettingsTab() {
  const cols = excelColumns.length ? excelColumns : DEFAULT_COLUMNS;

  const rowsHtml = cols
    .map((c, idx) => {
      const isDate = c === "date";
      const currentFormat = dateFormats[idx] || "MM/DD/YYYY";
      const inlineMoreBtnHtml = isDate
        ? `<button class="icon-btn more" data-action="toggle-date-more" data-index="${idx}" style="margin-left:6px;">more...</button>`
        : "";
      const dateOptionsHtml = isDate
        ? `
          <div class="date-options" data-index="${idx}" style="display:none; margin-top:6px;">
            <label style="font-size:12px; color:var(--muted); margin-bottom:6px; display:block;">Date format. This is Today's date.</label>
            <select data-action="date-format-change" data-index="${idx}" style="width:100%; padding:6px; border-radius:6px; background:transparent; border:1px solid var(--border); color:var(--text);">
              ${DATE_FORMAT_OPTIONS.map((o) => `<option value="${o.val}" ${o.val === currentFormat ? "selected" : ""}>${o.label}</option>`).join("")}
            </select>
          </div>
        `
        : "";

      return `
      <div class="setting-row" data-index="${idx}" style="display:flex; gap:8px; align-items:center; margin-bottom:8px; flex-direction:column; align-items:stretch;">
        <div style="display:flex; gap:8px; align-items:center;">
          <div style="flex:1; min-width:0;">
            <select data-action="col-change" data-index="${idx}" style="width:100%; padding:6px; border-radius:6px; background:transparent; border:1px solid var(--border); color:var(--text);">
              ${COLUMN_OPTIONS.map((o) => `<option value="${o.val}" ${o.val === c ? "selected" : ""}>${o.label}</option>`).join("")}
            </select>
          </div>
          ${inlineMoreBtnHtml}
          <button class="icon-btn del" data-action="remove-col" data-index="${idx}" style="margin-left:4px;">Remove</button>
        </div>
        ${dateOptionsHtml}
      </div>
    `;
    })
    .join("");

  const settingsHtml = `
    <div id="settingsView">
      <div style="margin-bottom:10px; color:var(--muted); font-size:12px;">Configure the columns for Excel/Sheets export. Use "(Blank)" to insert an empty column.</div>
      <div id="colsList">${rowsHtml}</div>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="icon-btn" data-action="add-col">Add Column</button>
        <button class="save-btn" data-action="save-settings">Save Settings</button>
      </div>
    </div>
  `;

  const tabs = `
    <div class="tabs">
      <div class="tab" data-action="switch-tab" data-tab="snap">Snap</div>
      <div class="tab active" data-action="switch-tab" data-tab="settings">Settings</div>
    </div>
  `;

  setPanel(tabs + settingsHtml);
}

function copyExcel() {
  if (!excelColumnsSet) {
    showToast("Set Excel columns in Settings first.");
    return;
  }
  if (!jobInfo) return;
  const mapField = (key, idx) => {
    if (!key || key === "blank") return "";
    switch (key) {
      case "company":
        return jobInfo.company || "";
      case "title":
        return jobInfo.title || "";
      case "location":
        return jobInfo.location || "";
      case "salary":
        return jobInfo.salary || "";
      case "cleanUrl":
        return jobInfo.cleanUrl || "";
      case "date": {
        const fmt = dateFormats[idx] || "MM/DD/YYYY";
        return formatDate(new Date(), fmt);
      }
      default:
        return "";
    }
  };

  const row = excelColumns.map((k, i) => mapField(k, i)).join("\t");
  copyText(row);
  showToast("Copied Excel row to clipboard!");
}

function formatDate(d, fmt) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  if (fmt === "DD/MM/YYYY") return `${dd}/${mm}/${yyyy}`;
  if (fmt === "YYYY-MM-DD") return `${yyyy}-${mm}-${dd}`;
  // default MM/DD/YYYY
  return `${mm}/${dd}/${yyyy}`;
}

function handlePanelChange(e) {
  const el = e.target;
  if (!el || !el.dataset) return;
  const action = el.dataset.action;
  if (action === "col-change") {
    const idx = parseInt(el.dataset.index, 10);
    if (!isNaN(idx)) {
      excelColumns[idx] = el.value;
      // Re-render settings so that newly-selected "date" columns show their "more..." UI immediately
      renderSettingsTab();
    }
  }
  if (action === "date-format-change") {
    const idx = parseInt(el.dataset.index, 10);
    if (!isNaN(idx)) {
      dateFormats[idx] = el.value;
    }
  }
}

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["excelColumns", "excelColumnsSet", "dateFormats"],
      (res) => {
        let stored = Array.isArray(res.excelColumns) ? res.excelColumns : [];

        excelColumns = stored.length ? stored : DEFAULT_COLUMNS.slice();
        excelColumnsSet = !!res.excelColumnsSet;
        dateFormats = res.dateFormats || {};
        resolve();
      },
    );
  });
}

function saveSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      { excelColumns, excelColumnsSet: true, dateFormats },
      () => {
        excelColumnsSet = true;
        resolve();
      },
    );
  });
}
