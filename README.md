# docker-clean-cli

Smart Docker cleanup tool — analyze and reclaim disk space with safety-first dry-run mode.

## Install

```bash
npm install -g docker-clean-cli
# or use directly:
npx docker-clean-cli
```

## Usage

```bash
# Show disk usage analysis (safe, read-only)
npx docker-clean-cli

# Remove all safe-to-clean items (dangling images, stopped containers, unused volumes/networks)
npx docker-clean-cli --clean

# Selective cleanup
npx docker-clean-cli --images        # dangling images only
npx docker-clean-cli --containers    # stopped containers only
npx docker-clean-cli --volumes       # unused volumes only

# Nuclear option: everything including build cache
npx docker-clean-cli --all

# Age-based filtering
npx docker-clean-cli --clean --older-than 7d    # only items older than 7 days
npx docker-clean-cli --clean --older-than 24h   # older than 24 hours
npx docker-clean-cli --clean --older-than 2w    # older than 2 weeks

# Dry-run: preview what would be deleted
npx docker-clean-cli --clean --dry-run

# JSON output for scripting
npx docker-clean-cli --json
npx docker-clean-cli --clean --json
```

## Safety

- **Dry-run is the default.** Running without `--clean` or `--all` only shows analysis.
- Default networks (`bridge`, `host`, `none`) are never touched.
- Running containers are never removed.
- Volumes in use by containers are never removed.

## What gets cleaned

| Flag | Cleans |
|------|--------|
| `--containers` | Stopped/exited containers |
| `--images` | Dangling (untagged) images |
| `--volumes` | Volumes not attached to any container |
| `--networks` | Custom networks not in use |
| `--all` | All of the above + build cache |
| `--clean` | Containers + images + volumes (no cache) |

## License

MIT © [okirmio-create](https://github.com/okirmio-create)
