// ===== Elemente aus dem HTML holen =====
const spielfeld = document.getElementById("spielfeld");
const zahlenleiste = document.getElementById("zahlenleiste");
const schwierigkeit = document.getElementById("schwierigkeit");
const fehlerSchalter = document.getElementById("fehlerSchalter");
const fehlerAnzeige = document.getElementById("fehler");
const zeitAnzeige = document.getElementById("zeit");
const meldung = document.getElementById("meldung");

// ===== Spielzustand =====
const zellen = [];
let aktuellesRaetsel = null;
let ausgewaehlteZelle = null;
let fehler = 0;
let sekunden = 0;
let timerId = null;
let geloest = false;


// ===== Spielfeld einmalig aufbauen =====
for (let i = 0; i < 81; i++) {
  const zelle = document.createElement("input");
  zelle.className = "zelle";
  zelle.maxLength = 1;
  zelle.inputMode = "none";   // Handy-Tastatur nicht öffnen, dafür gibt es die Zahlenleiste

  const spalte = i % 9;
  const zeile = Math.floor(i / 9);

  if (spalte === 2 || spalte === 5) zelle.classList.add("rand-rechts");
  if (zeile === 2 || zeile === 5) zelle.classList.add("rand-unten");

  const blockZeile = Math.floor(zeile / 3);
  const blockSpalte = Math.floor(spalte / 3);
  if ((blockZeile + blockSpalte) % 2 === 0) zelle.classList.add("blau");

  zelle.dataset.zeile = zeile;
  zelle.dataset.spalte = spalte;
  zelle.dataset.block = blockZeile * 3 + blockSpalte;

  zelle.addEventListener("input", function () {
    verarbeiteEingabe(zelle);
  });

  zelle.addEventListener("focus", function () {
    waehleZelle(zelle);
  });

  zellen.push(zelle);
  spielfeld.appendChild(zelle);
}


// ===== Zahlenleiste aufbauen =====
for (let n = 1; n <= 9; n++) {
  erstelleTaste(String(n), String(n));
}
erstelleTaste("⌫", "");   // Radierer: schreibt "nichts" ins Feld

function erstelleTaste(beschriftung, wert) {
  const taste = document.createElement("button");
  taste.className = "taste";
  taste.textContent = beschriftung;

  taste.addEventListener("click", function () {
    if (ausgewaehlteZelle !== null && !ausgewaehlteZelle.readOnly) {
      ausgewaehlteZelle.value = wert;
      verarbeiteEingabe(ausgewaehlteZelle);
      ausgewaehlteZelle.focus();
    }
  });

  zahlenleiste.appendChild(taste);
}


// ===== Eingaben =====
function verarbeiteEingabe(zelle) {
  const i = zellen.indexOf(zelle);

  if (!"123456789".includes(zelle.value)) {
    zelle.value = "";
  }

  if (zelle.value !== "" && zelle.value !== aktuellesRaetsel.loesung[i]) {
    zelle.classList.add("falsch");
    fehler++;
    zeigeFehler();
  } else {
    zelle.classList.remove("falsch");
  }

  markiere(zelle);
  pruefeGewonnen();
  speichereSpielstand();
}

function waehleZelle(zelle) {
  if (ausgewaehlteZelle !== null) {
    ausgewaehlteZelle.classList.remove("ausgewaehlt");
  }
  ausgewaehlteZelle = zelle;
  zelle.classList.add("ausgewaehlt");
  markiere(zelle);
}

function markiere(auswahl) {
  for (const z of zellen) {
    z.classList.remove("hervorgehoben", "gleich");

    if (z.dataset.zeile === auswahl.dataset.zeile ||
        z.dataset.spalte === auswahl.dataset.spalte ||
        z.dataset.block === auswahl.dataset.block) {
      z.classList.add("hervorgehoben");
    }

    if (auswahl.value !== "" && z.value === auswahl.value) {
      z.classList.add("gleich");
    }
  }
}


// ===== Rätsel laden =====
function neuesRaetsel() {
  const liste = raetselListe[schwierigkeit.value];

  let auswahl;
  do {
    auswahl = liste[Math.floor(Math.random() * liste.length)];
  } while (liste.length > 1 && aktuellesRaetsel !== null && auswahl.raetsel === aktuellesRaetsel.raetsel);
  aktuellesRaetsel = auswahl;

  // Neues Rätsel: noch keine eigenen Eingaben, also nur die Vorgaben anzeigen
  zeigeRaetsel(auswahl.raetsel);

  fehler = 0;
  sekunden = 0;
  geloest = false;
  meldung.textContent = "";
  zeigeFehler();
  zeigeZeit();
  starteTimer();
  speichereSpielstand();
}

