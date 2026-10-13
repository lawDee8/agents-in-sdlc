# Guide du site Tagliato Fine

Ce guide explique comment changer les prix, les horaires et les photos, sans aide. Comptez 10 minutes la première fois.

Ce dont vous avez besoin :
- un ordinateur ;
- le logiciel gratuit **FileZilla** (filezilla-project.org) ;
- vos identifiants SFTP alwaysdata (dans votre espace alwaysdata, rubrique **Accès distant → SSH/SFTP**).

## 1. Règles d'or

1. Avant de modifier un fichier, **faites-en une copie** sur votre ordinateur.
2. Les prix s'écrivent **en centimes, sans virgule ni €** : 11,90 € s'écrit `1190`. 4,50 € s'écrit `450`.
3. Un prix inconnu s'écrit `null` : le produit disparaît du site, rien ne casse.
4. Pour cacher un produit un jour (rupture) : `"available": false`. Pour le remontrer : `true`.
5. Si vous cassez le fichier par erreur, le site affiche automatiquement la dernière carte sauvegardée. Personne ne voit de page blanche.

## 2. Changer un prix ou un produit (`data/menu.json`)

1. Dans FileZilla, téléchargez `data/menu.json` sur votre ordinateur.
2. Ouvrez-le avec un éditeur de texte simple (Bloc-notes sur Windows, TextEdit en mode texte brut sur Mac).
3. Trouvez le produit. Exemple :

   ```json
   { "id": "pistacchio", "name": "Pistacchio", "ingredients": "mortadelle, stracciatella, pistache", "prices": { "M": 890, "L": 1190 }, "tags": [], "photo": false, "available": true }
   ```

   - `name` : le nom affiché, tel quel dans les trois langues.
   - `prices` : M et L. Un seul prix ? Écrivez `"price": 650` à la place.
   - Deux prix sans taille, comme la granita : `"prices": [350, 550]` (affiché « 3,50 € / 5,50 € »).
   - `tags` : `"vegetarien"`, `"poisson"` ou `"poulet"`, par exemple `["vegetarien"]`.
   - `id` : un mot unique, sans accent ni espace. Ne le changez plus ensuite.
4. Pour ajouter un produit, copiez un produit existant et changez l'`id`. Séparez les produits par une **virgule**, sauf après le dernier.
5. Supprimez les lignes `"todo"` une fois l'information remplie.

## 3. Vérifier le fichier (obligatoire)

1. Allez sur **jsonlint.com**.
2. Collez tout le contenu du fichier, cliquez **Validate JSON**.
3. Vert = bon. Rouge = le site indique la ligne : souvent une virgule en trop ou en moins, ou un guillemet oublié.

## 4. Envoyer le fichier sur le site

1. Ouvrez FileZilla. Hôte : `sftp://ssh-VOTRECOMPTE.alwaysdata.net`, votre identifiant, votre mot de passe, port 22. Cliquez **Connexion rapide**.
2. À droite (le serveur), ouvrez le dossier du site, puis `data`.
3. Glissez votre `menu.json` depuis la gauche vers la droite. Acceptez **Écraser**.
4. Quand le site vous convient, envoyez aussi une copie sous le nom `menu-sauvegarde.json` : c'est la carte de secours.

## 5. Vérifier sur le téléphone

Ouvrez le site sur votre téléphone, allez sur **La carte**, tirez la page vers le bas pour la recharger. Vérifiez le prix modifié.

## 6. Horaires et fermetures (`data/infos.json`)

- Horaires habituels, par jour, au format 24 h :
  `"monday": [{ "from": "08:00", "to": "22:00" }]`
  Jour de fermeture : `"monday": "closed"`.
- Fermeture ou horaire exceptionnel (jour férié, vacances), dans `special_hours` :

  ```json
  "special_hours": [
    { "date": "2026-12-25", "ranges": "closed", "note": { "fr": "Joyeux Noël", "en": "Merry Christmas", "it": "Buon Natale" } },
    { "date": "2026-12-31", "ranges": [{ "from": "08:00", "to": "17:00" }], "note": null }
  ]
  ```

- Tant que la ligne `"todo"` est présente dans `hours`, le site n'affiche **ni horaires ni « Ouvert »**. Supprimez-la quand les horaires sont justes.
- Le site passe automatiquement en marbre noir quand le café est fermé, en marbre blanc quand il est ouvert.

Vérifiez sur jsonlint.com, puis envoyez dans `data/` comme au point 4.

## 7. Ajouter une photo de produit

1. Prenez la photo à l'horizontale, bien éclairée.
2. Allez sur **squoosh.app**, déposez la photo.
3. À droite : format **WebP**, qualité 75. Dans **Resize**, largeur 1200, hauteur 800.
4. Téléchargez. Renommez le fichier avec l'`id` du produit : `pistacchio.webp`.
5. Envoyez-le dans `img/produits/` avec FileZilla.
6. Dans `menu.json`, mettez `"photo": true` sur ce produit, vérifiez, envoyez.

## 8. Imprimer les cartes de table avec QR code

Les fichiers sont dans le dossier `qr/` :
- `cartes-table-A4-clair.pdf` : fond crème, économise l'encre. **À imprimer soi-même.**
- `cartes-table-A4-sombre.pdf` : fond noir et or, comme les écrans. **Plutôt chez un imprimeur** (papier couché ou satiné 300–350 g/m²), ou à plastifier : un grand aplat noir sur papier ordinaire peut baver ou gondoler.
- `qr-code.svg` et `qr-code.png` : le QR code seul, noir sur blanc, pour un autre support (vitrine, flyer). Ne pas le réduire sous 2 cm.

Pour imprimer :
1. Ouvrez le PDF, Imprimer, choisissez **Taille réelle / 100 %** (jamais « Ajuster à la page »).
2. Papier cartonné 250–300 g/m² seulement si votre imprimante l'accepte (voir sa notice) ; sinon, une boutique de reprographie.
3. **Avant d'imprimer tout le lot :** imprimez une feuille, scannez une carte avec un iPhone et un Android. La page doit s'ouvrir.
4. Coupez sur les petits traits au bord de la feuille. Si un trait n'est pas imprimé : la coupe est à **5 mm à l'extérieur du cadre doré**. Chaque carte mesure 95 × 138 mm (rentre dans un porte-menu A6).

L'adresse cachée dans le QR code est écrite dans `qr/URL.txt`. Une carte imprimée ne peut plus changer d'adresse : si l'adresse du site change, il faut regénérer et réimprimer.

## En cas de problème

Remettez votre copie de sauvegarde (règle d'or n° 1) et appelez le développeur.
