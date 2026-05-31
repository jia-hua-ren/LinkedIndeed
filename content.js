// content.js — Linked, Indeed! content script
// Runs on supported job sites and extracts job info + cleans URLs

(function () {
  const site = detectSite();

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "getJobInfo") {
      const info = extractJobInfo();
      sendResponse(info);
    }
    return true;
  });

  /**
   * Determines which supported site the current page represents based on the
   * location URL. This only returns a valid result if the site is a URL to a
   * specific job post on a supported platform (e.g. if on Indeed homepage only,
   * which has no job info, it would not return 'indeed').
   *
   * Returns one of: 'indeed', 'linkedin', 'greenhouse', or 'unknown'.
   *
   * No parameters — reads `location.href`.
   */
  function detectSite() {
    const url = new URL(location.href);

    if (
      url.origin === "https://www.indeed.com" &&
      url.pathname.startsWith("/viewjob")
    )
      return "indeed";

    if (
      url.origin === "https://www.linkedin.com" &&
      url.pathname.startsWith("/jobs/view/")
    )
      return "linkedin";

    if (url.hostname === "job-boards.greenhouse.io") return "greenhouse";

    return "unknown";
  }

  /**
   * Shortens the URL to the job post page by stripping unnecessary query
   * parameters, keeping only the necessary one (often some form of
   * jobkey or jobid)
   *
   * No parameters - reads `location.href` and `site` variable.
   *
   * Returns a string containing the canonical URL, or an empty string when no
   * canonical form can be determined.
   */
  function cleanURL() {
    const url = new URL(location.href);

    switch (site) {
      case "indeed": {
        // Indeed job key: ?jk=XXXX is all you need
        const jk = url.searchParams.get("jk");
        if (jk) return `https://www.indeed.com/viewjob?jk=${jk}`;
        break;
      }
      case "linkedin": {
        // LinkedIn job id from URL path e.g. /jobs/view/1234567890
        const match = url.pathname.match(/\/jobs\/view\/(\d+)/);
        if (match) return `https://www.linkedin.com/jobs/view/${match[1]}/`;
        // Also check currentJobId param
        const jobId = url.searchParams.get("currentJobId");
        if (jobId) return `https://www.linkedin.com/jobs/view/${jobId}/`;
        break;
      }
      case "greenhouse": {
        // Greenhouse canonical job path: capture `/jobs/<id-or-slug>` only
        const match = url.pathname.match(/(\/jobs\/[^\/\?#]+)/);
        if (match) return `${url.origin}${match[1]}`;
        break;
      }
      // other sites fall through to the generic fallback
    }

    // If site is not specially handled above, return an empty string
    // (we only produce cleaned URLs for known sites)
    return "";
  }

  /**
   * Simple shorthand for `document.querySelector` that returns the visible
   * trimmed text of the first matching element, or null when not found.
   *
   * Parameters:
   *  - selector: string - CSS selector passed to `querySelector`.
   *
   * Returns: string|null
   */
  function q(selector) {
    const el = document.querySelector(selector);
    return el ? el.innerText.trim() : null;
  }

  /**
   * extractLogoAltText()
   * Find the logo image inside the job post container and return its alt text
   * with any trailing "Logo" suffix removed.
   *
   * No parameters — reads the current DOM.
   *
   * Returns: string|null
   */
  function greenhouseExtractLogoAltCompanyText() {
    const container = document.querySelector(
      "div.job-post-container div.image-container",
    );
    if (!container) return null;

    const img = container.querySelector("img");
    if (!img) return null;

    const alt = (img.getAttribute("alt") || "").trim();
    if (!alt) return null;

    return alt.replace(/\s*Logo$/, "").trim() || null;
  }

  /**
   * greenhouseExtractCompanyFromURL()
   * Derive a Greenhouse company name from the current pathname when the page
   * doesn't expose a cleaner company label in the DOM.
   *
   * No parameters — reads `location.pathname`.
   *
   * Returns: string|null
   */
  function greenhouseExtractCompanyFromURL() {
    const p = location.pathname.split("/").filter(Boolean);
    if (p.length && p[0] !== "jobs") {
      return decodeURIComponent(p[0]).replace(/-/g, " ");
    }
    return null;
  }

  /**
   * Attempt to extract visible job fields from the page DOM. Each site has
   * its own heuristics and fallbacks. The function returns an object with
   * fields `{ site, title, company, location, salary, cleanUrl }` where
   * missing fields are `null`.
   *
   * No parameters — reads `site` variable and the DOM.
   *
   * TODO: make each job site extraction independent functions for easier maintenance and testing.
   *
   * Returns: Object {site, title, company, location, salary, cleanUrl}
   */
  function extractJobInfo() {
    let title = null,
      company = null,
      jobLocation = null,
      salary = null;

    switch (site) {
      case "indeed":
        title =
          q('[data-testid="jobsearch-JobInfoHeader-title"]') ||
          q(".jobsearch-JobInfoHeader-title");
        company =
          q('[data-testid="inlineHeader-companyName"]') ||
          q('[data-company-name="true"]');
        jobLocation = q('[data-testid="inlineHeader-companyLocation"]');
        salary = q("#salaryInfoAndJobType span");
        break;

      case "linkedin":
        title =
          (() => {
            const paddingEl = document.querySelector(
              "div._9449c08b.ada36d68._9fcd086c.f7a29ebc.f28d050d.e508c506",
            );
            const titleContainer =
              paddingEl && paddingEl.previousElementSibling;
            if (titleContainer) {
              const text = titleContainer.innerText
                ? titleContainer.innerText.trim()
                : "";
              if (text) return text;
            }
            return null;
          })() ||
          q(".job-details-jobs-unified-top-card__job-title h1") ||
          q(".jobs-unified-top-card__job-title") ||
          q("h1.t-24");
        company =
          (() => {
            const companyEl = document.querySelector(
              'div[aria-label^="Company, "]',
            );
            if (companyEl) {
              const label = companyEl.getAttribute("aria-label") || "";
              const name = label
                .replace(/^Company,\s*/, "")
                .trim()
                .replace(/\.$/, "");
              if (name) return name;
            }
            return null;
          })() ||
          q(".job-details-jobs-unified-top-card__company-name") ||
          q(".jobs-unified-top-card__company-name a") ||
          q(".jobs-unified-top-card__subtitle-primary-grouping a");
        jobLocation = "";
        salary =
          q(
            ".job-details-jobs-unified-top-card__job-insight--highlight span",
          ) ||
          q(".jobs-unified-top-card__job-insight span") ||
          q('[class*="salary"]');
        break;

      case "greenhouse":
        title =
          q("h1.job-title") || q("h1") || q(".opening-title") || document.title;
        company =
          greenhouseExtractLogoAltCompanyText() ||
          greenhouseExtractCompanyFromURL();
        jobLocation =
          q('[class*="location"]') || q(".location") || q(".job-location");
        // Prefer the paragraph with class "body" inside .pay-range
        const payEl = document.querySelector(".pay-range");
        if (payEl) {
          // Prefer the plain `p.body` (exclude `p.body.body--medium`)
          const p =
            payEl.querySelector("p.body:not(.body--medium)") ||
            payEl.querySelector("p.body");
          if (p) salary = p.innerText.trim();
        }
        break;
    }

    return {
      site,
      title: title || document.title || null,
      company: company || null,
      location: jobLocation || null,
      salary: salary || null,
      cleanUrl: cleanURL(),
    };
  }
})();
