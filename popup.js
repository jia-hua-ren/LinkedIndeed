// popup.js — Linked, Indeed! popup logic

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
let editingField = null;

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

  // catch chrome newtab which would have no URL
  if (!tab.url) {
    pageMode = "unsupported-site";
    renderUnsupported();
    return;
  }
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

  let initialized = false;

  /**
   * Send a message to content script and check for initialization.
   * If initialized, it will skip re-executing the scripts.
   * If not initialized, it will execute the scripts in the content script context.
   */

  try {
    initialized = await chrome.tabs.sendMessage(tab.id, {
      action: "getInitialized",
    });
  } catch (e) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        "urlUtils.js",
        "jobsites/JobScraper.js",
        "jobsites/IndeedScraper.js",
        "jobsites/LinkedInScraper.js",
        "jobsites/GreenhouseScraper.js",
        "jobsites/AshbyScraper.js",
        "jobsites/ZipRecruiterScraper.js",
        "content.js",
      ],
    });
  }

  jobInfo = await chrome.tabs.sendMessage(tab.id, {
    action: "getJobInfo",
  });

  pageMode = "job-page";
  renderSnapTab();
}

// ── Render States ─────────────────────────────────────────────────────────────
/**
 *
 * @param {string} activeTab - the tab that should be active
 * @returns the HTML text of the tabs, with the correct activeTab.
 */
function renderTabs(activeTab) {
  return `
    <div class="tabs">
      <div class="tab ${activeTab === "snap" ? "active" : ""}"
           data-action="switch-tab" data-tab="snap">
        Snap
      </div>
      <div class="tab ${activeTab === "settings" ? "active" : ""}"
           data-action="switch-tab" data-tab="settings">
        Settings
      </div>
    </div>
  `;
}

function renderSupportedSites() {
  return `
    <div class="supported-sites">
      ${Object.values(SITE_LABELS)
        .map((label) => `<span class="site-chip">${escHTML(label)}</span>`)
        .join("")}
    </div>
  `;
}

function renderUnsupported() {
  setPanel(
    renderTabs("snap") +
      `
    <div class="unsupported">
      <div class="unsupported-icon">🔍</div>
      <h3>Not a supported job site</h3>
      <p>Navigate to a job listing on one of these sites to use Linked, Indeed!:</p>
      ${renderSupportedSites()}
    </div>
  `,
  );
}

function renderNotAJobPage() {
  setPanel(
    renderTabs("snap") +
      `
    <div class="unsupported">
      <h3>Please open a job post directly</h3>
      <p>Happy Job Applying! From a listings page, Ctrl/Cmd-click the job or right-click and open it in a new tab.</p>
    </div>
  `,
  );
}

const MetaIconHTML = {
  salary: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
  location: ` <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
};

/**
 * Render the main "Snap" tab with job info and actions, based on the `jobInfo` object
 * retrieved from the content script.
 *
 *
 */
function renderSnapTab() {
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
      renderTabs("snap") +
        `
    <div class="errorunknown">
      <h3>Error please reload extension</h3>
      ${renderSupportedSites()}
    </div>
  `,
    );
    return;
  }

  const { site, title, company, location, salary, cleanUrl } = jobInfo;
  const label = SITE_LABELS[site] || site;

  const locationHTML = editableField("location", location, "Location...");
  const salaryHTML = editableField("salary", salary, "Salary...");

  const snapHtml = `
    <div id="snapView">
      <div class="job-card">
        <div class="site-badge">${escHTML(label)}</div>
        ${editableField("title", title, "Job Title...")}
        ${editableField("company", company, "Company Name...")}

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

  setPanel(renderTabs("snap") + snapHtml);
}

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

  setPanel(renderTabs("settings") + settingsHtml);
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
  panel.addEventListener("keydown", handlePanelKeydown);
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
      if (actionEl.dataset.tab === "settings") {
        renderSettingsTab();
      } else {
        renderSnapTab();
      }
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
    case "edit-field":
      editingField = actionEl.dataset.field;
      renderSnapTab();
      // necessary to perform edit and focusing on the field, could consider just not using it
      // but might be clunky. GPT suggested this
      requestAnimationFrame(() => {
        const input = document.querySelector(
          `[data-edit-field="${editingField}"]`,
        );
        if (input) {
          input.focus();
          input.select();
        }
      });
      break;
    case "save-field":
      saveEditedField(actionEl.dataset.field);
      break;
  }
}
/**
 * A simple toast window function to show ``msg`` on the extension page. Writes ``msg`` into the element with the ID ``toast``. Disappears after a delay of 2000ms.
 *
 * @param {string} msg - The toast message to show on screen
 */
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
}

