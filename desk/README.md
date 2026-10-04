# Front desk

A Cloudflare Worker that lets founders register and run their company on
[interimm.org/hub](https://interimm.org/hub/) without a GitHub account. The hub stays a static
Jekyll site; the company files in `_companies/` stay the register. The desk is the only thing that
writes to them.

| Endpoint | Who | What happens |
| --- | --- | --- |
| `POST /register` | anyone (Turnstile) | Creates `_companies/company-<key>.md` on a `register/<key>` branch and opens a pull request labelled `new-company`. Returns the register key and the **edit code**, shown once. |
| `POST /verify` | founder | Checks key + edit code, returns the company's current record (also while its PR is still open). |
| `POST /update` | founder | Key + edit code + new `jobs` / `ads` / `notices` / `profile`. Commits straight to `gh-pages`; GitHub Pages rebuilds in about a minute. |
| `POST /admin/reset` | registrar | `Authorization: Bearer <ADMIN_KEY>`. Issues a new edit code for a company (lost codes, and the 216 older companies, which start without one). |

Rules the desk enforces, whatever the page sends: at most 3 open jobs, 2 ads and 5 notices per
company; jobs and ads run 31 days (about 30 sols) unless renewed; dates are set by the desk, not
the browser; text is length-limited and stored as plain text; links must be http(s). Edit codes are
16 characters from Crockford base32 (80 bits). The file keeps only `seal: sha256("<key>:<code>")`.

## Setup (once)

interimm.org's DNS is already on Cloudflare, which the custom domain below needs.
`*.workers.dev` addresses are blocked in mainland China, so the desk must live on our own domain.

1. **Turnstile.** Cloudflare dashboard → Turnstile → Add widget. Hostname `interimm.org`, mode
   *Managed*. Put the **site key** in the hub's `_config.yml` as `turnstile_sitekey`; keep the
   **secret key** for step 3.
2. **GitHub token.** GitHub → Settings → Developer settings → Fine-grained tokens → Generate.
   Resource owner *InterImm*, repository *InterImm/hub* only. Permissions: *Contents*,
   *Pull requests* and *Issues*, all read and write. Note the expiry date; the desk stops writing
   when it lapses.
3. **Deploy.**
   ```sh
   cd desk
   npm install
   npx wrangler login
   npx wrangler secret put GITHUB_TOKEN       # the token from step 2
   npx wrangler secret put TURNSTILE_SECRET   # the secret from step 1
   npx wrangler secret put ADMIN_KEY          # any long random string, e.g. `openssl rand -hex 24`
   npx wrangler deploy                        # also creates desk.interimm.org
   ```
   `curl https://desk.interimm.org/` should answer `{"ok":true,...}`.
4. **Repository.** In InterImm/hub settings, turn on *Automatically delete head branches*, so
   merged registration branches go away. Create a label `new-company`.
5. **Switch the page on.** Set `desk_url: https://desk.interimm.org` in `_config.yml`. Until then the
   page shows the desks but says registration is not open yet.

Everything above fits Cloudflare's free plan (100,000 Worker requests a day, Turnstile free).

## Running the register

- **New companies** arrive as pull requests. Merge to publish, close to decline.
- **Lost code, or claiming an older company.** Check who is asking (the old Typeform records have
  the submitters' emails), then:
  ```sh
  curl -X POST https://desk.interimm.org/admin/reset \
    -H "Authorization: Bearer $ADMIN_KEY" -H "Content-Type: application/json" \
    -d '{"key":"company-1487137522587-spacex"}'
  ```
  and pass the returned code on privately.
- **Removing a post** someone should not have made: edit the company file on GitHub like any other.

## Development

```sh
npm install
npm test                                   # node --test, GitHub and Turnstile faked in memory
printf 'DEV=1\nALLOWED_ORIGINS=http://localhost:4000\n' > .dev.vars
npx wrangler dev                           # with DEV=1 the Turnstile check is skipped
```
