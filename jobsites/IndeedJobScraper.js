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
      document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]') ||
      document.querySelector('[data-testid="vj-job-title"]') ||
      document.querySelector(".jobsearch-JobInfoHeader-title");

    return titleEl ? titleEl.innerText.trim() : null;
  }

  getCompany() {
    const companyEl =
      document.querySelector('[data-testid="inlineHeader-companyName"]') ||
      document.querySelector('[data-company-name="true"]');

    return companyEl ? companyEl.innerText.trim() : null;
  }

  getSalary() {
    const salaryEl = document.querySelector("#salaryInfoAndJobType span");
    return salaryEl ? salaryEl.innerText.trim() : null;
  }

  getLocation() {
    const locationEl =
      document.querySelector('[data-testid="inlineHeader-companyLocation"]') ||
      document.querySelector('[data-testid="job-location"]');

    return locationEl ? locationEl.innerText.trim() : null;
  }
}
