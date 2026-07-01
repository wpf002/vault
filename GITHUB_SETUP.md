# GitHub Repo Setup

Run these once, from the directory where you want the project to live.

## 1. Create the repo on GitHub

Create an **empty private repo** named `vault` under your account (`wpf002`).
Do NOT initialize it with a README, .gitignore, or license — the bootstrap script provides those, and an initialized remote will force a merge on first push.

## 2. Initialize locally

```bash
# from the parent folder where you want ./vault to live
bash bootstrap.sh          # scaffolds the whole monorepo into ./vault (see 02-bootstrap.sh)
cd vault
```

## 3. Wire up git and push

```bash
git init
git branch -M main
git add -A
git commit -m "chore: scaffold vault platform shell (monorepo, no app code yet)"
git remote add origin git@github.com:wpf002/vault.git
git push -u origin main
```

If you use HTTPS instead of SSH:

```bash
git remote add origin https://github.com/wpf002/vault.git
```

## 4. Verify

```bash
git remote -v          # should show origin -> wpf002/vault (fetch + push)
git log --oneline      # should show the scaffold commit
```

## Notes

- The scope is `@vault/*` as a **placeholder**. When you lock a real name, it's a
  find-replace across `package.json` files + `pnpm-workspace.yaml` + imports. Do it
  before you point a domain at anything; after that it's a versioning headache.
- `.env` is gitignored. `.env.example` is committed. Never commit real secrets.
