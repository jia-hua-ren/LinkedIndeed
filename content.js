// content.js — Linked, Indeed! content script
// Runs on supported job sites and extracts job info + cleans URLs

(function () {
  const site = detectSite();

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "getJobInfo") {
      const info = extractJobInfo(site);
      sendResponse(info);
    }
    return true;
  });

  function detectSite() {
    const host = location.hostname;
    if (host.includes("indeed.com")) return "indeed";
    if (host.includes("linkedin.com")) return "linkedin";
    if (host.includes("greenhouse.io")) return "greenhouse";
    return "unknown";
  }

  function cleanURL(site) {
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

  function q(selector) {
    const el = document.querySelector(selector);
    return el ? el.innerText.trim() : null;
  }

  function meta(prop) {
    const m =
      document.querySelector(`meta[property="${prop}"]`) ||
      document.querySelector(`meta[name="${prop}"]`);
    return m ? m.content : null;
  }

  function extractJobInfo(site) {
    let title = null,
      company = null,
      jobLocation = null,
      salary = null;

    switch (site) {
      case "indeed":
        title =
          q('[data-testid="jobsearch-JobInfoHeader-title"]') ||
          q(".jobsearch-JobInfoHeader-title") ||
          q("h1.jobTitle") ||
          q("h1");
        company =
          q('[data-testid="inlineHeader-companyName"]') ||
          q(".jobsearch-InlineCompanyRating-companyName") ||
          q('[data-company-name="true"]');
        jobLocation =
          q('[data-testid="job-location"]') ||
          q(".jobsearch-JobInfoHeader-subtitle > div:last-child");
        salary =
          q('[data-testid="attribute_snippet_testid"]') ||
          q(".jobsearch-JobMetadataHeader-item") ||
          q("#salaryInfoAndJobType span");
        break;

      case "linkedin":
        title =
          q(".job-details-jobs-unified-top-card__job-title h1") ||
          q(".jobs-unified-top-card__job-title") ||
          q("h1.t-24");
        company =
          q(".job-details-jobs-unified-top-card__company-name") ||
          q(".jobs-unified-top-card__company-name a") ||
          q(".jobs-unified-top-card__subtitle-primary-grouping a");
        jobLocation =
          q(".job-details-jobs-unified-top-card__bullet") ||
          q(".jobs-unified-top-card__bullet") ||
          q(".jobs-unified-top-card__workplace-type");
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
          q(".company") ||
          q(".company-name") ||
          meta("og:site_name") ||
          (() => {
            const p = location.pathname.split("/").filter(Boolean);
            if (p.length && p[0] !== "jobs")
              return decodeURIComponent(p[0]).replace(/-/g, " ");
            return null;
          })();
        jobLocation =
          q('[class*="location"]') || q(".location") || q(".job-location");
        // Prefer the paragraph with class "body" inside .pay-range
        const payEl = document.querySelector('.pay-range');
        if (payEl) {
          // Prefer the plain `p.body` (exclude `p.body.body--medium`)
          const p = payEl.querySelector('p.body:not(.body--medium)') || payEl.querySelector('p.body');
          if (p) salary = p.innerText.trim();
        }
        break;

      // Other sites are not specially handled and will fall back to generic heuristics
    }

    return {
      site,
      title: title || document.title || null,
      company: company || null,
      location: jobLocation || null,
      salary: salary || null,
      cleanUrl: cleanURL(site),
      rawUrl: window.location.href,
    };
  }
})();
