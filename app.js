// NOTE : Le `defer` dans le tag <script> de l'HTML remplace le besoin
// d'écouter l'événement 'DOMContentLoaded'. Le code s'exécute quand le document est prêt.

// 1. INITIALISATION FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDBFGDo2IEpSUqHNCxwZWBAUZxa8Lq5VpE",
    authDomain: "crm-dealer-mathieu.firebaseapp.com",
    projectId: "crm-dealer-mathieu",
    storageBucket: "crm-dealer-mathieu.firebasestorage.app",
    messagingSenderId: "99774542996",
    appId: "1:99774542996:web:59457e2166c9646a54f081"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. SÉLECTION DES ÉLÉMENTS DU DOM
const navContainer = document.querySelector('.crm-nav');
const mainContent = document.querySelector('.crm-main');
const performanceBody = document.getElementById('performance-body');
const visitesBody = document.getElementById('visites-body');
const searchInput = document.getElementById('search-input');
const yearSelect = document.getElementById('year-select');
const notesOverlay = document.getElementById('notes-overlay');
const infoOverlay = document.getElementById('info-overlay');
const visitHistoryOverlay = document.getElementById('visit-history-overlay');

// 3. ÉTAT DE L'APPLICATION
const state = {
    concessionnaires: [],
    selectedYear: new Date().getFullYear(),
    searchTerm: '',
    currentConcessionnaireId: null,
    flatpickrInstances: {},
};

const moisKeys = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];

// 4. FONCTIONS UTILITAIRES
const handleError = (op, error) => console.error(`Erreur durant ${op}: `, error);
const calcTotal = (r = {}) => moisKeys.reduce((s, m) => s + (parseFloat(r[m]) || 0), 0);
const calcMoyenne = (r = {}) => {
    const v = moisKeys.map(m => parseFloat(r[m]) || 0).filter(n => n > 0);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
};
const getDaysSince = (d) => {
    if (!d) return '–';
    const t = new Date(); t.setHours(0,0,0,0);
    const v = new Date(d); v.setHours(0,0,0,0);
    return Math.max(0, Math.round((t - v) / 86400000));
};

// 5. FONCTIONS DE RENDU
const renderAll = () => {
    try {
        Object.values(state.flatpickrInstances).forEach(fp => fp.destroy());
        state.flatpickrInstances = {};
        renderPerformance();
        renderVisites();
    } catch (e) { handleError('renderAll', e); }
};

