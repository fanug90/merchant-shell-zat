# Merchant Shell

Angular/Nx workspace for the merchant web application. The primary app is a secure merchant shell with Keycloak sign-in, public merchant onboarding, workspace/dashboard screens, and a plugin runtime foundation.

## Application Overview

The workspace is built with:

- Angular 21 standalone components
- Nx 22 project orchestration
- Angular Signals and RxJS for state and async flows
- Keycloak OIDC with PKCE for merchant sign-in
- Typed HTTP services for merchant onboarding and shell APIs
- Shared UI primitives and design tokens

The shell is intentionally thin: it owns authentication, workspace layout, tenant context, navigation, and plugin loading. Business verticals should live in plugins or backend services, not inside the shell.

## Repository Structure

```text
apps/
  merchant-shell/                 Primary Angular merchant workspace
    src/app/
      core/
        auth/                     Login and callback components
        errors/                   Error and maintenance screens
        guards/                   Shell route guards
      features/
        home/                     Secure dashboard
        onboarding/               Public merchant onboarding flow
        plugins/marketplace/      Plugin listing and management surface
        reports/                  MVP route stub
        settings/                 Merchant profile/settings
        transactions/             Transaction list view
      layout/                     Sidebar, topbar, shell layout
      workspace/                  Workspace load service
    src/environments/             Runtime endpoint and auth config

libs/
  auth/                           Keycloak/PKCE auth service and guards
  core-api/                       Typed API clients, interceptors, onboarding models
  plugin-runtime/                 Dynamic plugin host, loader, context token
  shared-ui/                      Standalone UI primitives and styling conventions
  tenant-context/                 Signal-based user, merchant, navigation, plugin state
```

## Important Routes

| Route | Purpose |
| --- | --- |
| `/login` | Public first page with `Sign in` and `Create an account` choices |
| `/onboarding` | Public phone OTP and merchant onboarding flow |
| `/callback` | Keycloak authorization-code callback |
| `/home` | Secured dashboard |
| `/transactions` | Secured core transaction view |
| `/settings` | Secured merchant settings |
| `/plugins` | Secured plugin marketplace/listing |
| `/plugins/:pluginKey` | Secured dynamic plugin host |


## Prerequisites

Install these before running the project:

1. Node.js `>=20.19.0`
2. npm
3. zsh with `nvm` available at `~/.nvm/nvm.sh`

This repo includes:

- `.nvmrc` set to `24.16.0`
- `.node-version` set to `24.16.0`
- npm scripts that run `nvm use` before Nx commands

If you run raw `nx` commands manually, activate the right Node version first:

```sh
nvm use
```

Using Node 16 will fail with errors such as:

```text
structuredClone is not defined
```

## Install Dependencies

From the repository root:

```sh
npm install
```

If this is a clean checkout with a valid lockfile, you can use:

```sh
npm ci
```

## Run Locally

Start the Angular dev server:

```sh
npm run dev
```

The app runs at:

```text
http://127.0.0.1:4200/
```

Recommended entry points:

```text
http://127.0.0.1:4200/login
http://127.0.0.1:4200/onboarding
```

For verbose server output:

```sh
npm run dev:verbose
```

## Authentication Flow

The first screen is `/login`.

- `Sign in` starts the Keycloak authorization-code + PKCE flow.
- Keycloak redirects back to `/callback`.
- `/callback` exchanges the code for tokens.
- Access tokens are kept in memory.
- Only temporary PKCE verifier/state values are stored in `sessionStorage` during the redirect flow.

Current auth config is in:

```text
apps/merchant-shell/src/environments/environment.ts
```

Dashboard and workspace routes are guarded. Unauthenticated users are redirected to `/login`.

## Onboarding Flow

The onboarding feature uses the merchant-service Swagger contract at:

```text
http://62.171.137.149:8082/swagger-ui/index.html
```

Implemented flow:

1. Request phone OTP:
   `POST /v1/onboarding/phone/otp`
2. Verify phone OTP:
   `POST /v1/onboarding/phone/otp/verify`
3. Use the returned onboarding bearer token for protected onboarding steps.
4. Submit business details:
   `POST /v1/onboarding/business-details`
5. Upload KYC document files:
   `POST /v1/merchants/me/kyc/documents`
6. Submit KYC:
   `POST /v1/merchants/me/kyc/submit`
7. Link/select settlement account:
   `POST /v1/merchants/me/bank-accounts`
   `PUT /v1/onboarding/settlement-account`
8. Submit onboarding:
   `POST /v1/onboarding/submit`

The onboarding token is managed separately from the Keycloak shell token.

## API Configuration

Configured in:

```text
apps/merchant-shell/src/environments/environment.ts
```

Current defaults:

```ts
bffBaseUrl: '',
merchantServiceBaseUrl: 'http://62.171.137.149:8082',
coreApiVersion: 'v1',
useMockWorkspace: true,
```

`useMockWorkspace: true` means the secure dashboard can render mock workspace data while BFF integration is still being finalized.

## Common Commands

Run tests:

```sh
npm test
```

This runs:

```sh
nx run-many -t test --projects=merchant-shell,auth,core-api
```

Run Angular compiler checks:

```sh
zsh -lc 'source ~/.nvm/nvm.sh && nvm use >/dev/null && npx ngc -p apps/merchant-shell/tsconfig.app.json'
```

Run lint:

```sh
npm run lint
```

Build:

```sh
npm run build
```

View the Nx project graph:

```sh
npx nx graph
```

## Automated Test Coverage

Current meaningful coverage includes:

- Login page renders the sign-in/create-account choices.
- Sign-in button starts Keycloak login.
- Auth guard blocks unauthenticated dashboard access.
- Auth service handles PKCE callback token exchange.
- Auth service rejects invalid callback state.
- Onboarding OTP endpoint is public.
- Protected onboarding calls attach the onboarding bearer token.
- KYC upload builds multipart requests with Swagger query params.

## Design System Notes

The app follows our Keycloak theme:

- Navy text and shell surfaces
- Ethio green and blue gradient primary actions
- Soft blue/green/purple page background
- White card surfaces with subtle borders/shadows
- Rounded but restrained 8px cards for app content

Global tokens live in:

```text
apps/merchant-shell/src/styles.scss
```

Shared UI primitives live in:

```text
libs/shared-ui/src/lib/
```

## Troubleshooting

### `structuredClone is not defined`

You are running Nx with an old Node version. Run:

```sh
nvm use
```

Then retry the command.

### Browser opens `file://.../app.html`

That bypasses Angular routing and providers. Start the dev server and open:

```text
http://127.0.0.1:4200/login
```

### Port 4200 is already in use

Start on another port with raw Nx:

```sh
nvm use
nx serve merchant-shell --host=127.0.0.1 --port=4300
```

Then open:

```text
http://127.0.0.1:4300/login
```

### Keycloak redirect mismatch

The auth service normalizes `127.0.0.1` to `localhost` for the redirect URI. Make sure the Keycloak client allows:

```text
http://localhost:4200/callback
```

## Development Guidelines

- Keep shell routes thin and platform-oriented.
- Do not add vertical business logic to the shell.
- Keep auth tokens in memory.
- Keep onboarding token handling separate from Keycloak shell auth.
- Add tests for guards, auth flows, and API endpoint contracts when changing those areas.
- Prefer shared UI components and global design tokens over one-off styling.
