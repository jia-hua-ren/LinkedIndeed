const IndeedJobSite = require("../jobsites/indeed");
const LinkedInJobSite = require("../jobsites/linkedin");
const GreenhouseJobSite = require("../jobsites/greenhouse");
const AshbyJobSite = require("../jobsites/ashby");
const ZiprecruiterJobSite = require("../jobsites/ziprecruiter");

function setLocation(href) {
  global.location = new URL(href);
}

function makeNode(text, extras = {}) {
  return {
    innerText: text,
    tagName: extras.tagName,
    getAttribute: extras.getAttribute || (() => null),
    querySelector: extras.querySelector || (() => null),
    querySelectorAll: extras.querySelectorAll || (() => []),
    children: extras.children || [],
    parentElement: extras.parentElement || null,
  };
}

describe("IndeedJobSite", () => {
  test("cleans Indeed job URLs", () => {
    expect(
      IndeedJobSite.cleanURL(
        new URL("https://www.indeed.com/viewjob?jk=abc123&from=web"),
      ),
    ).toBe("https://www.indeed.com/viewjob?jk=abc123");
    expect(
      IndeedJobSite.cleanURL(new URL("https://www.indeed.com/viewjob")),
    ).toBe("");
  });

  test("extracts job info from known selectors", () => {
    const document = {
      querySelector(selector) {
        const nodes = {
          '[data-testid="jobsearch-JobInfoHeader-title"]':
            makeNode("Senior Engineer"),
          '[data-testid="inlineHeader-companyName"]': makeNode("Acme Corp"),
          '[data-testid="inlineHeader-companyLocation"]': makeNode("Remote"),
          "#salaryInfoAndJobType span": makeNode("$150k - $180k"),
        };

        return nodes[selector] || null;
      },
    };

    expect(IndeedJobSite.extractJobInfo(document)).toEqual({
      title: "Senior Engineer",
      company: "Acme Corp",
      location: "Remote",
      salary: "$150k - $180k",
    });
  });
});

describe("LinkedInJobSite", () => {
  afterEach(() => {
    delete global.location;
  });

  test("cleans LinkedIn job URLs from either pathname or currentJobId", () => {
    expect(
      LinkedInJobSite.cleanURL(
        new URL("https://www.linkedin.com/jobs/view/1234567890/?foo=bar"),
      ),
    ).toBe("https://www.linkedin.com/jobs/view/1234567890/");
    expect(
      LinkedInJobSite.cleanURL(
        new URL("https://www.linkedin.com/jobs/view/?currentJobId=987654321"),
      ),
    ).toBe("https://www.linkedin.com/jobs/view/987654321/");
  });

  test("extracts title and company from the page title", () => {
    expect(
      LinkedInJobSite.extractTitleAndCompanyFromTitleTag({
        title: "Senior Engineer | Acme Corp | LinkedIn",
      }),
    ).toEqual({ title: "Senior Engineer", company: "Acme Corp" });
  });

  test("extracts job info from the title, company and location fallbacks", () => {
    setLocation("https://www.linkedin.com/jobs/view/1234567890/");

    const salaryLink = makeNode("$120k - $140k", {
      innerText: "$120k - $140k",
    });
    const document = {
      title: "Senior Engineer | Acme Corp | LinkedIn",
      querySelector(selector) {
        if (selector === 'div[aria-label^="Company, "]') {
          return makeNode("", {
            getAttribute: () => "Company, Acme Corp.",
          });
        }
        return null;
      },
      querySelectorAll(selector) {
        if (selector === `a[href="${global.location.href}"]`) {
          return [salaryLink];
        }
        if (selector === "p") {
          return [
            makeNode("", { children: [] }),
            makeNode("", {
              children: [makeNode("", { tagName: "SPAN" })],
              querySelector: () => makeNode("Remote"),
            }),
          ];
        }
        return [];
      },
    };

    expect(LinkedInJobSite.extractJobInfo(document)).toEqual({
      title: "Senior Engineer",
      company: "Acme Corp",
      location: "Remote",
      salary: "$120k - $140k",
    });
  });
});

