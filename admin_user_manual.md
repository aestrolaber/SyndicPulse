# SyndicPulse — Manuel Administrateur

> Version courante · Déploiement : Vercel (auto-deploy sur push `master`)
> URL production : voir tableau de bord Vercel
> Support : support@syndicpulse.ma

---

## Table des matières

1. [Connexion et rôles](#1-connexion-et-rôles)
2. [Tableau de bord](#2-tableau-de-bord)
3. [Finances](#3-finances)
4. [Résidents](#4-résidents)
5. [Litiges](#5-litiges)
6. [Planning](#6-planning)
7. [Assemblées](#7-assemblées)
8. [Utilisateurs (super admin)](#8-utilisateurs-super-admin)
9. [Paramètres du bâtiment](#9-paramètres-du-bâtiment)
10. [Espace Résident (portail transparent)](#10-espace-résident-portail-transparent)
11. [Codes d'accès résidents par bâtiment](#11-codes-daccès-résidents-par-bâtiment)

---

## 1. Connexion et rôles

### Rôles disponibles

| Rôle | Accès | Fonctionnalités spéciales |
|------|-------|--------------------------|
| `super_admin` | Tous les bâtiments | Switcher de bâtiment, onglet Utilisateurs, création de comptes |
| `syndic_manager` | Bâtiment(s) assigné(s) uniquement | Gestion complète de son bâtiment |

### Comptes de démonstration (mode dev)

| Compte | Email | Mot de passe | Bâtiment |
|--------|-------|--------------|----------|
| Super Admin | admin@syndicpulse.ma | admin | Tous |
| Syndic Norwest | omar@norwest.ma | omar | Norwest · Tanger |
| Syndic Atlas | sara@atlas.ma | sara | Résidence Atlas · Casablanca |

### Mot de passe oublié

1. Sur la page de connexion, cliquer **"Mot de passe oublié ?"**
2. Entrer l'adresse e-mail du compte
3. Si le compte existe → un mot de passe temporaire est généré et affiché (à copier et communiquer à l'utilisateur)
4. Si le compte est introuvable → invitation à contacter support@syndicpulse.ma

> **Note** : En production, le mot de passe temporaire sera envoyé par e-mail automatiquement.

---

## 2. Tableau de bord

Vue d'ensemble du bâtiment actif : taux de recouvrement, charges en attente, dépenses du mois, derniers paiements et historique de collecte.

### Switcher de bâtiment (super_admin uniquement)

- Cliquer sur le nom du bâtiment en haut de la barre latérale
- Sélectionner un autre bâtiment dans le menu déroulant
- Toutes les données se mettent à jour instantanément

### Raccourcis rapides

- **Envoyer rappels WhatsApp** → ouvre le draft de message de rappel
- **Voir Finances** → bascule sur l'onglet Finances

---

## 3. Finances

### Vue d'ensemble

- Résumé mensuel : total attendu, total collecté, taux de recouvrement
- Tableau des résidents avec statut de paiement : **À jour** (vert) / **En attente** (amber) / **En retard** (rouge)
- Journal des dépenses : liste des transactions avec catégorie, vendeur, montant et présence de facture

### Enregistrer un paiement

1. Cliquer sur le bouton **"Enregistrer"** à droite d'un résident
2. Choisir le nombre de mois à couvrir : 1 / 2 / 3 / 6 / 12
3. Renseigner (optionnel) : montant, méthode de paiement, date, référence
4. Confirmer → le champ `paidThrough` est avancé automatiquement
5. Si un montant est saisi, un **reçu de paiement** s'ouvre automatiquement dans un nouvel onglet (prêt à imprimer)

### Exporter les finances

- **Excel (CSV)** → fichier `.csv` encodé UTF-8 BOM, séparateur `;` (compatible Excel France/Maroc)
- **PDF** → rapport print-ready s'ouvre dans un nouvel onglet avec `window.print()` automatique

### Modèle de paiement

- Champ `paidThrough: 'YYYY-MM'` = source unique de vérité par résident
- Statut calculé automatiquement par rapport au mois courant (`CURRENT_MONTH`)

---

## 4. Résidents

### Liste des résidents

- Filtres : Tous / Payé / En attente / En retard
- Recherche par nom ou unité
- Badge de statut coloré par résident

### Modifier un résident

1. Cliquer sur la ligne d'un résident → **EditResidentModal**
2. Modifier : nom, téléphone, unité, étage, depuis, quota, paidThrough
3. Cliquer **Confirmer** (bannière cyan) → enregistrer
4. Ou cliquer **Supprimer** (bannière rouge 2 étapes) → supprimer définitivement

### Importer des résidents (CSV)

- Bouton **Importer CSV** dans l'en-tête de la page
- Format attendu : `nom`, `telephone`, `unite`, `etage`, `type`
- Aperçu des 3 premières lignes avant import

---

## 5. Litiges

### Statuts disponibles

| Statut | Couleur | Description |
|--------|---------|-------------|
| Ouvert | Rouge | Litige signalé, en attente de traitement |
| Médiation | Amber | En cours de médiation entre les parties |
| Résolu | Vert | Accord trouvé |
| Clôturé | Gris | Dossier fermé |

### Créer un litige

1. Cliquer **"+ Nouveau litige"**
2. Renseigner : titre, description, parties impliquées, priorité, statut initial
3. Enregistrer

### Modifier / clôturer un litige

1. Cliquer sur un litige → **EditDisputeModal**
2. Modifier les champs, changer le statut
3. Bannière cyan de confirmation avant sauvegarde
4. Supprimer avec bannière rouge (2 étapes de confirmation)

### Filtres et stats

- Barre de filtres : Tous / Ouvert / Médiation / Résolu / Clôturé
- 4 cartes de stats cliquables en haut (clic = filtre automatique)
- Badge rouge sur l'onglet Litiges dans la barre latérale si des litiges sont ouverts

---

## 6. Planning

Kanban drag-and-drop avec 4 colonnes : **Planifié** / **En cours** / **En attente** / **Terminé**

### Créer une tâche

- Bouton **"+ Nouvelle tâche"** dans l'en-tête
- Champs : titre, agent responsable, date, heure, catégorie, priorité

### Catégories de tâches

`nettoyage` · `electricite` · `plomberie` · `ascenseur` · `peinture` · `securite` · `autre`

### Déplacer une tâche

- Glisser-déposer la carte vers une autre colonne
- Ou cliquer la carte → **EditTicketModal** → changer le statut manuellement

---

## 7. Assemblées

Gestion du cycle de vie complet des Assemblées Générales.

### Planifier une AG

1. Cliquer **"+ Planifier une AG"**
2. Renseigner : titre, date, heure, lieu, points à l'ordre du jour
3. Statut initial : **À venir**

### Générer une convocation

1. Sur une AG à venir, cliquer **"Générer convocation"**
2. Un nouvel onglet s'ouvre avec :
   - Notice légale imprimable (conforme Loi 18-00)
   - Message WhatsApp prêt à copier-coller dans le groupe de la résidence
3. Cliquer **Imprimer** ou copier le message WhatsApp

### Générer la feuille de présence

- Tableau imprimable : Unité / Nom / Présent ☐ / Procuration / Signature
- En-tête avec seuil de quorum calculé

### Clôturer une AG et générer le PV

1. Modifier l'AG → changer statut en **"Terminée"**
2. Saisir le nombre de présents et les résultats des votes par point
3. Cliquer **"Voir le PV"** → procès-verbal imprimable généré avec :
   - Résultats de vote par point (Pour / Contre / Abstention + Adopté/Rejeté)
   - Résultat du quorum
   - Blocs de signature (syndic + 2 témoins)

---

## 8. Utilisateurs (super admin)

> Onglet visible uniquement pour le rôle `super_admin`.

### Créer un compte syndic

1. Aller dans **Utilisateurs** → cliquer **"Créer un compte"**
2. Renseigner le nom du syndic (ex : `Norwest`) et le nom complet du gestionnaire
3. L'email est généré automatiquement : `syndic_manager@{slug}.ma`
4. Optionnel : entrer les IDs de bâtiments accessibles (ex : `bld-1, bld-2`)
5. Un mot de passe temporaire est généré
6. Copier les identifiants et les communiquer au gestionnaire de façon sécurisée

### Convention de nommage

- Email toujours au format : `syndic_manager@nomsyndicslug.ma`
- Exemple : syndic "Norwest" → `syndic_manager@norwest.ma`

### Comptes stockés

- Les comptes créés sont persistés dans `localStorage` sous la clé `sp_created_users`
- Ils apparaissent dans la liste avec le badge **Actif** (vs **Démo** pour les comptes initiaux)
- En production : seront stockés dans la base de données Supabase

---

## 9. Paramètres du bâtiment

### Accéder aux paramètres

- Dans la barre latérale, cliquer l'icône ⚙ **Paramètres** en bas

### Modifier un bâtiment

- Nom, ville, gestionnaire
- Logo : upload d'image (PNG/JPG) → stocké en base64, affiché dans tous les documents générés
- Si aucun logo : initiales du bâtiment sur fond coloré (auto-généré)

### Ajouter une nouvelle propriété (super admin)

- Dans la barre latérale, bouton **"+ Ajouter une propriété"**
- Renseigner : nom, ville, adresse, couleur, icône, gestionnaire
- Upload logo optionnel
- La propriété apparaît immédiatement dans le switcher

### Logo dans les documents générés

Le logo (ou les initiales auto-générées) apparaît dans :
- Reçus de paiement
- Export PDF des finances
- Convocations d'AG
- Feuilles de présence
- Procès-verbaux

---

## 10. Espace Résident (portail transparent)

Portail read-only pour les résidents. Accessible depuis la page de connexion.

### Accès résident

1. Sur la page de connexion, cliquer **"Accéder à mon espace résident →"**
2. Entrer le **code de la résidence** + **numéro d'appartement**
3. Si les deux correspondent → portail résident chargé

### Ce que voit le résident

| Section | Données affichées |
|---------|------------------|
| Mon appartement | Unité, étage, depuis, quote-part |
| Mes charges | Statut de paiement, paidThrough |
| Historique 6 mois | Mois payés vs non payés (6 derniers mois) |
| Budget résidence | Taux de recouvrement, fonds de réserve, nb unités |
| Répartition dépenses | Top 4 catégories avec barres de proportion |
| Prochaine AG | Date, heure, lieu, ordre du jour |
| Contact syndic | Boutons E-mail + WhatsApp |

### Ce que le résident ne voit PAS

- Les noms ou statuts de paiement des autres résidents
- Les litiges
- Les tâches planning
- Les données d'autres bâtiments

### Session résident

- Stockée dans `sessionStorage` (disparaît à la fermeture de l'onglet)
- Se déconnecter avec le bouton **"Se déconnecter"** en haut à droite

---

## 11. Codes d'accès résidents par bâtiment

> À communiquer aux résidents par le syndic (WhatsApp, affichage hall, courrier).

| Bâtiment | Code d'accès |
|----------|-------------|
| Norwest · Tanger | `NRWST-2026` |
| Résidence Atlas · Casablanca | `ATLAS-2026` |
| Jardins du Roi · Rabat | `JARDINS-2026` |

Pour les bâtiments ajoutés manuellement, le code est défini dans `src/lib/mockData.js` (champ `accessCode`).

> **Sécurité** : Le code seul ne suffit pas — le résident doit aussi saisir son numéro d'appartement exact. Les deux doivent correspondre pour accéder au portail.

---

## Annexe — Documents générés

Tous les documents sont générés côté client (pas de serveur requis) via `window.open()` + `window.print()`.

| Document | Déclencheur | Contenu |
|----------|-------------|---------|
| Reçu de paiement | Après enregistrement si montant saisi | Bâtiment, résident, montant, méthode, mois couverts |
| Export PDF finances | Bouton PDF dans Finances | Rapport complet : résidents, dépenses, stats |
| Export CSV finances | Bouton Excel dans Finances | Fichier `.csv` UTF-8 BOM pour Excel France |
| Convocation AG | Bouton dans Assemblées | Notice légale + message WhatsApp |
| Feuille de présence | Bouton dans Assemblées | Tableau signataire + quorum |
| Procès-verbal | Bouton dans Assemblées (AG terminée) | Votes, quorum, signatures |

---

*Dernière mise à jour : Mars 2026 · SyndicPulse v1.0*
