# Code Execution (Piston)

Le backend utilise **Piston** par défaut pour Run/Submit. **Sans `PISTON_ENDPOINT` dans `.env`**, l’URL par défaut est `http://127.0.0.1:2000/api/v2/execute` (conteneur Docker local). Si Piston est indisponible **et** que les outils sont présents sur le serveur, l’exécution locale (Node, Python, Java, g++) sert de secours. Sinon un message d’erreur explicite indique de démarrer Piston ou d’installer les langages.

## Utiliser Piston (exécution à distance)

### Option 1 : Piston en local (Docker, recommandé)

#### Windows (PowerShell, depuis la racine du dépôt ByteBattle)

1. Installer et ouvrir **Docker Desktop** (Docker doit être dans le `PATH`).
2. Lancer :

```powershell
.\scripts\start-piston.ps1
```

Les données du conteneur sont dans `piston-data/` (ignoré par Git).

3. **Installer les runtimes** (le conteneur démarre sans langages). Cloner le dépôt officiel Piston, puis :

```bash
cd piston/cli && npm i
node index.js -u http://127.0.0.1:2000 ppman install javascript python java c++
```

Le backend interroge automatiquement `GET …/runtimes` (dérivé de `PISTON_ENDPOINT` en retirant `/execute`) et choisit une version compatible — par ex. **Node** pour JavaScript lorsque l’API publique expose aussi Deno. En secours si l’API est injoignable, `languageVersionMap` dans `code-execution.service.ts` sert de repli.

#### Linux / macOS (dépôt officiel)

1. Cloner et lancer Piston :

```bash
git clone https://github.com/engineer-man/piston
cd piston
docker-compose up -d api
cd cli && npm i && cd -
```

Puis installer les langages avec le CLI (`cli/index.js ppman install …`) comme ci-dessus, ou suivre le [readme Piston](https://github.com/engineer-man/piston).

2. Dans ton `.env` backend :

```env
PISTON_ENDPOINT=http://127.0.0.1:2000/api/v2/execute
```

Pas besoin de `PISTON_API_KEY` en local.

3. Redémarrer le backend. Les runs/submit utiliseront Piston.

### Option 2 : API emkc.org (liste blanche)

Depuis février 2026, l’API publique **https://emkc.org/api/v2/piston/execute** est **souvent refusée** (403 / message « whitelist only ») sans accord préalable. Pour l’utiliser : `PISTON_ENDPOINT=https://emkc.org/api/v2/piston/execute` et, si besoin, `PISTON_API_KEY`. En pratique, préfère **l’option 1 (Docker)**.

### Variables d’environnement

| Variable | Description |
|----------|-------------|
| `PISTON_ENDPOINT` | URL de l’API execute ; défaut code : `http://127.0.0.1:2000/api/v2/execute` |
| `PISTON_API_KEY` | Clé optionnelle (Bearer), selon l’instance utilisée |
| `CODE_EXECUTION_PREFER_LOCAL` | `true` = tenter Node/Python en local en premier (si installés) |
| `CODE_EXECUTION_PREFER_PISTON` | `true` / `false` (legacy) pour forcer Piston ou la logique locale |
| `CODE_EXECUTION_TIMEOUT_MS` | Timeout par exécution en ms (défaut 15000) |

### Langages et versions

Au démarrage d’un run, le service appelle `GET {base}/runtimes` (ex. `https://emkc.org/api/v2/piston/runtimes` ou `http://localhost:2000/api/v2/runtimes`) et sélectionne la version (Node pour JS, GCC pour C/C++, etc.).  
`languageVersionMap` reste le **fallback** si `/runtimes` échoue (réseau, instance sans route).

```bash
curl https://emkc.org/api/v2/piston/runtimes
# ou
curl http://localhost:2000/api/v2/runtimes
```

## Exécution locale (fallback)

Si Piston est indisponible, le service exécute le code en local avec :

- **Node** : stdin simulé via variable `INPUT` et `readline()`.
- **Python** : stdin passé au processus (spawn).
- **Java** : fichier `Solution.java` ou `Main.java` (détecté), stdin passé au processus.
- **C++** : `g++` puis exécutable, stdin passé au processus (`.exe` sur Windows).

Chaque test case est exécuté **une fois** avec son entrée sur stdin ; la sortie est comparée à la sortie attendue.
