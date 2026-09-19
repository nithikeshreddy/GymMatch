# Credential rotation and manual history cleanup

## Verified exposure

The audit of all locally available Git refs found credentials in one file:

| File           | Commit containing the file                 | Sensitive contents                                                            | Working tree                                 |
| -------------- | ------------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------- |
| `backend/.env` | `6e968d51753d2b579edf4d49c5666b6326d0c4fc` | PostgreSQL password inside `DATABASE_URL`; JWT signing secret in `JWT_SECRET` | Still present locally, ignored and untracked |

`PORT` and a password-free local `REDIS_URL` were also present; neither is a secret. Commit `2618878` removed the file from tracking, but that commit and `3120497` still have the exposed commit in their ancestry. This audit does not establish that every remote fork, pull-request ref, or cached copy has been inspected. No secret values are recorded here.

Rotate the PostgreSQL role password and the JWT signing secret before any history cleanup. Rotate any other credentials that reused either value. Update the ignored local configuration and any deployed configuration, then restart the backend. Replacing `JWT_SECRET` invalidates existing tokens; users must sign in again. Existing socket connections also require the server restart. Redis did not contain an exposed password in this file.

Rotation and remote cleanup are manual owner actions; neither has been performed by this repository change.

## Manual cleanup commands

First preserve and commit the reviewed source changes and placeholder templates, and make sure the remote contains every intended commit. Do not publish real environment files. Coordinate a pause on pushes before rewriting history. The commands below deliberately use a new clone and leave the existing working tree (including local `.env`) alone.

On macOS, install `git-filter-repo` version 2.47 or newer:

```sh
brew install git-filter-repo
```

From a parent directory, with no existing `GymMatch-history-cleanup.git` directory:

```sh
git clone --mirror https://github.com/nithikeshreddy/GymMatch.git GymMatch-history-cleanup.git
cd GymMatch-history-cleanup.git
git filter-repo --sensitive-data-removal --invert-paths --path backend/.env
git log --all --format='%H' -- backend/.env
git rev-list --objects --all | rg ' backend/\.env$'
```

The last two commands should produce no matches; `rg` exits with status 1 when there are none. The rewrite removes **every historical version of exactly `backend/.env`** from the cloned refs. It preserves `backend/.env.example`, frontend templates, and application files. Affected commit IDs change; now-empty commits may disappear.

Review the filter-repo report and rewritten refs before publishing. Check the remote with `git remote -v`; if filter-repo removed `origin`, restore it:

```sh
git remote add origin https://github.com/nithikeshreddy/GymMatch.git
```

Only after rotation, coordination, and review, publish the rewritten refs manually:

```sh
git push --force --mirror origin
```

This overwrites remote branches/tags and can delete refs absent from the mirror. Do not run it from the development checkout or after others have pushed new work. Branch protections may need a temporary owner-managed exception. GitHub's read-only pull-request refs can be rejected; inspect every rejection rather than treating partial success as complete.

Afterward, re-clone for development and copy only reviewed uncommitted files and newly rotated local configuration if needed. Do not merge old history back. Coordinate cleanup of other clones/forks. GitHub cached views and pull-request references may need GitHub Support where rotation cannot mitigate the exposure. A force push cannot erase other people's copies.

These steps follow [GitHub's sensitive-data removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) and the [git-filter-repo manual](https://github.com/newren/git-filter-repo/blob/main/Documentation/git-filter-repo.txt). No history-rewriting or force-push command is run by CI or the test suite.

## Current-file checks

```sh
git check-ignore backend/.env backend/.env.production frontend/.env.local
git ls-files --error-unmatch backend/.env.example frontend/.env.example
git ls-files -- backend/.env frontend/.env frontend/.env.local
```

The last command must have no output. Templates contain placeholders/public local defaults only. Pattern-based source scans help find credentials but do not prove that every possible secret format is absent; enable GitHub secret scanning/push protection where available.
