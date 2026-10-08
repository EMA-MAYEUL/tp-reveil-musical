# Réveil musical

Service qui réveille un utilisateur avec un morceau choisi selon la météo du jour, puis le prévient sur son canal préféré
(email, SMS ou push, simulés). TP du cours « Gestion des dépendances, risques et maintenabilité ».

## Lancer le projet

Prérequis : Node.js ≥ 22.

```bash
npm install
npm start                      # http://127.0.0.1:3000
npm test                       # unitaires, contrats, architecture, end-to-end (sans réseau)
npm run coverage               # idem + couverture (seuil : 90 % des lignes)
npm run test:integration       # appelle les vraies API iTunes et MusicBrainz
npm run build                  # vérification des types (tsc strict)
npm run licenses               # audit des licences et de la fraîcheur des dépendances
```

Exemple d'appel (l'ordonnanceur qui le déclenche à l'heure du réveil n'est pas dans le périmètre) :

```bash
curl -X POST http://127.0.0.1:3000/wake-up -H "Content-Type: application/json" \
  -d '{"userId":"alice","dayOfWeek":"LUNDI","weather":"SOLEIL"}'
```

```json
{
  "userId": "alice",
  "track": { "title": "Here Comes the Sun", "artist": "The Beatles" },
  "musicSource": "itunes",
  "channel": "SMS",
  "degraded": { "music": false, "notification": false }
}
```

- `dayOfWeek` : `LUNDI` … `DIMANCHE`. `weather` : `SOLEIL`, `PLUIE`, `NEIGE`, `NUAGEUX`.
- Codes HTTP : 400 si l'entrée est invalide, 404 si l'utilisateur est inconnu.
- Utilisateurs de démonstration : `alice` (SMS), `bob` (email), `chloe` (push), dans `src/infrastructure/users/seedProfiles.ts`.

## Configuration (variables d'environnement, sans recompilation)

| Variable | Défaut | Rôle |
|---|---|---|
| `MUSIC_PROVIDERS` | `itunes,musicbrainz` | Fournisseurs musicaux essayés dans cet ordre, avant la liste locale |
| `NOTIFICATION_FALLBACK` | `EMAIL,PUSH,SMS` | Canaux essayés après le canal préféré, avant le journal de dernier recours |
| `SIMULATED_OUTAGES` | *(vide)* | Canaux simulés en panne, pour démontrer le repli (ex. `SMS,EMAIL`) |
| `PROVIDER_TIMEOUT_MS` | `3000` | Timeout de chaque appel HTTP externe |
| `MUSIC_CACHE_TTL_MS` | `600000` | Durée du cache des recherches de morceaux |
| `MUSICBRAINZ_USER_AGENT` | `tp-reveil-musical/1.0 ( <url du dépôt> )` | User-Agent identifiable exigé par MusicBrainz |
| `ITUNES_BASE_URL`, `MUSICBRAINZ_BASE_URL` | URL publiques | Points d'accès des API |
| `PORT` | `3000` | Port HTTP |

Exemple : `MUSIC_PROVIDERS=musicbrainz SIMULATED_OUTAGES=SMS npm start` utilise MusicBrainz seul et bascule les
utilisateurs SMS sur le canal suivant.

## Architecture

```
src/
  domain/          modèle métier (météo, jour, Track, UserProfile, message) et erreurs. Ne dépend de rien.
  application/     ports (interfaces) + cas d'usage : WakeUpService, TrackResolver, NotificationDispatcher
  infrastructure/  adaptateurs : iTunes, MusicBrainz, cache, liste locale, SDK de notification simulés, utilisateurs
  presentation/    route Fastify POST /wake-up (validation de l'entrée, codes HTTP)
  config.ts        seul fichier qui lit l'environnement
  container.ts     composition root (awilix) : seul fichier qui connaît les implémentations
  main.ts          démarrage
```

Déroulé d'un appel : `WakeUpService` charge le profil (`UserProfileRepository`), choisit la recherche (morceau prévu pour la
météo, sinon morceau de secours), la fait résoudre par `TrackResolver`, construit le message et le confie à
`NotificationDispatcher`.

### Comment les 4 exigences sont tenues

