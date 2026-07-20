// Indeed-specific extraction helpers for the content script.

// Log 7/20/26: indeed has removed the data-testid attribute from some elements (specifically company name and location)

class IndeedScraper extends JobScraper {
  constructor(document, url) {
    super(document, url);

    /**  This is the div that is right after the div containing the title, 
    that contains the div which contains the company name and location.
    <div>
      <h5 data-testid="vj-job-title"></h5>
    </div>
    <div>
      <div>                       <----- this div
        <div>company name</div>
        <div>location</div>
      </div>
    </div>
    */
    const title = this.document.querySelector('[data-testid="vj-job-title"]');
    const nextDiv = title.parentElement.nextElementSibling.children[0];
    this.companyInfoSection = nextDiv;
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
    // OLD: indeed has removed the data-testid attribute from some elements, but keeping it
    // in case it comes back in the future.
    const companyEl =
      this.document.querySelector('[data-testid="inlineHeader-companyName"]') ||
      this.document.querySelector('[data-company-name="true"]');

    const companyName = this.companyInfoSection?.children[0]
      ?.querySelector("a")
      .textContent.trim();

    return companyName || companyEl?.innerText.trim() || null;
  }

  getSalary() {
    const jobDetailSection = this.document.querySelector("#jobDetailsSection");
    const payHeading = [...jobDetailSection?.querySelectorAll("h2")].find(
      (h2) => h2.textContent.trim() === "Pay",
    );

    const payElement = payHeading?.nextElementSibling;

    const salaryEl = this.document.querySelector("#salaryInfoAndJobType span");
    return (
      payElement?.textContent.trim() || salaryEl?.textContent.trim() || null
    );
  }

  getLocation() {
    // OLD: indeed has removed the data-testid attribute from some elements, but keeping it
    // in case it comes back in the future.
    const locationEl =
      this.document.querySelector(
        '[data-testid="inlineHeader-companyLocation"]',
      ) || this.document.querySelector('[data-testid="job-location"]');

    const companyLoc = this.companyInfoSection?.children[1]?.textContent.trim();

    return companyLoc || locationEl?.innerText.trim() || null;
  }
}