describe("GreenhouseJobSite", () => {
  afterEach(() => {
    delete global.location;
  });

  test("cleans Greenhouse URLs to the job slug", () => {
    expect(
      GreenhouseJobSite.cleanURL(
        new URL(
          "https://job-boards.greenhouse.io/acme/jobs/1234?utm_source=foo",
        ),
      ),
    ).toBe("https://job-boards.greenhouse.io/jobs/1234");
  });

  test("extracts company name from a logo alt tag and falls back to URL", () => {
    setLocation("https://job-boards.greenhouse.io/acme/jobs/1234");

    const document = {
      querySelector(selector) {
        if (selector === "div.job-post-container div.image-container") {
          return makeNode("", {
            querySelector: () =>
              makeNode("Acme Logo", {
                getAttribute: () => "Acme Logo",
              }),
          });
        }
        if (selector === "h1.job-title") {
          return makeNode("Senior Engineer");
        }
        if (selector === '[class*="location"]') {
          return makeNode("Remote");
        }
        if (selector === ".pay-range") {
          return makeNode("", {
            querySelector: () => makeNode("$130k - $160k"),
          });
        }
        return null;
      },
    };

    expect(GreenhouseJobSite.extractJobInfo(document)).toEqual({
      title: "Senior Engineer",
      company: "Acme",
      location: "Remote",
      salary: "$130k - $160k",
    });
  });
});

describe("AshbyJobSite", () => {
  afterEach(() => {
    delete global.location;
  });

  test("cleans Ashby URLs to the company/job slug pair", () => {
    expect(
      AshbyJobSite.cleanURL(
        new URL("https://jobs.ashbyhq.com/acme/frontend-engineer/apply"),
      ),
    ).toBe("https://jobs.ashbyhq.com/acme/frontend-engineer");
  });

  test("extracts company, location and salary from the left pane", () => {
    setLocation("https://jobs.ashbyhq.com/acme/frontend-engineer");

    const leftPane = makeNode("", {
      querySelectorAll(selector) {
        if (selector !== "h2") return [];
        const compensationHeading = makeNode("Compensation", {
          innerText: "Compensation",
          parentElement: {
            querySelector: () => makeNode("$140k - $170k"),
          },
        });
        const locationHeading = makeNode("Location", {
          innerText: "Location",
          parentElement: {
            querySelector: () => makeNode("Remote"),
          },
        });
        return [compensationHeading, locationHeading];
      },
    });

    const document = {
      querySelector(selector) {
        if (selector === ".ashby-job-posting-left-pane") {
          return leftPane;
        }
        if (selector === "h1.ashby-job-posting-heading") {
          return makeNode("Senior Engineer");
        }
        return null;
      },
    };

    expect(AshbyJobSite.extractJobInfo(document)).toEqual({
      title: "Senior Engineer",
      company: "acme",
      location: "Remote",
      salary: "$140k - $170k",
    });
  });
});

describe("ZiprecruiterJobSite", () => {
  test("cleans ZipRecruiter URLs", () => {
    expect(
      ZiprecruiterJobSite.cleanURL(
        new URL(
          "https://www.ziprecruiter.com/jobs/job/i?lvk=abc123&utm_source=foo",
        ),
      ),
    ).toBe("https://www.ziprecruiter.com/jobs/job/i?lvk=abc123");
  });

  test("extracts job info from the grid layout and salary marker", () => {
    const salaryChild = makeNode("$110k - $135k", {
      querySelector: () =>
        makeNode("", {
          innerText: "",
        }),
    });

    const parent = makeNode("", {
      children: [
        makeNode("Senior Engineer"),
        makeNode("Acme Corp"),
        makeNode("Remote"),
        salaryChild,
      ],
      querySelector() {
        return null;
      },
    });

    const salaryParent = makeNode("", {
      children: [
        makeNode("", { querySelector: () => null }),
        makeNode("", {
          querySelector: (selector) => {
            if (selector.includes('path[d="M16.18 7.463')) {
              return makeNode("");
            }
            if (selector === "p") {
              return makeNode("$110k - $135k");
            }
            return null;
          },
          querySelectorAll: () => [],
        }),
      ],
    });

    const document = {
      querySelector(selector) {
        if (selector === ".grid.gap-y-8") {
          return parent;
        }
        if (selector === "div.flex.flex-col.gap-y-8") {
          return salaryParent;
        }
        return null;
      },
    };

    expect(ZiprecruiterJobSite.extractJobInfo(document)).toEqual({
      title: "Senior Engineer",
      company: "Acme Corp",
      location: "Remote",
      salary: "$110k - $135k",
    });
  });
});
