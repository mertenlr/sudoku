// ===== Elemente aus dem HTML holen =====
const spielfeld = document.getElementById("spielfeld");
const zahlenleiste = document.getElementById("zahlenleiste");
const stufenKnoepfe = document.querySelectorAll(".stufe");
const konfliktSchalter = document.getElementById("konfliktSchalter");
const fehlerAnzeige = document.getElementById("fehler");
const zeitAnzeige = document.getElementById("zeit");
const hinweis = document.getElementById("hinweis");
const meldung = document.getElementById("meldung");

// ===== Spielzustand =====
const zellen = [];
let aktuellesRaetsel = null;
let aktuelleStufe = "leicht";
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
  const taste = document.createElement("button");
  taste.className = "taste";
  taste.textContent = n;
  taste.addEventListener("click", function () {
    schreibe(String(n));
  });
  zahlenleiste.appendChild(taste);
}

// Der Radierer schreibt "nichts" ins Feld
document.getElementById("radierer").addEventListener("click", function () {
  schreibe("");
});

// Schreibt einen Wert ins ausgewählte Feld (von Zahlenleiste und Radierer benutzt)
function schreibe(wert) {
  if (ausgewaehlteZelle !== null && !ausgewaehlteZelle.readOnly) {
    ausgewaehlteZelle.value = wert;
    verarbeiteEingabe(ausgewaehlteZelle);
    ausgewaehlteZelle.focus();
  }
}


// ===== Schwierigkeit =====
function setzeStufe(stufe) {
  aktuelleStufe = stufe;
  for (const knopf of stufenKnoepfe) {
    if (knopf.dataset.stufe === stufe) {
      knopf.classList.add("aktiv");
      knopf.setAttribute("aria-pressed", "true");
    } else {
      knopf.classList.remove("aktiv");
      knopf.setAttribute("aria-pressed", "false");
    }
  }
}

for (const knopf of stufenKnoepfe) {
  knopf.addEventListener("click", function () {
    setzeStufe(knopf.dataset.stufe);
    neuesRaetsel();
  });
}


// ===== Eingaben =====
function verarbeiteEingabe(zelle) {
  if (!"123456789".includes(zelle.value)) {
    zelle.value = "";
  }

  // Das Feld wurde geändert, eine alte Markierung vom Prüfen gilt nicht mehr
  zelle.classList.remove("falsch");
  hinweis.textContent = "";

  // Kleine Animation: die Zahl "ploppt" kurz auf (außer der Nutzer will keine Bewegung)
  const ohneBewegung = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (zelle.value !== "" && !ohneBewegung) {
    zelle.animate(
      [{ transform: "scale(1.3)" }, { transform: "scale(1)" }],
      { duration: 160, easing: "ease-out" }
    );
  }

  pruefeKonflikte();
  markiere(zelle);
  pruefeGewonnen();
  speichereSpielstand();
}

// Liegen zwei Felder in derselben Zeile, Spalte oder demselben Block?
function liegenZusammen(a, b) {
  return a.dataset.zeile === b.dataset.zeile ||
         a.dataset.spalte === b.dataset.spalte ||
         a.dataset.block === b.dataset.block;
}

// Markiert alle Felder, deren Zahl in ihrer Zeile, Spalte oder ihrem Block doppelt vorkommt
function pruefeKonflikte() {
  for (const z of zellen) {
    z.classList.remove("konflikt");
  }

  for (const a of zellen) {
    if (a.value !== "") {
      for (const b of zellen) {
        if (a !== b && a.value === b.value && liegenZusammen(a, b)) {
          a.classList.add("konflikt");
        }
      }
    }
  }
}

// Wird beim Klick auf "Prüfen" aufgerufen
function pruefen() {
  let anzahl = 0;

  for (let i = 0; i < 81; i++) {
    const z = zellen[i];
    if (!z.readOnly && z.value !== "" && z.value !== aktuellesRaetsel.loesung[i]) {
      z.classList.add("falsch");
      anzahl++;
    }
  }

  if (anzahl === 0) {
    hinweis.textContent = "✓ Bisher ist alles richtig!";
  } else if (anzahl === 1) {
    hinweis.textContent = "1 falsche Zahl gefunden.";
  } else {
    hinweis.textContent = anzahl + " falsche Zahlen gefunden.";
  }

  fehler += anzahl;
  zeigeFehler();
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

    if (liegenZusammen(z, auswahl)) {
      z.classList.add("hervorgehoben");
    }

    if (auswahl.value !== "" && z.value === auswahl.value) {
      z.classList.add("gleich");
    }
  }
}


// ===== Rätsel laden =====
function neuesRaetsel() {
  clearInterval(timerId);
  meldung.textContent = "";
  hinweis.textContent = "Neues Rätsel wird erstellt …";

  // Kurz warten, damit der Browser den Hinweis anzeigen kann, bevor er rechnet.
  // Schwere Rätsel brauchen manchmal einen Moment.
  setTimeout(function () {
    aktuellesRaetsel = erzeugeRaetsel(aktuelleStufe);   // kommt aus raetsel.js
    starteRaetsel();
  }, 20);
}

// Setzt alles für ein frisch erzeugtes Rätsel zurück
function starteRaetsel() {
  // Neues Rätsel: noch keine eigenen Eingaben, also nur die Vorgaben anzeigen
  zeigeRaetsel(aktuellesRaetsel.raetsel);

  fehler = 0;
  sekunden = 0;
  geloest = false;
  spielfeld.classList.remove("geloest");
  hinweis.textContent = "";
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

    zelle.classList.remove("vorgegeben", "falsch", "konflikt", "hervorgehoben", "gleich", "ausgewaehlt");

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
    }
  }
  ausgewaehlteZelle = null;
  pruefeKonflikte();
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
  spielfeld.classList.add("geloest");
  for (const z of zellen) {
    z.readOnly = true;
  }
  let fehlerText;
  if (fehler === 0) {
    fehlerText = "ohne Fehler";
  } else if (fehler === 1) {
    fehlerText = "mit 1 Fehler";
  } else {
    fehlerText = "mit " + fehler + " Fehlern";
  }

  hinweis.textContent = "";
  meldung.textContent = "Gelöst in " + zeitAlsText() + ", " + fehlerText + ".";
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
  zeitAnzeige.textContent = zeitAlsText();
}


// ===== Fehler und Konflikte =====
function zeigeFehler() {
  fehlerAnzeige.textContent = "Fehler: " + fehler;
}

function aktualisiereKonfliktSchalter() {
  if (konfliktSchalter.checked) {
    spielfeld.classList.add("konflikte-an");
  } else {
    spielfeld.classList.remove("konflikte-an");
  }
}

konfliktSchalter.addEventListener("change", function () {
  aktualisiereKonfliktSchalter();
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
    stufe: aktuelleStufe,
    raetsel: aktuellesRaetsel,
    eingaben: eingaben,
    fehler: fehler,
    sekunden: sekunden,
    geloest: geloest,
    konflikteAnzeigen: konfliktSchalter.checked
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
  setzeStufe(stand.stufe);
  konfliktSchalter.checked = stand.konflikteAnzeigen !== false;   // fehlt der Wert, bleibt der Haken an
  aktualisiereKonfliktSchalter();

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
document.getElementById("pruefenButton").addEventListener("click", pruefen);

const gespeichert = ladeSpielstand();
if (gespeichert !== null) {
  stelleWiederHer(gespeichert);
} else {
  setzeStufe("leicht");
  neuesRaetsel();
}
