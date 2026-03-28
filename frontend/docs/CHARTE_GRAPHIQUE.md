# ByteBattle — charte graphique

## Couleurs

| Rôle | Implémentation |
|------|------------------|
| **Marque / accent** | `primary-*` (CTA, liens, onglets actifs) + `sky-*` pour halos/dégradés à opacité (équivalent visuel, requis pour `@apply` Tailwind) |
| **Texte** | `slate-900` / `slate-100` (titres), `slate-600` / `slate-400` (corps — classe `.bb-body-text`) |
| **Surfaces** | `slate-50` fond page clair, `slate-950` fond sombre |
| **Cartes** | `.bb-card`, `.bb-card-interactive` |
| **États** | Succès liés à la marque : `primary-*`. Erreurs : `red-*`. Avertissement : `amber-*`. |

## Classes utilitaires (`src/index.css`, bloc `@layer components`)

Préfixe **`bb-`** : à utiliser pour listes contests, détail contest, blocs réutilisables.

- `.bb-hero-gradient-tall` — halo en tête de page liste contests  
- `.bb-hero-gradient-detail` — halo page détail contest  
- `.bb-title-gradient` — titre principal en dégradé marque  
- `.bb-kicker` — pastille section (ex. « Contests »)  
- `.bb-section-title` — sous-titres de section  
- `.bb-card` / `.bb-card-interactive` — cartes  
- `.bb-tablist`, `.bb-tab-trigger-active` — onglets contests  
- `.bb-lb-aside`, `.bb-lb-pill-active` — leaderboard contest  

## Règles

1. Ne pas introduire `emerald-*`, `indigo-*`, `violet-*` pour l’UI produit — utiliser **`primary-*`** ou les classes **`bb-*`**.  
2. Boutons primaires : `Button` (variant `primary`) = `primary-600`.  
3. Focus clavier : `ring-primary-500`.