const renderPerformance = () => {
    performanceBody.innerHTML = '';
    const currentYear = state.selectedYear;
    const previousYear = currentYear - 1;
    document.getElementById('header-year-total').textContent = currentYear;
    document.getElementById('header-year-moyenne').textContent = currentYear;
    document.getElementById('header-year-diff').textContent = `${previousYear}-${currentYear}`;
    let idx = 1, monthlySums = Array(12).fill(0);
    
    const concessionnairesFiltres = [...state.concessionnaires]
      .filter(doc => doc.data && doc.data[currentYear])
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'))
      .filter(doc => (doc.nom || '').toLowerCase().includes(state.searchTerm.toLowerCase()));

    concessionnairesFiltres.forEach(doc => {
        const dataForYear = doc.data[currentYear] || {};
        const revenus = dataForYear.revenus || {};
        const tot = calcTotal(revenus), moy = calcMoyenne(revenus);
        moisKeys.forEach((m, i) => monthlySums[i] += (parseFloat(revenus[m]) || 0));
        const prevMoy = dataForYear.moyennePrecedente || 0;
        const varPct = prevMoy ? Math.round(((moy - prevMoy) / prevMoy) * 100) : 0;
        const taux = dataForYear.tauxReclamation || 0;
        
        let tauxBg = 'var(--color-success-bg)', tauxColor = 'var(--color-success-text)';
        if (taux >= 41) { tauxBg = 'var(--color-danger-bg)'; tauxColor = 'var(--color-danger-text)'; }
        else if (taux >= 30) { tauxBg = 'var(--color-warning-bg)'; tauxColor = 'var(--color-warning-text)';}
        
        const tr = document.createElement('tr');
        tr.dataset.id = doc.id;
        tr.innerHTML = `<td>${idx++}</td><td><button class="info-btn" aria-label="Infos">ℹ️</button></td><td><input type="text" class="input-underline name-cell" data-field="nom" value="${doc.nom || ''}" placeholder="Saisir nom..."></td><td><div class="taux-wrapper"><input type="number" class="taux-input-badge" data-field="tauxReclamation" value="${taux}" style="background-color:${tauxBg}; color:${tauxColor}; border-color:${tauxBg};"><span class="sign">%</span></div></td>${moisKeys.map(m => `<td><div class="currency-wrapper"><input type="text" class="input-underline month-cell" data-month="${m}" value="${(revenus[m] !== undefined && revenus[m] !== null) ? revenus[m].toLocaleString('fr-FR') : ''}" placeholder="-"><span class="sign">$</span></div></td>`).join('')}<td><span class="total-badge">${Math.round(tot).toLocaleString('fr-FR')} $</span></td><td><span class="total-badge yellow">${Math.round(moy).toLocaleString('fr-FR')} $</span></td><td><div class="currency-wrapper"><input type="text" class="input-underline prev-cell" data-field="moyennePrecedente" value="${prevMoy || ''}" placeholder="-"><span class="sign">$</span></div></td><td><div class="diff-badge" style="background-color:${varPct >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)'}; color:${varPct >= 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)'};">${varPct > 0 ? '+' : ''}${varPct}%</div></td><td class="actions-cell"><button class="notes-btn" aria-label="Notes">📝</button><button class="btn-delete" aria-label="Supprimer">❌</button></td>`;
        performanceBody.appendChild(tr);
    });
    const trTot = document.createElement('tr');
    trTot.className = 'totals-row';
    trTot.innerHTML = `<td colspan="4">Totaux / Moyennes :</td>${monthlySums.map(s => `<td>${Math.round(s).toLocaleString('fr-FR')} $</td>`).join('')}<td colspan="5"></td>`;
    performanceBody.appendChild(trTot);
};

const renderVisites = () => {
    visitesBody.innerHTML = '';
    const concessionnairesFiltres = [...state.concessionnaires]
        .filter(doc => doc.data && doc.data[state.selectedYear])
        .filter(doc => (doc.nom || '').toLowerCase().includes(state.searchTerm.toLowerCase()))
        .sort((a, b) => {
            const dataForYearB = b.data ? (b.data[state.selectedYear] || {}) : {};
            const moyenneB = calcMoyenne(dataForYearB.revenus);
            const dataForYearA = a.data ? (a.data[state.selectedYear] || {}) : {};
            const moyenneA = calcMoyenne(dataForYearA.revenus);
            return moyenneB - moyenneA;
        });

    concessionnairesFiltres.forEach(doc => {
        const dataForYear = doc.data[state.selectedYear] || {};
        const moy = calcMoyenne(dataForYear.revenus);
        const visites = doc.visites || [];
        const lastVisit = visites.length > 0 ? visites.sort().slice(-1)[0] : '';
        const daysSince = getDaysSince(lastVisit);
        const taux = dataForYear.tauxReclamation || 0;
      
        let tauxBg = 'var(--color-success-bg)', tauxColor = 'var(--color-success-text)';
        if (taux >= 41) { tauxBg = 'var(--color-danger-bg)'; tauxColor = 'var(--color-danger-text)'; }
        else if (taux >= 30) { tauxBg = 'var(--color-warning-bg)'; tauxColor = 'var(--color-warning-text)';}
      
        let moyBg = 'var(--color-danger-bg)', moyColor = 'var(--color-danger-text)';
        if (moy >= 15000) { moyBg = 'var(--color-success-bg)'; moyColor = 'var(--color-success-text)';}
        else if (moy >= 5000) { moyBg = 'var(--color-warning-bg)'; moyColor = 'var(--color-warning-text)';}
      
        let daysClass = '';
        if (daysSince !== '–') {
            if (daysSince <= 60) { daysClass = 'success'; }
            else if (daysSince <= 90) { daysClass = 'warning';}
            else { daysClass = 'danger'; }
        }
      
        const tr = document.createElement('tr');
        tr.dataset.id = doc.id;
      
        const historyButtonHtml = visites.length > 2 ? `<button class="visit-history-btn" aria-label="Voir l'historique">+${visites.length - 2}</button>` : (visites.length > 0 ? `<button class="visit-history-btn" aria-label="Voir l'historique">...</button>` : '');
        
        tr.innerHTML = `<td><div class="static-badge" style="background-color:${tauxBg}; color:${tauxColor};">${taux}%</div></td>
            <td>${doc.nom || ''}</td>
            <td><div class="static-badge" style="background-color:${moyBg}; color:${moyColor};">${Math.round(moy).toLocaleString('fr-FR')}$</div></td>
            <td class="visit-cell">
                <div class="visit-cell-buttons">
                    <button class="btn-today" aria-label="Aujourd'hui" title="Visite aujourd'hui">🕒</button>
                    <button class="btn-calendar" aria-label="Choisir une date" title="Ajouter une visite">📅</button>
                    ${historyButtonHtml}
                </div>
            </td>
            <td class="days-cell ${daysClass}">${daysSince}</td>
            <td><button class="btn-agenda" aria-label="Créer un événement dans Google Agenda">AGENDA</button></td>
            <td class="actions-cell">
                <button class="notes-btn" aria-label="Notes">📝</button>
                <button class="btn-delete" aria-label="Supprimer les données de l'année">❌</button>
            </td>`;
        visitesBody.appendChild(tr);

        const calendarBtn = tr.querySelector('.btn-calendar');
        if (calendarBtn) {
            state.flatpickrInstances[doc.id] = flatpickr(calendarBtn, {
                maxDate: "today",
                onChange: async (selectedDates) => {
                    if (!selectedDates.length) return;
                    const newDate = selectedDates[0].toISOString().slice(0, 10);
                    try {
                        await db.collection('concessionnaires').doc(doc.id).update({ visites: firebase.firestore.FieldValue.arrayUnion(newDate) });
                        await fetchDataAndRender();
                    } catch (e) { handleError('Mise à jour visite', e); }
                }
            });
        }
    });
};

