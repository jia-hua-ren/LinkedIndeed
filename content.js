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
      // other sites fall through to the generic fallback
      // other sites fall through to the generic fallback
    }

    // Fallback: strip common tracking params
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "refid",
      "trk",
      "trkCode",
      "trkInfo",
      "sal",
      "from",
      "advn",
      "adid",
      "tk",
      "hl",
      "jsa",
    ];
    trackingParams.forEach((p) => url.searchParams.delete(p));
    return url.toString();
  }

  function q(selector) {
    const el = document.querySelector(selector);
    return el ? el.innerText.trim() : null;
  }

  function extractJobInfo(site) {
    let title = null,
      company = null,
      location = null,
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
        location =
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
        location =
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

      // Other sites are not specially handled and will fall back to generic heuristics

      // Other sites are not specially handled and will fall back to generic heuristics
    }

    return {
      site,
      title: title || document.title || null,
      company: company || null,
      location: location || null,
      salary: salary || null,
      cleanUrl: cleanURL(site),
      rawUrl: location.href,
    };
  }
})();
