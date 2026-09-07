# Amazon Clone — Project Instructions

## Stack

This is a server-side rendered e-commerce application using:

- Node.js
- Express
- EJS
- MongoDB
- Mongoose
- JavaScript
- CSS

Do not migrate the project to React, Next.js, TypeScript, Tailwind, or another stack unless explicitly instructed.

## Architecture

Follow the existing separation of:

- routes
- controllers
- models
- middleware
- services
- utils
- validators
- views
- public assets

Keep controllers focused on request/response handling and move substantial business logic into services when appropriate.

## Code Quality

- Prefer simple, maintainable solutions.
- Avoid unnecessary abstractions.
- Remove duplicated logic.
- Reuse existing utilities and components.
- Do not rewrite working code without a clear reason.
- Keep naming consistent.
- Remove dead code and unused imports.

## Security

- Never hardcode secrets.
- Validate all user-controlled input server-side.
- Protect authenticated resources.
- Prevent users from accessing other users' data.
- Do not expose internal errors or sensitive information.

## Frontend

Prioritize:

- responsive design
- accessibility
- reusable components/partials
- consistent design system
- loading states
- error states
- empty states
- success feedback
- mobile usability

The UI should feel like a polished, professional e-commerce application.

## Important

Before making significant changes:

1. Understand the existing implementation.
2. Identify dependencies.
3. Make changes incrementally.
4. Test affected functionality.
5. Ensure existing functionality is not broken.

Always consider the complete flow:

Browser → Express → Middleware → Controller → Service → Model → MongoDB → EJS → Browser