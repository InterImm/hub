# InterImm Company Hub

The register of interplanetary companies at [interimm.org/hub](https://interimm.org/hub/), in the
world of the Interplanetary Immigration Center (story year 2219).

Visitors can find work at the job fair, register a company, and run it from the Company Office
(jobs, ads, notices), without any account.

## How it fits together

- **The register** is `_companies/*.md`. Each file's front matter is one company.
- **The site** is plain Jekyll on GitHub Pages: `_layouts/hub.html` (the four desks, `index.md`
  and `en/index.md`), `_layouts/company.html` (one page per company), `assets/hub/` (styles and
  script, on the shared InterImm kit), `api/hub.json` and `api/companies.json` (the register as
  JSON).
- **The front desk** (`desk/`) is a Cloudflare Worker at desk.interimm.org. It checks edit codes
  and writes to the register through the GitHub API: new companies arrive as pull requests
  labelled `new-company`, office updates are committed straight to `gh-pages`. Setup and
  registrar commands are in [desk/README.md](desk/README.md).

## Running the register

- Merge a `new-company` pull request to publish a company; close it to decline.
- Lost edit codes and claims on older companies: see "Running the register" in desk/README.md.

## History

The previous site (Typeform intake, Bulma theme, articles) is kept on the
[`legacy-site`](https://github.com/InterImm/hub/tree/legacy-site) branch.
