// ---------- INITIALISATION FIREBASE ----------
const firebaseConfig = {
  apiKey: "…",
  authDomain: "…",
  projectId: "…",
  // …
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ---------- GESTION ONGLETS ----------
const tabs     = document.querySelectorAll('.nav-tab');
const sections = document.querySelectorAll('.tab-content');

tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    // 1) activer le bon onglet
    tabs.forEach(b => b.classList.remove('nav-active'));
    btn.classList.add('nav-active');
    // 2) afficher la bonne section
    const cible = btn.dataset.tab;
    sections.forEach(sec => {
      sec.id === cible
        ? sec.classList.remove('hidden')
        : sec.classList.add('hidden');
    });
    // 3) charger les données si besoin
    if (cible === 'performance') afficherConcessionnaires();
    if (cible === 'visite')      afficherVisites();
  });
});

// ---------- AU DEMARRAGE ----------
document.addEventListener('DOMContentLoaded', () => {
  // Onglet par défaut : Accueil
  document.querySelector('.nav-active').click();
});

// ---------- FONCTIONS À INTÉGRER ----------
function afficherConcessionnaires() {
  // TODO : récupérer / afficher les concessionnaires Firestore
}

function afficherVisites() {
  // TODO : récupérer / afficher les visites Firestore
}
