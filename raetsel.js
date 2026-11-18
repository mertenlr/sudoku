// =========================================================
// raetsel.js: erzeugt neue Sudoku-Rätsel
//
// So funktioniert der Generator:
// 1. Er füllt ein leeres Gitter zufällig und vollständig nach den
//    Sudoku-Regeln aus. Das ist die Lösung.
// 2. Dann nimmt er in zufälliger Reihenfolge Zahlen heraus. Nach jedem
//    Herausnehmen prüft er, ob das Rätsel immer noch genau EINE Lösung hat.
//    Hätte es plötzlich mehrere, legt er die Zahl wieder zurück.
// 3. Er hört auf, sobald nur noch so viele Zahlen übrig sind, wie die
//    Schwierigkeitsstufe vorgibt.
//
// Das Gitter ist ein Array mit 81 Zahlen, Zeile für Zeile, 0 = leeres Feld.
// =========================================================

// Wie viele Zahlen pro Stufe am Anfang im Gitter stehen
const VORGABEN = {
  leicht: 40,
  mittel: 32,
  schwer: 26
};


// Bringt die Einträge einer Liste in eine zufällige Reihenfolge
// (Fisher-Yates-Verfahren: jeder Eintrag tauscht mit einem zufälligen davor)
function mische(liste) {
  for (let i = liste.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = liste[i];
    liste[i] = liste[j];
    liste[j] = tmp;
  }
  return liste;
}


// Welche Zahlen dürfen in Feld i stehen, ohne gegen die Regeln zu verstoßen?
function moeglicheZahlen(gitter, i) {
  const zeile = Math.floor(i / 9);
  const spalte = i % 9;
  const blockStart = Math.floor(zeile / 3) * 27 + Math.floor(spalte / 3) * 3;

  // belegt[z] wird true, wenn die Zahl z in Zeile, Spalte oder Block schon vorkommt
  const belegt = [false, false, false, false, false, false, false, false, false, false];
  for (let k = 0; k < 9; k++) {
    belegt[gitter[zeile * 9 + k]] = true;                               // gleiche Zeile
    belegt[gitter[k * 9 + spalte]] = true;                              // gleiche Spalte
    belegt[gitter[blockStart + Math.floor(k / 3) * 9 + (k % 3)]] = true; // gleicher Block
  }

  const frei = [];
  for (let z = 1; z <= 9; z++) {
    if (!belegt[z]) {
      frei.push(z);
    }
  }
  return frei;
}


// Sucht das leere Feld mit den wenigsten Möglichkeiten.
// Dort anzufangen macht die Suche viel schneller, so wie ein Mensch auch
// zuerst die Felder ausfüllt, bei denen nur noch wenig in Frage kommt.
// Gibt null zurück, wenn kein Feld mehr leer ist.
function besteLuecke(gitter) {
  let beste = null;

  for (let i = 0; i < 81; i++) {
    if (gitter[i] === 0) {
      const zahlen = moeglicheZahlen(gitter, i);
      if (beste === null || zahlen.length < beste.zahlen.length) {
        beste = { index: i, zahlen: zahlen };
        if (zahlen.length <= 1) {
          break;   // besser wird es nicht
        }
      }
    }
  }
  return beste;
}


// Füllt das Gitter zufällig komplett aus (Backtracking):
// Zahl probieren, weitermachen, und wenn es später nicht aufgeht,
// zurückgehen und die nächste Zahl probieren.
function fuelle(gitter) {
  const luecke = besteLuecke(gitter);
  if (luecke === null) {
    return true;   // alles voll, fertig
  }

  for (const zahl of mische(luecke.zahlen)) {
    gitter[luecke.index] = zahl;
    if (fuelle(gitter)) {
      return true;
    }
  }

  gitter[luecke.index] = 0;   // keine Zahl hat gepasst, einen Schritt zurück
  return false;
}


// Zählt die Lösungen eines Rätsels, hört aber bei "grenze" auf.
// Wir wollen nur wissen: genau eine Lösung oder mehr? Deshalb reicht grenze = 2.
function zaehleLoesungen(gitter, grenze) {
  const luecke = besteLuecke(gitter);
  if (luecke === null) {
    return 1;   // komplett gefüllt: eine Lösung gefunden
  }

  let anzahl = 0;
  for (const zahl of luecke.zahlen) {
    gitter[luecke.index] = zahl;
    anzahl += zaehleLoesungen(gitter, grenze - anzahl);
    if (anzahl >= grenze) {
      break;
    }
  }

  gitter[luecke.index] = 0;
  return anzahl;
}


// Erzeugt ein neues Rätsel für die Stufe "leicht", "mittel" oder "schwer".
// Gibt ein Objekt zurück: { raetsel: "5300700...", loesung: "5346789..." }
function erzeugeRaetsel(stufe) {
  const ziel = VORGABEN[stufe];

  // Manchmal lassen sich nicht genug Zahlen entfernen, ohne dass das Rätsel
  // mehrdeutig wird. Dann einfach mit einem neuen Gitter noch einmal versuchen.
  while (true) {
    const loesung = new Array(81).fill(0);
    fuelle(loesung);

    const raetsel = loesung.slice();   // Kopie, aus der wir Zahlen entfernen
    let uebrig = 81;

    const reihenfolge = [];
    for (let i = 0; i < 81; i++) {
      reihenfolge.push(i);
    }
    mische(reihenfolge);

    for (const i of reihenfolge) {
      if (uebrig === ziel) {
        break;
      }

      const gemerkt = raetsel[i];
      raetsel[i] = 0;

      if (zaehleLoesungen(raetsel.slice(), 2) === 1) {
        uebrig--;                // weiterhin eindeutig, Zahl bleibt weg
      } else {
        raetsel[i] = gemerkt;    // sonst wäre es mehrdeutig, Zahl zurücklegen
      }
    }

    if (uebrig === ziel) {
      return {
        raetsel: raetsel.join(""),
        loesung: loesung.join("")
      };
    }
  }
}