| Exigence | Traduction technique |
|---|---|
| **Musique** : changer vite de fournisseur | Port `MusicCatalog` ; un adaptateur par fournisseur (`ItunesMusicCatalog`, `MusicBrainzMusicCatalog`) qui convertit sa réponse en `Track { title, artist }`. Les DTO (`*.dto.ts`) ne sortent pas de leur dossier, et `trackViewUrl` ne sort pas de l'adaptateur iTunes. Le choix et l'ordre se font dans `MUSIC_PROVIDERS`. Ajouter un fournisseur = un adaptateur + une ligne dans `MUSIC_PROVIDERS` de `container.ts`. |
| **Notification** : canaux multiples et évolutifs | Port `Notifier` commun. Les trois SDK simulés ont volontairement des interfaces différentes (`sendMail({to,subject,html})`, `sendText(phone,text) → boolean`, `push(token,payload) → 'delivered'│'rejected'`) ; un adaptateur par canal les ramène au port. Ajouter WhatsApp = un SDK, un adaptateur, deux lignes dans le conteneur. |
| **Légal** : licence et fraîcheur vérifiées | Section [Dépendances](#dépendances) ci-dessous, produite par `npm run licenses`, `npm audit` et `npm outdated`. |
| **Fiabilité** : jamais de silence | `TrackResolver` essaie les catalogues dans l'ordre, puis la liste locale codée en dur, qui ne peut pas échouer. `NotificationDispatcher` essaie le canal préféré, puis les canaux de repli, puis `LogNotifier` (journal). Chaque appel HTTP a un timeout, et toute erreur réseau devient `ProviderUnavailableError`. Un cache (`CachedMusicCatalog`) limite les appels pour respecter les quotas (iTunes ~20 req/min, MusicBrainz 1 req/s). La réponse signale le mode dégradé (`degraded`). |

### IoC / DI : aucun `new` d'implémentation

Toutes les classes reçoivent leurs dépendances par constructeur et sont construites par le conteneur awilix
(`asClass` / `asFunction` dans `container.ts`) : aucun `new` n'est écrit pour une implémentation. Même `fetch` est injecté
(`httpFetch`), ce qui permet de tester les adaptateurs sans réseau. Seules les erreurs (`new UnknownUserError(...)`) et une
`Map` sont instanciées : ce sont des valeurs, pas des implémentations. Un test d'architecture le vérifie.

## Tests

| Type | Où | Ce qui est vérifié |
|---|---|---|
| Unitaires | `test/application`, `test/infrastructure` | Cas d'usage avec des fakes ; adaptateurs avec un `fetch` fake et des réponses JSON réelles (mapping, HTTP 500, JSON invalide, User-Agent MusicBrainz) ; cache avec une horloge fake |
| Contrat | `test/contracts` | Une même suite jouée sur chaque implémentation d'un port : `MusicCatalog` (iTunes, MusicBrainz, cache) et `Notifier` (email, SMS, push) |
| Architecture | `test/architecture.test.ts` | Le domaine ne dépend de rien ; l'application ne connaît ni l'infrastructure ni les frameworks ; seule la composition root importe l'infrastructure ; aucun DTO ne sort de son dossier ; aucun `new` d'implémentation |
| End-to-end | `test/e2e` | Vrai conteneur et vraie route HTTP via `fastify.inject`, réseau remplacé : cas nominal, changement de fournisseur par configuration, réseau et canal en panne (fallback local + canal de repli), 400, 404, 500 |
| Intégration | `test/integration/*.int.test.ts` | Vraies API iTunes et MusicBrainz, exclues de `npm test` |

Couverture actuelle (`npm run coverage`) : 100 % des lignes et des instructions, 96,8 % des branches.

## Dépendances

Audit du 08/10/2026 (`npm run licenses`, `npm outdated`, `npm audit`). Le produit est propriétaire, donc seules des
licences permissives sont acceptées dans le code livré.

### Packages directs

| Package | Type | Rôle | Licence | Version installée | Dernière stable | Dernière publication |
|---|---|---|---|---|---|---|
| awilix | runtime | Conteneur IoC | MIT | 13.0.5 | 13.0.5 | 2026-06-15 |
| fastify | runtime | Serveur HTTP | MIT | 5.12.5 | 5.12.5 | 2026-10-04 |
| typescript | dev | Typage / vérification | Apache-2.0 | 7.0.2 | 7.0.2 | 2026-10-08 |
| tsx | dev | Exécution TypeScript | MIT | 4.23.15 | 4.23.15 | 2026-09-20 |
| vitest | dev | Tests | MIT | 5.0.3 | 5.0.3 | 2026-09-30 |
| @vitest/coverage-v8 | dev | Couverture | MIT | 5.0.3 | 5.0.3 | 2026-09-30 |
| @types/node | dev | Types de Node | MIT | 22.20.5 | 26.6.4 | 2026-10-01 |

Pas de client HTTP externe : le `fetch` natif de Node 22 suffit.

### Arbre complet (190 packages, transitives comprises)

| Licence | Nombre | Présence en production |
|---|---|---|
| MIT | 145 | Oui (fastify, awilix et leurs dépendances) |
| Apache-2.0 | 23 | Non (outillage dev uniquement) |
| MPL-2.0 | 12 | Non (dev uniquement : `lightningcss`, via `vitest` → `vite`) |
| BSD-3-Clause | 5 | Oui (`fast-uri`, `light-my-request`, `secure-json-parse`, via fastify) |
| ISC | 5 | Oui (`fastq`, `glob-parent`, `semver`, `split2`) |

Aucune licence GPL, AGPL, LGPL, SSPL, BSL ou propriétaire.

### Points qui posent question et justification

- **`lightningcss` (MPL-2.0, copyleft faible)** : tirée par `vitest` → `vite`. Elle sert uniquement aux tests, n'est ni
  modifiée ni distribuée avec le produit. De plus, la MPL-2.0 ne s'applique qu'aux fichiers de la bibliothèque, pas à notre
  code. **Acceptée.**
- **`npm audit` : 4 vulnérabilités « high »** (GHSA-vfj7-8cjw-p6xm, déni de service sur `braces` avec des motifs glob
  très imbriqués). La chaîne est `awilix` → `fast-glob` → `micromatch` → `braces`. Dans awilix, `fast-glob` ne sert qu'à
  `listModules` / `loadModules` (chargement automatique de fichiers, `lib/list-modules.js`), fonctions que nous n'appelons
  jamais : nous enregistrons chaque classe explicitement. Le code vulnérable n'est donc pas atteignable, et aucun motif
  glob ne provient d'une entrée utilisateur. Le « correctif » proposé par `npm audit fix --force` rétrograderait awilix en
  6.0.0 (version majeure ancienne, non maintenue), ce qui est pire. **Risque accepté et documenté ; à réévaluer à chaque
  nouvelle version d'awilix.** En dernier recours, la DI pourrait être faite par une composition root manuelle, puisque
  le métier ne dépend pas d'awilix (aucun décorateur).
- **`@types/node` 22 au lieu de 26** : choix volontaire, les types doivent correspondre au runtime visé (Node 22, version LTS).
  Une version de types plus récente laisserait utiliser des API absentes de Node 22.
- **`typescript` 7.0.2**, publiée le jour de l'audit : c'est une version majeure récente. Elle sert uniquement à la
  vérification des types (`tsc --noEmit`) et n'est pas embarquée en production ; le build passe. À surveiller, avec un
  repli possible en 5.x.

### Services externes

| Service | Conditions | Usage |
|---|---|---|
| iTunes Search API (Apple) | Gratuite, sans clé, ~20 requêtes/min | Recherche de morceaux. Résultats mis en cache ; `trackViewUrl` reste dans l'adaptateur. |
| MusicBrainz API | Gratuite, sans clé ; User-Agent identifiable obligatoire ; 1 requête/s par IP | Recherche de morceaux. User-Agent configurable, résultats en cache. |

Les canaux de notification sont simulés (écriture console) : aucun service tiers.

## Hypothèses

- **Jour de la semaine** : le service interne ne fournit un morceau que par type de météo, le jour sert donc à personnaliser
  le message (« Bon lundi ! »).
- **Coordonnées** (email, téléphone, token push) : absentes de l'énoncé, ajoutées au profil renvoyé par le service interne
  mocké. Si l'information manque pour un canal, ce canal échoue et le canal suivant prend le relais.
- **Morceau choisi** = un terme de recherche, résolu en titre et artiste par le fournisseur. Sans résultat, on passe au
  fournisseur suivant.
- **Panne du service interne d'utilisateurs** : sans profil, on ne sait pas qui réveiller ; l'appel renvoie une erreur 500.
