// Greenhouse-specific extraction helpers for the content script.

const GreenhouseJobSite = {
  cleanURL(url) {
    const match = url.pathname.match(/(\/jobs\/[^\/\?#]+)/);
    return match ? `${url.origin}${match[1]}` : "";
  },

  extractJobInfo(document) {
    return {
      title:
        document.querySelector("h1.job-title")?.innerText.trim() ||
        document.querySelector("h1")?.innerText.trim() ||
        document.querySelector(".opening-title")?.innerText.trim() ||
        document.title ||
        null,
      company:
        this.extractLogoAltCompanyText(document) ||
        this.extractCompanyFromURL(location),
      location:
        document.querySelector('[class*="location"]')?.innerText.trim() ||
        document.querySelector(".location")?.innerText.trim() ||
        document.querySelector(".job-location")?.innerText.trim() ||
        null,
      salary: this.extractSalary(document),
    };
  },

  extractLogoAltCompanyText(document) {
    const container = document.querySelector(
      "div.job-post-container div.image-container",
    );
    if (!container) return null;

    const img = container.querySelector("img");
    if (!img) return null;

    const alt = (img.getAttribute("alt") || "").trim();
    if (!alt) return null;

    return alt.replace(/\s*Logo$/, "").trim() || null;
  },

  extractCompanyFromURL(url) {
    const pathnameParts = url.pathname.split("/").filter(Boolean);
    if (pathnameParts.length && pathnameParts[0] !== "jobs") {
      return decodeURIComponent(pathnameParts[0]).replace(/-/g, " ");
    }
    return null;
  },

  /**
   * Salary is in a div container with class "pay-range". Inside that div,
   * there is a <p> element with class "body" (but not "body--medium")
   * that contains the salary text. If the "body--medium" element exists,
   * it should be ignored and the other "body" element should be used instead.
   */
  extractSalary(document) {
    const payEl = document.querySelector(".pay-range");
    if (!payEl) return null;

    const paragraph =
      payEl.querySelector("p.body:not(.body--medium)") ||
      payEl.querySelector("p.body");
    return paragraph ? paragraph.innerText.trim() : null;
  },
};
