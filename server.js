const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Dossier où seront stockés les logs
const uploadFolder = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

// Configuration de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    // Nom temporaire, on renomme après lecture
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Servir la page HTML dans /public
app.use(express.static(path.join(__dirname, 'public')));

// Route d'upload avec renommage
app.post('/upload', upload.single('combatlog'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('Aucun fichier reçu');
  }

  const filePath = req.file.path;
  const originalExt = path.extname(req.file.originalname) || '.txt';

  // Lire le contenu du log pour récupérer la 2e ligne
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Erreur lecture fichier :', err);
      return res.status(500).send('Erreur lecture fichier');
    }

    const lignes = data.split(/\r?\n/);
    const ligne2 = lignes[1]; // deuxième ligne
    if (!ligne2) {
      return res.status(400).send('Deuxième ligne introuvable dans le log');
    }

    // Exemple de 2e ligne :
    // 20251213-22:28:09:301,DamageDone,Boule de mana,968862069,116,0,1,kNormalHit,Tipeuz,Calanthia
    const parts = ligne2.split(',');
    if (parts.length < 10) {
      return res.status(400).send('Format de log inattendu (moins de 10 champs)');
    }

    const rawDate = parts[0].trim();   // 20251213-22:28:09:301
    const player  = parts[8].trim();   // Tipeuz, Thealia, etc.
    const boss    = parts[9].trim();   // Calanthia, autre boss

    // Transformer la date pour le nom de fichier :
    // 20251213-22:28:09:301 -> 20251213-222809
    let dateForName = rawDate.replace(/:/g, '').slice(0, 8 + 1 + 6);

    // Construire le nom : date_joueur_boss
    let baseName = `${dateForName}_${player}_${boss}`;

    // Nettoyer le nom de fichier pour Windows
    baseName = baseName.replace(/[<>:"/\\|?*]/g, '_');

    const newFilename = baseName + originalExt;
    const newPath = path.join(path.dirname(filePath), newFilename);

    // Renommer le fichier
    fs.rename(filePath, newPath, (err2) => {
      if (err2) {
        console.error('Erreur renommage fichier :', err2);
        return res.status(500).send('Erreur renommage fichier');
      }

      res.send('Fichier renommé en : ' + newFilename);
    });
  });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