// 6. GESTION DES MODALES
function addDFRow(container, name = '', email = '') {
    const div = document.createElement('div');
    div.className = 'info-group df-group';
    div.innerHTML = `<label>Directeur financier</label><input type="text" class="df-name" value="${name}" placeholder="Nom du directeur financier"/><input type="email" class="df-email" value="${email}" placeholder="Adresse e-mail du directeur financier"/><button type="button" class="df-delete-btn" aria-label="Supprimer Directeur financier">❌</button>`;
    container.appendChild(div);
}

async function openNotesModal(id) {
    state.currentConcessionnaireId = id;
    try {
        const docSnap = await db.collection('concessionnaires').doc(id).get();
        if (!docSnap.exists) return;
        const c = docSnap.data();
        document.getElementById('notes-title').textContent = `Notes – ${c.nom || 'N/A'}`;
        const list = document.getElementById('notes-list');
        list.innerHTML = '';
        if (c.notes && c.notes.length > 0) {
            c.notes.sort((a,b) => b.date.localeCompare(a.date)).forEach(note => {
                const div = document.createElement('div');
                div.className = 'note-item';
                div.textContent = `[${note.date}] ${note.text}`;
                list.appendChild(div);
            });
        } else { list.innerHTML = '<p>Aucune note.</p>'; }
        document.getElementById('notes-input').value = '';
        notesOverlay.classList.remove('hidden');
    } catch(e) { handleError('openNotesModal', e); }
}

async function openInfoModal(id) {
    state.currentConcessionnaireId = id;
    try {
        const docSnap = await db.collection('concessionnaires').doc(id).get();
        if (!docSnap.exists) return;
        const d = docSnap.data() || {};
        document.getElementById('info-title').textContent = `Infos – ${d.nom || 'N/A'}`;
        const modalBody = document.getElementById('info-modal-body');
        modalBody.innerHTML = `<div class="info-group"><label>Propriétaire :</label><input type="text" id="info-owner" value="${d.owner || ''}" placeholder="Nom du propriétaire"/><input type="email" id="info-owner-email" value="${d.ownerEmail || ''}" placeholder="Adresse e-mail du propriétaire"/></div>
            <div class="info-group"><label>Directeur de service :</label><input type="text" id="info-ds" value="${d.ds || ''}" placeholder="Nom du directeur de service"/><input type="email" id="info-ds-email" value="${d.dsEmail || ''}" placeholder="Adresse e-mail du directeur de service"/></div>
            <div class="info-group"><label>Administration :</label><input type="text" id="info-admin" value="${d.admin || ''}" placeholder="Nom de l'administration"/><input type="email" id="info-admin-email" value="${d.adminEmail || ''}" placeholder="Adresse e-mail de l'administration"/></div>
            <div id="df-container"></div>
            <button type="button" id="add-df-btn">➕ Ajouter Directeur financier</button>
            <button id="info-save" class="modal-save">Sauvegarder</button>`;
        const dfContainer = modalBody.querySelector('#df-container');
        (d.financiers || []).forEach(f => addDFRow(dfContainer, f.name, f.email));
        infoOverlay.classList.remove('hidden');
    } catch(e) { handleError('openInfoModal', e); }
}

