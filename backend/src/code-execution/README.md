# Code Execution (Piston)

Le backend utilise **Piston** pour l’exécution de code à distance. Si Piston est indisponible, l’exécution locale (Node, Python, Java, g++) est utilisée en secours.

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

Vérifie les versions avec `GET http://localhost:2000/api/v2/runtimes` et aligne-les si besoin avec `languageVersionMap` dans `code-execution.service.ts`.

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
PISTON_ENDPOINT=http://localhost:2000/api/v2/execute
CODE_EXECUTION_PREFER_PISTON=true
```

Pas besoin de `PISTON_API_KEY` en local.

3. Redémarrer le backend. Les runs/submit utiliseront Piston.

### Option 2 : API publique (emkc.org)

L’URL par défaut est `https://emkc.org/api/v2/piston/execute`.  
Si cette API exige une clé (ex. 401) :

- Renseigner `PISTON_API_KEY` dans `.env` si tu as une clé.
- Sinon, utiliser l’option 1 (Piston en Docker).

### Variables d’environnement

| Variable | Description |
|----------|-------------|
| `PISTON_ENDPOINT` | URL de l’API execute (ex. `http://localhost:2000/api/v2/execute`) |
| `PISTON_API_KEY` | Clé optionnelle (Bearer), selon l’instance utilisée |
| `CODE_EXECUTION_TIMEOUT_MS` | Timeout par exécution en ms (défaut 15000) |

### Langages et versions

Les runtimes sont définis dans `code-execution.service.ts` (`languageVersionMap`).  
Pour une instance Piston auto-hébergée, les versions disponibles sont listées par :

```bash
curl http://localhost:2000/api/v2/runtimes
```

Ajuste `languageVersionMap` si besoin pour correspondre à ces runtimes.

## Exécution locale (fallback)

Si Piston est indisponible, le service exécute le code en local avec :

- **Node** : stdin simulé via variable `INPUT` et `readline()`.
- **Python** : stdin passé au processus (spawn).
- **Java** : fichier `Solution.java` ou `Main.java` (détecté), stdin passé au processus.
- **C++** : `g++` puis exécutable, stdin passé au processus (`.exe` sur Windows).

Chaque test case est exécuté **une fois** avec son entrée sur stdin ; la sortie est comparée à la sortie attendue.
