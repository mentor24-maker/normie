# Security policy

## Supported versions

Security fixes are applied to the `main` branch and deployed via Vercel.

## Reporting a vulnerability

Do **not** open a public GitHub issue for security-sensitive reports.

Email the maintainers with:

- A description of the issue and impact
- Steps to reproduce
- Affected URLs or API routes (if applicable)
- Your suggested fix (optional)

We aim to acknowledge reports within a few business days.

## Secret exposure

If Supabase keys or other secrets are committed, pasted in chat, or logged:

1. Rotate the affected keys in Supabase immediately.
2. Update Vercel and local `.env.local`.
3. Redeploy and confirm old keys no longer work.

See `README.md` → **Security: environment secrets** for the rotation checklist.

## Supply chain

- Dependencies are installed with `npm ci` in CI (lockfile required).
- `npm audit --audit-level=high` runs on every pull request.
- Dependabot opens weekly update PRs (Tiptap packages are excluded; upgrade those manually).