// Trägt Vorgaben und eigene Eingaben (81 Ziffern, 0 = leer) ins Spielfeld ein
function zeigeRaetsel(eingaben) {
  for (let i = 0; i < 81; i++) {
    const zelle = zellen[i];
    const vorgabe = aktuellesRaetsel.raetsel[i];

    zelle.classList.remove("vorgegeben", "falsch", "hervorgehoben", "gleich", "ausgewaehlt");

    if (vorgabe !== "0") {
      zelle.value = vorgabe;
      zelle.readOnly = true;
      zelle.classList.add("vorgegeben");
    } else {
      zelle.readOnly = false;
      if (eingaben[i] === "0") {
        zelle.value = "";
      } else {
        zelle.value = eingaben[i];
      }
      if (zelle.value !== "" && zelle.value !== aktuellesRaetsel.loesung[i]) {
        zelle.classList.add("falsch");
      }
    }
  }
  ausgewaehlteZelle = null;
}


// ===== Gewinnen =====
function pruefeGewonnen() {
  let eingabe = "";
  for (const z of zellen) {
    eingabe += z.value;
  }

  if (eingabe === aktuellesRaetsel.loesung) {
    geloest = true;
    zeigeGewonnen();
  }
}

function zeigeGewonnen() {
  clearInterval(timerId);
  for (const z of zellen) {
    z.readOnly = true;
  }
  meldung.textContent = "🎉 Geschafft in " + zeitAlsText() + "!";
}


// ===== Timer =====
function starteTimer() {
  clearInterval(timerId);
  timerId = setInterval(function () {
    sekunden++;
    zeigeZeit();
    speichereSpielstand();
  }, 1000);
}

function zeitAlsText() {
  const min = Math.floor(sekunden / 60);
  const sek = sekunden % 60;
  return String(min).padStart(2, "0") + ":" + String(sek).padStart(2, "0");
}

function zeigeZeit() {
  zeitAnzeige.textContent = "⏱ " + zeitAlsText();
}


// ===== Fehleranzeige =====
function zeigeFehler() {
  fehlerAnzeige.textContent = "Fehler: " + fehler;
}

function aktualisiereFehlerSchalter() {
  if (fehlerSchalter.checked) {
    spielfeld.classList.add("fehler-an");
    fehlerAnzeige.hidden = false;
  } else {
    spielfeld.classList.remove("fehler-an");
    fehlerAnzeige.hidden = true;
  }
}

fehlerSchalter.addEventListener("change", function () {
  aktualisiereFehlerSchalter();
  speichereSpielstand();
});


// ===== Spielstand speichern und laden =====
function speichereSpielstand() {
  let eingaben = "";
  for (const z of zellen) {
    if (z.value === "") {
      eingaben += "0";
    } else {
      eingaben += z.value;
    }
  }

  const spielstand = {
    stufe: schwierigkeit.value,
    raetsel: aktuellesRaetsel,
    eingaben: eingaben,
    fehler: fehler,
    sekunden: sekunden,
    geloest: geloest,
    fehlerAnzeigen: fehlerSchalter.checked
  };

  try {
    localStorage.setItem("sudoku-spielstand", JSON.stringify(spielstand));
  } catch (e) {
    // Speichern nicht möglich (z. B. im privaten Modus) – das Spiel läuft trotzdem weiter
  }
}

function ladeSpielstand() {
  try {
    const text = localStorage.getItem("sudoku-spielstand");
    if (text === null) {
      return null;
    }
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function stelleWiederHer(stand) {
  schwierigkeit.value = stand.stufe;
  fehlerSchalter.checked = stand.fehlerAnzeigen;
  aktualisiereFehlerSchalter();

  aktuellesRaetsel = stand.raetsel;
  zeigeRaetsel(stand.eingaben);

  fehler = stand.fehler;
  sekunden = stand.sekunden;
  geloest = stand.geloest;
  zeigeFehler();
  zeigeZeit();

  if (geloest) {
    zeigeGewonnen();
  } else {
    starteTimer();
  }
}


// ===== Start =====
document.getElementById("neuButton").addEventListener("click", neuesRaetsel);

const gespeichert = ladeSpielstand();
if (gespeichert !== null) {
  stelleWiederHer(gespeichert);
} else {
  neuesRaetsel();
}
