# --- dependencies ---
FROM node:20-alpine

WORKDIR /app

# Installer dépendances en conservant le cache Docker
COPY package.json package-lock.json* ./
RUN npm ci

# Copier le reste de l'application
COPY . .

# S'assurer que l'utilisateur non-root pourra écrire dans les dossiers générés (ex: .next)
RUN chown -R node:node /app

# Exposer le port utilisé par le serveur Next.js en mode dev
EXPOSE 5173

# Exécuter l'application avec un utilisateur non-root pour éviter les problèmes de permissions côté hôte
USER node

CMD ["npm", "run", "dev"]
