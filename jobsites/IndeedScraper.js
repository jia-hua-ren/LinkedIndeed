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
    const nextDiv = title?.parentElement?.nextElementSibling?.children[0];
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
      this.document.querySelector('[data-testid="vj-company-name"]') ||
      this.document.querySelector('[data-company-name="true"]');

    const companyName = this.companyInfoSection?.children[0]
      ?.querySelector("a")
      ?.textContent?.trim();

    return companyName || companyEl?.innerText.trim() || null;
  }

  getSalary() {
    // new update Oct 4 2026: Indeed has removed the jobDetailsSection id. Now it locates the
    // salary icon and finds that pattern and finds the salary
    const pathD = `M3.98188 19.2034C3.38088 19.2034 2.86646 18.9894 2.43863 18.5614C2.01063 18.1335 1.79663 17.6191 1.79663 17.0181V6.98213C1.79663 6.38113 2.01063 5.86671 2.43863 5.43887C2.86646 5.01087 3.38088 4.79688 3.98188 4.79688H20.0179C20.6189 4.79688 21.1333 5.01087 21.5611 5.43887C21.9891 5.86671 22.2031 6.38113 22.2031 6.98213V17.0181C22.2031 17.6191 21.9891 18.1335 21.5611 18.5614C21.1333 18.9894 20.6189 19.2034 20.0179 19.2034H3.98188ZM17.5179 14.5181H15.7679C15.5512 14.5181 15.372 14.589 15.2304 14.7306C15.0887 14.8723 15.0179 15.0515 15.0179 15.2681C15.0179 15.4848 15.0887 15.664 15.2304 15.8056C15.372 15.9473 15.5512 16.0181 15.7679 16.0181H17.8804C18.1995 16.0181 18.4689 15.9083 18.6884 15.6886C18.908 15.4691 19.0179 15.1998 19.0179 14.8806V12.7681C19.0179 12.5515 18.947 12.3723 18.8054 12.2306C18.6637 12.089 18.4845 12.0181 18.2679 12.0181C18.0512 12.0181 17.872 12.089 17.7304 12.2306C17.5887 12.3723 17.5179 12.5515 17.5179 12.7681V14.5181ZM11.9999 15.0001C12.8332 15.0001 13.5415 14.7085 14.1249 14.1251C14.7082 13.5418 14.9999 12.8335 14.9999 12.0001C14.9999 11.1668 14.7082 10.4585 14.1249 9.87513C13.5415 9.29179 12.8332 9.00013 11.9999 9.00013C11.1665 9.00013 10.4582 9.29179 9.87488 9.87513C9.29155 10.4585 8.99988 11.1668 8.99988 12.0001C8.99988 12.8335 9.29155 13.5418 9.87488 14.1251C10.4582 14.7085 11.1665 15.0001 11.9999 15.0001ZM6.48188 9.48213H8.23188C8.44855 9.48213 8.62771 9.41129 8.76938 9.26963C8.91105 9.12796 8.98188 8.94879 8.98188 8.73213C8.98188 8.51546 8.91105 8.33629 8.76938 8.19463C8.62771 8.05296 8.44855 7.98213 8.23188 7.98213H6.11938C5.80021 7.98213 5.53088 8.09196 5.31138 8.31163C5.09171 8.53113 4.98188 8.80046 4.98188 9.11963V11.2321C4.98188 11.4488 5.05271 11.628 5.19438 11.7696C5.33605 11.9113 5.51521 11.9821 5.73188 11.9821C5.94855 11.9821 6.12771 11.9113 6.26938 11.7696C6.41105 11.628 6.48188 11.4488 6.48188 11.2321V9.48213Z`;

    const path = document.querySelector(`path[d="${pathD}"]`);

    if (path) {
      // Find the div containing the SVG/path of the salary icon
      const containingDiv = path.closest("div");
      if (containingDiv) {
        // Get the next div sibling
        const nextDiv = containingDiv.nextElementSibling;

        if (nextDiv) {
          // Get the first div child
          const firstDiv = nextDiv.querySelector(":scope > div");

          if (firstDiv) {
            const salary = firstDiv.innerText;
            return salary;
          }
        }
      }
    }

    // OLD and lowkey deprecated, but kept in case it comes back
    const jobDetailSection = this.document.querySelector("#jobDetailsSection");
    const payHeading = [
      ...(jobDetailSection?.querySelectorAll("h2") || []),
    ].find((h2) => h2.textContent?.trim() === "Pay");

    const payElement = payHeading?.nextElementSibling;

    const salaryEl = this.document.querySelector("#salaryInfoAndJobType span");
    return (
      payElement?.textContent?.trim() || salaryEl?.textContent?.trim() || null
    );
  }

  getLocation() {
    // OLD: indeed has removed the data-testid attribute from some elements, but keeping it
    // in case it comes back in the future.
    const locationEl =
      this.document.querySelector(
        '[data-testid="inlineHeader-companyLocation"]',
      ) || this.document.querySelector('[data-testid="job-location"]');

    const companyLoc =
      this.companyInfoSection?.children[1]?.textContent?.trim();

    return companyLoc || locationEl?.innerText.trim() || null;
  }
}
