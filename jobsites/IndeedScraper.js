// Indeed-specific extraction helpers for the content script.

class IndeedScraper extends JobScraper {
  constructor(document, url) {
    super(document, url);
  }

  cleanURL() {
    const jk = this.url.searchParams.get("jk");
    return jk ? `https://www.indeed.com/viewjob?jk=${jk}` : "";
  }

  getTitle() {
    const titleEl =
      this.document.querySelector(
        '[data-testid="jobsearch-JobInfoHeader-title"]',
      ) ||
      this.document.querySelector('[data-testid="vj-job-title"]') ||
      this.document.querySelector(".jobsearch-JobInfoHeader-title");

    return titleEl ? titleEl.innerText.trim() : null;
  }

  getCompany() {
    const companyEl =
      this.document.querySelector('[data-testid="inlineHeader-companyName"]') ||
      this.document.querySelector('[data-company-name="true"]');

    return companyEl ? companyEl.innerText.trim() : null;
  }

  getSalary() {
    const salaryEl = this.document.querySelector("#salaryInfoAndJobType span");
    return salaryEl ? salaryEl.innerText.trim() : null;
  }

  getLocation() {
    const locationEl =
      this.document.querySelector(
        '[data-testid="inlineHeader-companyLocation"]',
      ) || this.document.querySelector('[data-testid="job-location"]');

    return locationEl ? locationEl.innerText.trim() : null;
  }
}