// ------EDITABLE FIELDS FUNCTIONS--------- //
/**
 * This function returns the editable field's HTML. Based on the current ``editingField`` variable, it will display either an input box with the current value
 * or just the current value (no edit). Depending on the type of field (i.e. meta or non-meta), it applies the appropriate CSS style classes. The type of field is determined
 * based on the ``field`` parameter and whether it exists inside the ``MetaIconHTML`` object/dict.
 *
 * @param {string} field - the name of the field that is editable - must match an entry of ``jobInfo``.
 * @param {string} value - the value that is being edited, retrieved from current ``jobInfo`` object.
 * @param {string} placeholder - the default placeholder for the field when empty
 * @returns {string} HTML - the editable field's HTML element in string.
 */
function editableField(field, value, placeholder) {
  const displayValue = value || placeholder;
  const className = "job-" + field;

  // Check to see if the current field is a meta field by seeing if there is an icon,
  // which only exists for meta fields.
  const isMeta = Object.hasOwn(MetaIconHTML, field);

  if (editingField === field) {
    // determine the classes this field has. Either it is a meta item, which needs meta-editing and meta-item class,
    // or it is a non-meta info item, which requires text-editing and the associated CSS class (aka the field parameter)
    const allClasses = isMeta
      ? "meta-editing meta-item"
      : `text-editing ${className} `;
    return `
      <div class="editable-field ${allClasses}">
        ${isMeta ? MetaIconHTML[field] : ""}
        <input
          class="field-input"
          data-edit-field="${field}"
          value="${escHTML(value || "")}"
          placeholder="${escHTML(placeholder)}"
        />
        ${saveFieldButton(field)}
      </div>
    `;
  }

  return `
    <div class="editable-field ${isMeta ? "meta-item" : className}">
      ${isMeta ? MetaIconHTML[field] : ""}

      <span class="editable-value">${escHTML(displayValue)}</span>
      ${editFieldButton(field)}
    </div>
  `;
}

function editFieldButton(field) {
  return `
    <button class="field-edit-btn" type="button" data-action="edit-field" data-field="${field}" aria-label="Edit ${escHTML(field)}">
      Edit
    </button>
  `;
}

function saveFieldButton(field) {
  return `
    <button class="field-save-btn" type="button" data-action="save-field" data-field="${field}" aria-label="Save ${escHTML(field)}" title="Done">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
    </button>
  `;
}

function handlePanelKeydown(event) {
  const input = event.target.closest("[data-edit-field]");
  if (!input) return;

  if (event.key === "Enter") {
    event.preventDefault();
    saveEditedField(input.dataset.editField);
  } else if (event.key === "Escape") {
    editingField = null;
    renderSnapTab();
  }
}

function saveEditedField(field) {
  if (!jobInfo) return;
  const input = document.querySelector(`[data-edit-field="${field}"]`);
  if (!input) return;

  jobInfo[field] = input.value.trim();
  editingField = null;

  chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (tab) {
      chrome.tabs.sendMessage(tab.id, {
        action: "updateJobInfo",
        field,
        value: jobInfo[field],
      });
    }
  });

  renderSnapTab();
  showToast("Field updated");
}

function escHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Settings / Excel helpers ---

function copyExcel() {
  if (!excelColumnsSet) {
    showToast("Set Excel columns in Settings first.");
    return;
  }
  if (!jobInfo) return;

  const FIELD_MAP = {
    company: "company",
    title: "title",
    location: "location",
    salary: "salary",
    cleanUrl: "cleanUrl",
  };

  const mapField = (key, idx) => {
    if (key === "date") {
      return formatDate(new Date(), dateFormats[idx] || "MM/DD/YYYY");
    }

    return jobInfo[FIELD_MAP[key]] || "";
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
