# Code Execution (Piston)

The backend uses **Piston** by default for Run/Submit. **Without `PISTON_ENDPOINT` in `.env`**, the default URL is `http://127.0.0.1:2000/api/v2/execute` (local Docker container). If Piston is unavailable **and** local tools are installed on the server, local execution (Node, Python, Java, g++) is used as fallback. Otherwise, a clear error message explains how to start Piston or install required languages.

## Using Piston (remote execution)

### Option 1: Local Piston (Docker, recommended)

#### Windows (PowerShell, from ByteBattle repository root)

1. Install and open **Docker Desktop** (Docker must be in `PATH`).
2. Run:

```powershell
.\scripts\start-piston.ps1
```

Container data is stored in `piston-data/` (gitignored).

3. **Install runtimes** (the container starts without languages). Clone the official Piston repo, then run:

```bash
cd piston/cli && npm i
node index.js -u http://127.0.0.1:2000 ppman install javascript python java c++
```

The backend automatically calls `GET .../runtimes` (derived from `PISTON_ENDPOINT` by removing `/execute`) and picks a compatible version - for example **Node** for JavaScript when a public API also exposes Deno. If the API is unreachable, `languageVersionMap` in `code-execution.service.ts` is used as fallback.

#### Linux / macOS (official repository)

1. Clone and start Piston:

```bash
git clone https://github.com/engineer-man/piston
cd piston
docker-compose up -d api
cd cli && npm i && cd -
```

Then install languages with the CLI (`cli/index.js ppman install ...`) as shown above, or follow the [Piston readme](https://github.com/engineer-man/piston).

2. In your backend `.env`:

```env
PISTON_ENDPOINT=http://127.0.0.1:2000/api/v2/execute
```

No `PISTON_API_KEY` is needed locally.

3. Restart the backend. Runs/submits will use Piston.

### Option 2: emkc.org API (allowlist)

Since February 2026, the public API **https://emkc.org/api/v2/piston/execute** is **often denied** (403 / "whitelist only") without prior approval. To use it, set: `PISTON_ENDPOINT=https://emkc.org/api/v2/piston/execute` and, if required, `PISTON_API_KEY`. In practice, prefer **Option 1 (Docker)**.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PISTON_ENDPOINT` | Execute API URL; code default: `http://127.0.0.1:2000/api/v2/execute` |
| `PISTON_API_KEY` | Optional Bearer key, depending on the instance |
| `CODE_EXECUTION_PREFER_LOCAL` | `true` = try local Node/Python first (if installed) |
| `CODE_EXECUTION_PREFER_PISTON` | `true` / `false` (legacy) to force Piston or local strategy |
| `CODE_EXECUTION_TIMEOUT_MS` | Per-execution timeout in ms (default 15000) |

### Languages and Versions

At run startup, the service calls `GET {base}/runtimes` (e.g. `https://emkc.org/api/v2/piston/runtimes` or `http://localhost:2000/api/v2/runtimes`) and selects a version (Node for JS, GCC for C/C++, etc.).  
`languageVersionMap` remains a **fallback** if `/runtimes` fails (network issue, instance without route).

```bash
curl https://emkc.org/api/v2/piston/runtimes
# or
curl http://localhost:2000/api/v2/runtimes
```

## Local Execution (fallback)

If Piston is unavailable, the service executes code locally using:

- **Node**: stdin simulated through `INPUT` env var and `readline()`.
- **Python**: stdin passed to spawned process.
- **Java**: `Solution.java` or `Main.java` file (auto-detected), stdin passed to process.
- **C++**: `g++` compilation then executable run, stdin passed to process (`.exe` on Windows).

Each test case is executed **once** with its stdin input; output is compared against expected output.
