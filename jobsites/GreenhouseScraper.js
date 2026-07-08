// Greenhouse-specific extraction helpers for the content script.

class GreenhouseScraper extends JobScraper {
  constructor(document, url) {
    super(document, url);
  }

  cleanURL() {
    const match = this.url.pathname.match(/(\/jobs\/[^\/\?#]+)/);
    return match ? `${this.url.origin}${match[1]}` : "";
  }

  /* -------------- TITLE EXTRACTION --------------
   */

  getTitle() {
    return (
      this.document.querySelector("h1.job-title")?.innerText.trim() ||
      this.document.querySelector("h1")?.innerText.trim() ||
      this.document.querySelector(".opening-title")?.innerText.trim() ||
      this.document.title ||
      null
    );
  }

  /* -------------- COMPANY EXTRACTION --------------
   */

  getCompany() {
    return (
      this.extractLogoAltCompanyText() || this.extractCompanyFromURL() || null
    );
  }

  /* the main method for extracting company text, through the alt text of the company logo. */
  extractLogoAltCompanyText() {
    const container = this.document.querySelector(
      "div.job-post-container div.image-container",
    );
    if (!container) return null;

    const img = container.querySelector("img");
    if (!img) return null;

    const alt = (img.getAttribute("alt") || "").trim();
    if (!alt) return null;

    return alt.replace(/\s*Logo$/, "").trim() || null;
  }

  /* Fallback method for company if company logo is not available in job posting. */
  extractCompanyFromURL() {
    const pathnameParts = this.url.pathname.split("/").filter(Boolean);
    if (pathnameParts.length && pathnameParts[0] !== "jobs") {
      return decodeURIComponent(pathnameParts[0]).replace(/-/g, " ");
    }
    return null;
  }

  /**
   * -------------- SALARY EXTRACTION --------------
   * Salary is in a div container with class "pay-range". Inside that div,
   * there is a <p> element with class "body" (but not "body--medium")
   * that contains the salary text. If the "body--medium" element exists,
   * it should be ignored and the other "body" element should be used instead.
   */
  getSalary() {
    const payEl = this.document.querySelector(".pay-range");
    if (!payEl) return null;

    const paragraph =
      payEl.querySelector("p.body:not(.body--medium)") ||
      payEl.querySelector("p.body");
    return paragraph ? paragraph.innerText.trim() : null;
  }

  /* -------------- LOCATION EXTRACTION --------------
   */
  getLocation() {
    return (
      this.document.querySelector('[class*="location"]')?.innerText.trim() ||
      this.document.querySelector(".location")?.innerText.trim() ||
      this.document.querySelector(".job-location")?.innerText.trim() ||
      null
    );
  }
}
