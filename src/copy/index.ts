// French is the primary UI language (per project requirements)
// All user-facing strings must be defined here and imported by components

export const EMPTY_STATES = {
  // Ex: noGames: "Aucune partie en cours"
} as const;

export const ERRORS = {
  generic: "Une erreur s'est produite. Veuillez réessayer.",
  network: "Connexion impossible. Vérifiez votre connexion internet.",
  notFound: "Cet élément est introuvable.",
  invalidMove: "Coup invalide.",
  notYourTurn: "Ce n'est pas votre tour.",
} as const;

export const LABELS = {
  // Ex: rollDice: "Lancer le dé"
} as const;

export const NOTIFICATIONS = {
  // Ex: captureSuccess: "Vous avez capturé un pion !"
} as const;

export const PWA_COPY = {
  installTitle: "Installer Ludo Extra",
  installDescription: "Jouez hors-ligne, accédez rapidement depuis votre écran d'accueil.",
  installButton: "Installer",
  dismissButton: "Plus tard",
  iosInstructions: "Appuyez sur le bouton partager puis « Sur l'écran d'accueil ».",
} as const;

// Game-specific copy
export const GAME_COPY = {
  // Ex: bonusRoll: "Lancer bonus !"
} as const;
