# Amazon Clone (Full Stack)

A full-stack e-commerce web application inspired by Amazon.

## Features

* Browse products
* Search for products
* View individual product details
* Register, sign in and sign out
* Add products to the cart
* Update product quantities
* Remove products from the cart
* Select delivery options
* Checkout and view order summary
* Place orders
* View orders
* Track orders
* Buy it again

## Tech Stack

* Node.js
* Express.js
* MongoDB
* Mongoose
* EJS
* JavaScript
* HTML
* CSS

## Architecture

```
Browser → Express → middleware → routes → controllers → services → models → MongoDB → EJS → Browser
```

| Folder        | Responsibility                                                       |
| ------------- | -------------------------------------------------------------------- |
| `config/`     | Environment validation and the MongoDB connection                     |
| `routes/`     | URL to handler mapping, plus per-route guards and rate limits         |
| `controllers/`| Read the request, call a service, choose a response                   |
| `services/`   | Business logic: carts, pricing, orders, products, users               |
| `validators/` | Turn untrusted request data into validated values, or reject it       |
| `models/`     | Mongoose schemas, validation and indexes                              |
| `middleware/` | Auth, CSRF, rate limiting, ObjectId checks, central error handling    |
| `utils/`      | Small shared helpers: money formatting, errors, input parsing         |
| `data/`       | Static reference data (delivery options, product seed data)           |
| `views/`      | EJS templates                                                         |
| `public/`     | Static assets served directly by Express                              |

Money is stored and calculated in **integer cents** everywhere and formatted
only for display. `services/pricingService.js` is the single source of truth
for subtotals, shipping, tax and totals, so the cart page, the checkout page
and the JSON endpoints can never disagree.

## Installation

Clone the repository:

```bash
git clone <your-repository-url>
```

Navigate into the project:

```bash
cd <project-folder>
```

Install dependencies (Node.js 20 or newer):

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Then edit `.env`. `MONGO_URI` and `SESSION_SECRET` are required and the
application refuses to start without them. Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Load the product catalogue (this **replaces** every existing product):

```bash
npm run seed
```

If you have orders in the database from before orders stored their own
product snapshots, backfill them once (safe to re-run):

```bash
npm run migrate
```

Start the application:

```bash
npm run dev     # development, with auto-reload
npm start       # production
```

Then open <http://localhost:3000>.

Run the unit tests (no database required):

```bash
npm test
```

### Scripts

| Script            | What it does                                                  |
| ----------------- | -------------------------------------------------------------- |
| `npm install`     | Installs dependencies                                          |
| `npm run dev`     | Development server with auto-reload (nodemon)                  |
| `npm start`       | Production server. This is the deployment start command.       |
| `npm test`        | Unit tests for pricing, validation and input parsing           |
| `npm run seed`    | **Replaces** the product catalogue. Never run in production.   |
| `npm run migrate` | One-off backfill of order snapshots. Safe to re-run.           |

## Environment variables

| Variable         | Required | Default      | Purpose                                            |
| ---------------- | -------- | ------------ | -------------------------------------------------- |
| `MONGO_URI`      | yes      | —            | MongoDB connection string                          |
| `SESSION_SECRET` | yes      | —            | Signs the session cookie (32+ chars in production) |
| `NODE_ENV`       | no       | `development`| `production` enables secure cookies and HSTS       |
| `PORT`           | no       | `3000`       | Port to listen on                                  |
| `SESSION_NAME`   | no       | `amazon.sid` | Session cookie name                                |
| `BCRYPT_ROUNDS`  | no       | `12`         | Password hashing cost (10–15)                      |
| `TRUST_PROXY`    | no       | `false`      | Set to `true` behind a reverse proxy               |
| `BASE_URL`       | no\*     | `http://localhost:PORT` | Public origin, used to build OAuth redirect URIs |

\* Required in production when any social sign-in provider is enabled.

## Social sign-in

**Google and GitHub are the supported providers.** Set up those two to
enable social sign-in.

Every provider is independent: leave its credentials blank and its
button does not appear on the sign-in and sign-up pages. Setting only
one half of a credential pair is treated as a startup error rather than
silently ignored.

| Variable                                    | Provider |
| ------------------------------------------- | -------- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google   |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub   |