async function openVisitHistoryModal(id) {
    state.currentConcessionnaireId = id;
    const c = state.concessionnaires.find(doc => doc.id === id);
    if (!c) return;
    document.getElementById('visit-history-title').textContent = `Historique des visites – ${c.nom || 'N/A'}`;
    const list = document.getElementById('visit-history-list');
    list.innerHTML = '';
    const visites = c.visites || [];
    if (visites.length > 0) {
        visites.sort().reverse().forEach(v => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `<span>${v}</span><button class="btn-delete-visit" data-date="${v}">❌</button>`;
            list.appendChild(div);
        });
    } else { list.innerHTML = '<p>Aucune visite enregistrée.</p>'; }
    visitHistoryOverlay.classList.remove('hidden');
}

async function saveNotes() {
    const text = document.getElementById('notes-input').value.trim();
    if (!text || !state.currentConcessionnaireId) return;
    try {
        const newNote = { date: new Date().toISOString().slice(0, 10), text };
        await db.collection('concessionnaires').doc(state.currentConcessionnaireId).update({
            notes: firebase.firestore.FieldValue.arrayUnion(newNote)
        });
        await openNotesModal(state.currentConcessionnaireId); // Refresh modal content
    } catch(e) { handleError('saveNotes', e); }
}

async function saveInfo() {
    if (!state.currentConcessionnaireId) return;
    const financiers = Array.from(document.querySelectorAll('#df-container .df-group')).map(group => ({
        name: group.querySelector('.df-name').value.trim(),
        email: group.querySelector('.df-email').value.trim()
    })).filter(f => f.name || f.email);
    const dataToSave = {
        owner: document.getElementById('info-owner').value.trim(), ownerEmail: document.getElementById('info-owner-email').value.trim(),
        ds: document.getElementById('info-ds').value.trim(), dsEmail: document.getElementById('info-ds-email').value.trim(),
        admin: document.getElementById('info-admin').value.trim(), adminEmail: document.getElementById('info-admin-email').value.trim(),
        financiers
    };
    try {
        await db.collection('concessionnaires').doc(state.currentConcessionnaireId).set(dataToSave, { merge: true });
        await fetchDataAndRender();
        infoOverlay.classList.add('hidden');
    } catch(e) { handleError('saveInfo', e); }
}

// 7. GESTION DES DONNÉES
async function fetchDataAndRender() {
    try {
        const snapshot = await db.collection('concessionnaires').get();
        state.concessionnaires = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAll();
    } catch (e) { handleError('fetchData', e); }
}
  
