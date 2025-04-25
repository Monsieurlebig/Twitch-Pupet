#!/bin/bash

# Mettre à jour les dépôts
echo "Mise à jour des dépôts..."
apt-get update -y

# Installer Chromium (si ce n'est pas déjà fait)
echo "Installation de Chromium..."
apt-get install -y chromium-browser

# Vérifier que Chromium est bien installé
if command -v chromium-browser &>/dev/null; then
    echo "Chromium installé avec succès."
else
    echo "❌ Erreur : Chromium n'a pas pu être installé."
    exit 1
fi

# Lancer le script Node.js
echo "Lancement du script Node.js..."
node index.js