Microsoft is also implemented and can be switched on later without any
code change — see [Optional: Microsoft](#optional-microsoft) below. It
is not configured, so no Microsoft button is shown.

### Registering the apps

The redirect URI must match what you register **exactly**, including
scheme, port and path.

**Google** — [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials).
Configure the OAuth consent screen, then create an *OAuth client ID* of
type *Web application* and add the authorised redirect URI:

```
http://localhost:3000/auth/google/callback
```

**GitHub** — [github.com/settings/developers](https://github.com/settings/developers).
*New OAuth App*. Set the Authorization callback URL to:

```
http://localhost:3000/auth/github/callback
```

In production, replace `http://localhost:3000` with your `BASE_URL` and
register that URI as well.

### Optional: Microsoft

Microsoft sign-in is implemented but **not configured, and not required**.
The application runs exactly as intended without it, and no Microsoft
button appears while its credentials are unset.

To enable it later, no code change is needed — register an app at
[portal.azure.com](https://portal.azure.com) under *Entra ID → App
registrations*, add a *Web* platform redirect URI, create a secret under
*Certificates & secrets*, and set the two variables:

```
http://localhost:3000/auth/microsoft/callback
```

```env
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

### How accounts are matched

1. If the provider account has been used here before, it signs straight in.
2. Otherwise, if an account already exists with the same email address
   and the provider reports that address as **verified**, the provider is
   linked to that account. The customer keeps one cart and one order
   history whichever way they sign in.
3. Otherwise a new account is created.

An email the provider has **not** verified is never linked or used to
create an account. Without that rule, anyone able to register at a
provider using someone else's address could take over the matching
account here.

An account created this way has no password. Attempting a password
sign-in on it returns a message naming the provider to use instead.

### Not implemented

**Sign in with Apple** is deliberately absent. It requires a paid Apple
Developer Program membership, a client secret that is an ES256 JWT
signed with a downloaded `.p8` key and re-minted at least every six
months, and a `form_post` callback that would need its own CSRF
handling. The other three providers share one code path; Apple does not.

## Deploying

The application targets a generic Node.js host: nothing in it assumes a
particular provider.

**Requirements**

* Node.js 20 or newer (`engines` in `package.json`; developed on 24).
* A reachable MongoDB instance. Sessions live in the same database and
  share the same connection, so there is nothing else to provision.
* A build step is not needed. `npm ci --omit=dev` then `npm start`.

**Start command**

```bash
npm start
```

**Configuration**

* Set `NODE_ENV=production`. This turns on `secure` session cookies,
  HSTS, `upgrade-insecure-requests`, long asset caching, and suppresses
  developer error detail.
* Set `TRUST_PROXY=true` if a proxy terminates TLS (Render, Heroku,
  Fly, nginx). Without it Express sees `http`, refuses to send a
  `secure` cookie, and **nobody can sign in**. It is also what makes the
  rate limiter see the real client IP instead of the proxy's.
* Set `BASE_URL` to the public origin, with no trailing slash, and
  register `BASE_URL/auth/<provider>/callback` with each social provider.
* Use a `SESSION_SECRET` of at least 32 characters, unique to the
  environment. Startup refuses a shorter one in production. Changing it
  signs everyone out.
* `PORT` is read from the environment, which is what most platforms set.

**HTTPS is assumed in production.** The session cookie is marked
`Secure`, so the site must be served over TLS end to end (directly or
through a proxy with `TRUST_PROXY=true`).

**Health check**

`GET /healthz` returns `200` when MongoDB is connected and `503` when it
is not. It is served before the session and rate-limit middleware, so
probing it neither creates session documents nor consumes a rate-limit
budget.

```json
{ "status": "ok", "database": "connected", "uptimeSeconds": 42 }
```

**Startup and shutdown**

* If MongoDB cannot be reached at boot, the process logs the reason and
  exits `1` rather than serving a broken site. A connection lost *after*
  boot is left to Mongoose to retry.
* Missing or invalid configuration is reported as a list of every
  problem at once, then the process exits `1`.
* `SIGTERM` and `SIGINT` stop new connections, let in-flight requests
  finish, close MongoDB and exit `0`, with a 10-second cap so a stuck
  request cannot block a deploy.

**Caching and assets**

Stylesheets and scripts are served under a content hash
(`/styles/core.css?v=<hash>`) computed at boot, and cached for a year.
A deployed change produces a new URL, so returning visitors are never
left on a stale asset. Other static files are cached for a week, and
every generated page is `private, no-cache`. Responses are gzipped:
the product listing drops from roughly 150 kB to 8 kB on the wire.

## Security

* Passwords are hashed with bcrypt and the hash is never loaded, rendered
  or serialised by default.
* Sessions are stored in MongoDB, the session id is regenerated on sign-in,
  and the cookie is `httpOnly`, `sameSite=lax` and `secure` in production.
* Every state-changing request carries a CSRF token.
* All request input is validated server-side before it reaches a query.
* Security headers, including a Content-Security-Policy, come from Helmet.
* Sign-in, order placement and cart writes are rate limited.
* Errors are handled centrally; stack traces are never sent to the browser
  in production.
* JSON and form bodies are capped at 10 kB.
* A session is only created for a request that can actually use a CSRF
  token, so crawlers and missing-asset requests do not fill the session
  collection.
* Pages are `Cache-Control: private, no-cache` and `Vary: Cookie`, so one
  visitor's page can never be served to another from a shared cache.

## Project Status

This project is under active development.

## 🖊️ Author

**Sadibou Saidy**

GitHub: [TechSadi](https://github.com/TechSadi)