function handleImport(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();

    reader.onload = async (e) => {
        const lines = e.target.result.split('\n');
        const dataLines = lines.slice(1).filter(line => line.trim() !== '');
        const batch = db.batch();

        dataLines.forEach(line => {
            const values = line.split(';');
            let i = 0;
            const docData = {
                nom: values[i++] || '',
                owner: values[i++] || '',
                ownerEmail: values[i++] || '',
                ds: values[i++] || '',
                dsEmail: values[i++] || '',
                admin: values[i++] || '',
                adminEmail: values[i++] || '',
                data: {
                    [state.selectedYear]: {
                        tauxReclamation: parseFloat(values[i++]) || 0,
                        moyennePrecedente: parseFloat(values[i++]) || 0,
                        revenus: {}
                    }
                },
                financiers: [],
                notes: [],
                visites: []
            };

            moisKeys.forEach(key => {
                const revenu = parseFloat(values[i++]);
                if (!isNaN(revenu)) {
                    docData.data[state.selectedYear].revenus[key] = revenu;
                }
            });

            try { docData.financiers = JSON.parse(values[i++] || '[]'); } catch(err) { docData.financiers = []; }
            try { docData.notes = JSON.parse(values[i++] || '[]'); } catch(err) { docData.notes = []; }
            try { docData.visites = JSON.parse(values[i++] || '[]'); } catch(err) { docData.visites = []; }

            const newDocRef = db.collection('concessionnaires').doc();
            batch.set(newDocRef, docData, { merge: true });
        });

        try {
            await batch.commit();
            alert(`${dataLines.length} concessionnaire(s) importé(s) avec succès !`);
            fetchDataAndRender();
        } catch (err) {
            handleError('batch.commit', err);
            alert("Une erreur est survenue lors de l'importation. Vérifiez la console pour plus de détails.");
        }
    };
    reader.readAsText(file, "ISO-8859-1");
}

