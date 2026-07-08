class JobScraper {
  constructor(document, url) {
    this.document = document;
    this.url = new URL(url);
  }

  cleanURL() {
    throw new Error("cleanURL() must be implemented");
  }

  getTitle() {
    throw new Error("getTitle() must be implemented");
  }

  getCompany() {
    throw new Error("getCompany() must be implemented");
  }

  getSalary() {
    throw new Error("getSalary() must be implemented");
  }

  getLocation() {
    throw new Error("getLocation() must be implemented");
  }

  getJobInfo() {
    return {
      title: this.getTitle(),
      company: this.getCompany(),
      salary: this.getSalary(),
      location: this.getLocation(),
    };
  }
}
