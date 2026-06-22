# Plan d'exécution

Le périmètre demandé est trop large pour une seule passe sans casser le reste. Voici un plan en 5 lots livrables, chacun testable séparément. Je commence par le Lot 0 + Lot 1 dès ton accord, puis j'enchaîne lot par lot après validation visuelle de chacun.

## Lot 0 — Standardisation visuelle (passe globale)

- Supprimer tous les `bg-gradient-*` restants sur les pages connectées (composants AI, dialogues, cartes stats, headers).
- Remplacer les couleurs Tailwind brutes (`text-blue-500`, `bg-purple-600`, `from-green-*`, etc.) par les tokens sémantiques (`primary`, `muted-foreground`, `destructive`, `accent`).
- Conserver les overlays fonctionnels: `WebRTCCall`, `VideoCall`, `GroupVideoCall`, `IncomingCallOverlay`, dégradé sombre bas sur `Reels`, placeholders `LiveStreams`.
- Vérifier que la page d'accueil publique (`Index`, `Auth`) reste intacte.

## Lot 1 — Live & Replay

État cible:
- `/live` liste les streams `live`/`scheduled`/`ended` avec filtres.
- Hôte: démarrer / arrêter un live (caméra + micro via `useWebRTC`), titre, miniature.
- Spectateur: rejoindre un live actif, voir le compteur, commenter.
- Replay: lire l'enregistrement (`recording_url`) pour les streams `ended`.
- RLS: lecture publique pour `public`, restreinte aux participants pour `private`; écriture commentaires uniquement par auth users.

Travaux:
- Audit `live_streams` + `live_stream_comments` (colonnes manquantes: `recording_url`, `recording_enabled`).
- Migration pour ajouter `recording_url`, vérifier policies SELECT/INSERT/UPDATE/DELETE.
- Bucket Storage `recordings` (privé) + policy.
- `LiveStreams.tsx`: onglets En direct / Programmés / Replays + lecteur `<video>` pour replay.
- `useWebRTC`: vérifier reconnexion ICE déjà en place; ajouter callback `onRecordingReady`.

## Lot 2 — Messagerie

- Vérifier `conversations`, `conversation_participants`, `messages`, `message_attachments`, `voice_messages`.
- Corriger les `select` avec join cassés s'il y en a.
- UI: liste conversations, ouverture, envoi texte/fichier/vocal, accusés de lecture, indicateur typing.
- RLS via `is_conversation_participant` (déjà présent) — vérifier que toutes les policies l'utilisent.

## Lot 3 — Marketplace

- CRUD complet `marketplace_listings` (lister, créer, voir, éditer, supprimer, favoris).
- Page détail listing manquante → ajout.
- Permissions: propriétaire seul peut éditer/supprimer.

## Lot 4 — Événements

- CRUD `events`, inscription via `event_attendees`.
- Page détail événement avec liste participants et bouton Participer/Annuler.
- Permissions: créateur seul peut éditer/supprimer.

## Lot 5 — Build & Lint (final)

- `tsc --noEmit` propre, audit linter Supabase, scan sécurité.
- Mise à jour `security-memory` si nécessaire.

## Détails techniques

```text
Lot 0  → 1 passe code, ~10 fichiers       [~10 min]
Lot 1  → migration + 3-4 fichiers UI       [livré + test visuel]
Lot 2  → audit + corrections ciblées        [livré + test visuel]
Lot 3  → 1 nouvelle page + 4 modifs         [livré + test visuel]
Lot 4  → 1 nouvelle page + 3 modifs         [livré + test visuel]
Lot 5  → vérifs auto, pas de UI
```

Migrations DB séparées par lot (approbation requise à chaque fois).

## Ce que je ne ferai pas dans ce cycle

- Pas de refonte graphique nouvelle (charte actuelle conservée).
- Pas de réécriture des modules qui fonctionnent (Profils, Feed, Reels, Groupes) sauf bugs bloquants découverts en route.
- Pas de tests E2E Playwright (deferred — peut être ajouté en Lot 6 si tu veux).

## Démarrage

Si tu valides, j'enchaîne **Lot 0 + Lot 1** immédiatement (standardisation + Live/Replay), puis je m'arrête pour que tu testes le live avant Lot 2.