async function handleExport() {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    const headers = [
        "nom", "proprietaire_nom", "proprietaire_email", "directeur_service_nom", "directeur_service_email", 
        "admin_nom", "admin_email", "taux_reclamation", "moyenne_precedente", 
        ...moisKeys, 
        "financiers_json", "notes_json", "visites_json"
    ];
    csvContent += headers.join(";") + "\r\n";

    state.concessionnaires
        .forEach(doc => {
            const dataForYear = doc.data ? (doc.data[state.selectedYear] || {}) : {};
            const clean = (str) => (str || '').toString().replace(/;/g, ',').replace(/\r?\n|\r/g, ' ');

            const rowData = [
                clean(doc.nom),
                clean(doc.owner),
                clean(doc.ownerEmail),
                clean(doc.ds),
                clean(doc.dsEmail),
                clean(doc.admin),
                clean(doc.adminEmail),
                dataForYear.tauxReclamation || 0,
                dataForYear.moyennePrecedente || 0,
                ...moisKeys.map(m => (dataForYear.revenus ? dataForYear.revenus[m] : 0) || 0),
                JSON.stringify(doc.financiers || []),
                JSON.stringify(doc.notes || []),
                JSON.stringify(doc.visites || [])
            ];
            
            const row = rowData.join(";");
            csvContent += row + "\r\n";
        });
        
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `export_complet_${state.selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 8. GESTION DES ÉVÉNEMENTS
function setupEventListeners() {
    navContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.nav-tab');
        if (target) {
            document.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
            document.getElementById(target.dataset.tab).classList.remove('hidden');
            navContainer.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('nav-active'));
            target.classList.add('nav-active');
        }
    });
    yearSelect.addEventListener('change', () => { state.selectedYear = parseInt(yearSelect.value); renderAll(); });
    searchInput.addEventListener('keyup', () => { state.searchTerm = searchInput.value; renderAll(); });
    document.getElementById('add-concessionnaire').addEventListener('click', async () => {
        try {
            await db.collection('concessionnaires').add({ nom: "", data: { [state.selectedYear]: { moyennePrecedente: 0, revenus:{}, tauxReclamation: 0 } }, visites: [], notes: [] });
            fetchDataAndRender();
        } catch (err) { handleError('addConcessionnaire', err); }
    });
    document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change', handleImport);
    document.getElementById('btn-export').addEventListener('click', handleExport);

    mainContent.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button || button.closest('.modal-container')) return;
        const tr = button.closest('tr');
        if (!tr || !tr.dataset.id) return;
        const id = tr.dataset.id;
        const concessionnaire = state.concessionnaires.find(c => c.id === id);
        if (!concessionnaire) return;
        if (button.matches('.info-btn')) openInfoModal(id);
        else if (button.matches('.notes-btn')) openNotesModal(id);
        else if (button.matches('.visit-history-btn')) openVisitHistoryModal(id);
        else if (button.matches('.btn-calendar')) { if (state.flatpickrInstances[id]) state.flatpickrInstances[id].open(); }
        else if (button.matches('.btn-today')) {
            await db.collection('concessionnaires').doc(id).update({ visites: firebase.firestore.FieldValue.arrayUnion(new Date().toISOString().slice(0, 10)) });
            await fetchDataAndRender();
        }
        else if (button.matches('.btn-agenda')) {
            const now = new Date(), later = new Date(now.getTime() + 3600000);
            const toGoogleISO = d => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
            window.open(`https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(`Visite - ${concessionnaire.nom}`)}&dates=${toGoogleISO(now)}/${toGoogleISO(later)}`, '_blank');
        }
        else if (button.matches('.btn-delete')) {
            const nomConcessionnaire = concessionnaire.nom || "ce concessionnaire";
            if (confirm(`Êtes-vous sûr de vouloir supprimer les données de l'année ${state.selectedYear} pour ${nomConcessionnaire} ?`)) {
                const fieldToDelete = `data.${state.selectedYear}`;
                const docRef = db.collection('concessionnaires').doc(id);
                await docRef.update({ [fieldToDelete]: firebase.firestore.FieldValue.delete() });
                const updatedDocSnap = await docRef.get();
                if (updatedDocSnap.exists) {
                    const updatedData = updatedDocSnap.data();
                    if (!updatedData.data || Object.keys(updatedData.data).length === 0) {
                        if(confirm(`C'était la dernière année de données pour ${nomConcessionnaire}. Supprimer complètement ce concessionnaire ?`)) {
                            await docRef.delete();
                        }
                    }
                }
                fetchDataAndRender();
            }
        }
    });
    
    mainContent.addEventListener('change', async (e) => {
        const input = e.target;
        if (input.tagName !== 'INPUT' || !input.closest('tr')) return;
        const tr = input.closest('tr');
        const id = tr.dataset.id;
        if (!id) return;
        
        let fieldPath;
        let value = input.value;
        const field = input.dataset.field;

        if (field === 'nom') { fieldPath = 'nom'; }
        else if (field === 'tauxReclamation') { fieldPath = `data.${state.selectedYear}.tauxReclamation`; value = parseFloat(value) || 0; }
        else if (field === 'moyennePrecedente') { fieldPath = `data.${state.selectedYear}.moyennePrecedente`; value = parseFloat(value.replace(/\s/g, '')) || 0; }
        else if (input.matches('.month-cell')) {
            fieldPath = `data.${state.selectedYear}.revenus.${input.dataset.month}`;
            value = parseFloat(value.replace(/\s/g, '').replace(',', '.')) || 0;
        }

        if (fieldPath) {
            try {
                await db.collection('concessionnaires').doc(id).update({ [fieldPath]: value });
                // No need to fetch again for small updates, just re-render with local state change for performance
                fetchDataAndRender(); // Or a more optimized local update + re-render
            } catch(err) { handleError('updateField', err); }
        }
    });

    notesOverlay.addEventListener('click', (e) => {
        if (e.target.matches('#notes-close') || e.target === notesOverlay) notesOverlay.classList.add('hidden');
        if (e.target.matches('#notes-save')) saveNotes();
    });

    infoOverlay.addEventListener('click', (e) => {
        if (e.target.matches('#info-close') || e.target === infoOverlay) infoOverlay.classList.add('hidden');
        if (e.target.matches('#info-save')) saveInfo();
        if (e.target.matches('#add-df-btn')) addDFRow(document.getElementById('df-container'));
        if (e.target.matches('.df-delete-btn')) e.target.closest('.df-group').remove();
    });

    visitHistoryOverlay.addEventListener('click', async (e) => {
        if (e.target.matches('#visit-history-close') || e.target === visitHistoryOverlay) {
            visitHistoryOverlay.classList.add('hidden');
        } else if (e.target.matches('.btn-delete-visit')) {
            const dateToDelete = e.target.dataset.date;
            if (confirm(`Supprimer la visite du ${dateToDelete} ?`)) {
                await db.collection('concessionnaires').doc(state.currentConcessionnaireId).update({
                    visites: firebase.firestore.FieldValue.arrayRemove(dateToDelete)
                });
                await fetchDataAndRender(); // Re-fetch to update all views
                visitHistoryOverlay.classList.add('hidden');
            }
        }
    });
}

// 9. INITIALISATION
function init() {
    const now = new Date().getFullYear();
    for (let y = now - 5; y <= now + 5; y++) {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y;
        if (y === state.selectedYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }
    setupEventListeners();
    fetchDataAndRender();
}

init();
