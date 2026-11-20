# Grywalne portfolio — stan i dalsze pomysły

## Co już działa
- **Strona = poziom.** Platformy to górne krawędzie elementów; ściany do wspinaczki to boki strony
  (boki elementów można włączyć w `data/game.json` → `physics.elementWalls`).
- **Ruch w stylu Celeste:** coyote time, bufor skoku, podwójny skok (też pod ↑/W), chwytanie ścian, wspinaczka
  z wytrzymałością, zjazd, odbicie od ściany.
- **Tryb swobodny i wyzwanie:** po P chodzisz po stronie bez presji; T uruchamia wyzwanie (monety + czas + rekord).
- **Poziomy z kłódkami:** hub (strona główna) → podstrony projektów odblokowywane po kolei. Blokady obejmują klawisz E,
  kliknięcia myszą, karty „Powiązane projekty” i linki w tekście. Działają tylko w trybie gry.
- **Portfel i garaż:** monety za pierwsze ukończenie wyzwania na danym poziomie, ceny przeliczane tak,
  żeby suma wszystkich przedmiotów = suma monet ze wszystkich poziomów.
- **Sekretna gra autem:** ukryta w pasie z bocznym renderem Challengera. Runner w stylu dinozaura z Chrome:
  przeszkody z prawej, skok, docisk do ziemi (↓), drony nad dachem (wymuszają szybki ↓ po skoku), rampy z przechyleniem auta,
  spaliny zostające za autem, rosnąca prędkość, rekord. Auto = karoseria + koła (osobno w garażu) + tuning.
- **Ekran „Portfolio ukończone!”** (`finale.html`): fajerwerki, animowany napis, machające postacie, statystyki;
  po odblokowaniu skrót w stopce każdej strony.
- **Postacie:** MAIPA-Chan, Remi, MAIPA-Senpai (placeholdery 16×16), wybór C albo E na karcie postaci.

## Jak działa gra na wielu stronach
- **Hub + poziomy:** strona główna jest hubem, każda podstrona projektu to osobny poziom zbudowany z jej układu.
- Tryb gry nie wyłącza się przy przechodzeniu między stronami (sessionStorage); E na „Wróć” stawia postać przy karcie,
  z której wyszła.
- Kolejność poziomów = kolejność kart na stronie głównej (wyróżnione pierwsze, potem kolejność w JSON, na końcu modele 3D).
  Dodajesz projekt → automatycznie dochodzi nowy poziom i rosną ceny w garażu.
- Strony zespołów i 404 są „pokojami” bez wyzwania — można po nich chodzić, ale nie blokują postępu.

## Pomysły na dalej
1. **Licznik sekretów** w HUD (np. „sekrety 1/3”): ukryta postać do odblokowania, złota moneta za wyzwanie bez użycia R.
2. **Bonus za rampę:** monetka / punkty w powietrzu nad rampą, do złapania tylko przy pełnym skoku.
3. **Dzienna trasa:** seed przeszkód zależny od daty — każdy dzień ma tę samą trasę dla wszystkich, łatwo porównać wynik.
4. **Kosmetyka postaci w garażu:** czapki/akcesoria nakładane na sprite (osobny pasek klatek z warstwą).
5. **Czas całego portfolio:** speedrun wszystkich poziomów jednym ciągiem, wynik pokazany na ekranie finału.

## Do narysowania w Aseprite
- 3 postacie × 13 klatek (układ w README), paleta strony: `#d11717`, `#9e1010`, `#141414`, `#ffffff`, `#4d4c4d`.
- Auto: karoserie 32×16 **bez kół** (`assets/game/car/bodies/`), koła 8×8 × 4 klatki obrotu (`wheels/`, pasek 32×8),
  miejsca kół na karoserii: `car.wheelAnchors`. Spaliny wylatują z punktu (1, 11.5) karoserii — tył przy zderzaku.
- Przeszkody (`assets/game/car/obstacles/`): pachołek 8×10, dwa pachołki 20×10, barierka 18×9, opony 10×14,
  dron 2 klatki 16×8 (pasek 32×8), rampa 24×10 (wznosi się w prawo).
- Ikony tuningu 16×16 (`assets/game/car/upgrades/`).
- Moneta 8×8 (4 klatki).
