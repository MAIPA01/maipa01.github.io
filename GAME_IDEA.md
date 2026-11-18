# Grywalne portfolio — stan i dalsze pomysły

## Co już działa
- **Strona = poziom.** Platformy to górne krawędzie elementów, ściany to ich boki (dla elementów wyższych niż 28 px).
- **Ruch w stylu Celeste:** coyote time, bufor skoku, podwójny skok, chwytanie ścian, wspinaczka z wytrzymałością,
  zjazd, odbicie od ściany, automatyczne wciągnięcie się na krawędź.
- **Postacie:** MAIPA-Chan, Remi, MAIPA-Senpai (placeholdery 16×16). Wybór: C albo E na karcie postaci w sekcji „Postacie”.
- **Machanie:** F, automatycznie na kontaktach i po wygranej.
- **Speedrun:** timer od pierwszego ruchu do zebrania wszystkich monet, rekord per strona.
- **Ukryte auto** (sekret) — wsiadasz E, jedziesz ← →, Spacja skacze, F trąbi.
- **Wiele stron** (opis niżej).

## Jak gra działa na wielu stronach
Wybrałem model **„hub + poziomy”**, bo pasuje do portfolio i nic nie trzeba projektować ręcznie:

- **Strona główna = hub.** Każda karta projektu to „drzwi”: E otwiera podstronę projektu.
- **Podstrona projektu = osobny poziom**, zbudowany z jej własnego układu (nagłówek, bloki, galeria, karty po prawej).
  Monety są nad blokami i zdjęciami, więc żeby je zebrać, trzeba „przejść” cały projekt.
- **Tryb gry nie wyłącza się przy przejściu** (sessionStorage), postać i wybór zostają.
  E na „Wróć do projektów” wraca do huba i stawia postać przy karcie, z której wyszła.
- **404 też jest poziomem** — wielkie pikselowe „404” to platformy.
- **Rekordy czasu** są osobne dla każdej strony (`localStorage`: `maipa-best:home`, `maipa-best:project:margs`…).

Dlaczego nie tylko główna: podstrony z galeriami i blokami robią naturalne, różne od siebie poziomy,
a rekruter, który i tak klika projekty, nie traci gry po drodze. Dlaczego nie jeden wspólny wynik na wszystkie strony:
speedrun wielostronicowy wymagałby wczytywania stron w tle i karałby za wolny internet — zostawiłem to jako pomysł niżej.

## Auto — co dalej (pomysły od najprostszych)
1. **Licznik sekretów w HUD** — już jest ikonka auta po znalezieniu. Można dodać więcej sekretów (np. ukryta postać,
   złota moneta za `R`-less run) i pokazać „sekrety 1/3”.
2. **Rampa i drift:** na stronie projektu Dodge Challenger auto mogłoby stać od razu, a bloki renderów byłyby rampami.
   Dodatkowy klawisz (Shift) = drift z dymem z opon (cząsteczki już są).
3. **Time trial „Drive to the footer”:** po wejściu do auta startuje osobny timer — dojedź od miejsca ukrycia do stopki.
   Rekord osobno od biegu pieszego.
4. **Tuning:** w stopce „garaż” — zebrane monety odblokowują kolory lakieru (palety w sprite'cie, tak samo jak postacie).
5. **Easter egg z renderem:** po pierwszym znalezieniu auta pasek z renderem tyłu Challengera na chwilę „odpala” światła
   (podmiana obrazka na wersję z zapalonymi lampami — to robota w Blenderze, nie w kodzie).

## Do narysowania w Aseprite
- 3 postacie × 13 klatek (układ w README), paleta strony: `#d11717`, `#9e1010`, `#141414`, `#ffffff`, `#4d4c4d`.
- Auto 32×16, 2 klatki (obrót kół); opcjonalnie 3. klatka „hamowanie” ze światłami stopu.
- Moneta 8×8 (4 klatki) — może być mała kostka 3D albo żeton z „M”.
- Opcjonalnie efekt kurzu przy lądowaniu (4 klatki 8×8).
