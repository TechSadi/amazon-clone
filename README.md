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

## Deploying

* Set `NODE_ENV=production`. This turns on `secure` session cookies and HSTS.
* Set `TRUST_PROXY=true` if a proxy terminates TLS (Render, Heroku, nginx),
  otherwise the secure cookie is dropped and nobody can sign in.
* Use a `SESSION_SECRET` of at least 32 characters that is unique to the
  environment. Sessions are stored in MongoDB, so changing it signs
  everyone out.
* `npm start` is the start command. Never run `npm run seed` against
  production data.

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

## Project Status

This project is under active development.

## 🖊️ Author

**Sadibou Saidy**

GitHub: [TechSadi](https://github.com/TechSadi)
