# MAIPA — portfolio

Strona: https://maipa01.github.io

Czysty HTML/CSS/JS — **bez kroku budowania**. Cała treść jest w plikach JSON w `data/`.
Zmieniasz JSON → commit → po ~1 minucie zmiana jest na stronie (odśwież z Ctrl+F5).

## Strony
| Adres | Co to jest |
|---|---|
| `index.html` | strona główna |
| `project.html?id=<id>` | **strona projektu** — jeden szablon dla wszystkich projektów, generuje się z `data/projects.json` |
| `team.html?id=<id>` | **strona zespołu** — logo, opis, członkowie z rolami i projekty zespołu (`data/teams.json`) |
| `404.html` | „nie znaleziono” — GitHub Pages pokazuje ją sam dla każdego złego adresu |
| `finale.html` | **„Portfolio ukończone!”** — odblokowuje się po przejściu wszystkich poziomów trybu gry (bez tego → 404) |

Nagłówek, stopka, tryb dzień/noc, wybór języka i tryb gry działają na każdej stronie (`js/core/`).

## Gdzie co edytować
| Plik | Co zawiera |
|---|---|
| `data/profile.json` | imię, role w hero, „O mnie”, statystyki, karty umiejętności |
| `data/projects.json` | projekty (gry, silniki, biblioteki, aplikacje, **modele 3D**) + kategorie |
| `data/teams.json` | zespoły: nazwa, logo, opis, członkowie (id osób), linki |
| `data/people.json` | osoby: imię i nazwisko, linki (GitHub, itch…), `"me": true` przy Tobie |
| `data/characters.json` | postacie (pozy, opis, model VRM/GLB, sprite do gry) |
| `data/socials.json` | kontakty i social media |
| `data/game.json` | tryb gry: fizyka, platformy, auto, animacje |
| `data/i18n/*.json` | tłumaczenia interfejsu (menu, przyciski, tytuły sekcji, teksty gry) |

Ogólne zasady: każdy tekst może być zwykłym napisem albo `{"en": "...", "pl": "..."}`;
`"hidden": true` chowa element bez kasowania; link z pustym `"url"` jest ukryty.

### Podpowiedzi w VS Code (schematy JSON)
Każdy plik w `data/` ma na górze `"$schema"` (plus `.vscode/settings.json`), więc VS Code:
podpowiada nazwy pól (**Ctrl+Spacja**), dozwolone wartości (np. `category`, `type` linku), pokazuje opis pola po najechaniu
i podkreśla literówki. Schematy są w `schemas/`.

Sprawdzenie wszystkiego naraz (pola, id zespołów/osób/projektów, czy pliki obrazków istnieją):
```
pip install jsonschema referencing
python tools/validate-data.py
```

### Długie teksty
Pola z Markdownem (`description`, `sections[].body`, opis zespołu) można pisać na trzy sposoby:
```jsonc
"description": { "en": "Jeden długi napis…", "pl": "…" }
"description": {                                   // tablica krótkich linii — najwygodniej w JSON
  "en": ["Pierwsze zdanie akapitu,", "ciąg dalszy tego samego akapitu.", "", "Nowy akapit.", "- punkt listy"],
  "pl": ["…"]
}
"description": { "en": { "file": "content/margs.en.md" }, "pl": { "file": "content/margs.pl.md" } }   // osobny plik .md
```
W tablicy pojedyncze przejście do nowej linii to spacja (ten sam akapit), pusta linia `""` zaczyna nowy akapit,
a linia zakończona dwiema spacjami albo `\` wymusza złamanie wiersza.

## Projekty (`data/projects.json`)
Jeden wpis = karta na stronie głównej + własna podstrona `project.html?id=...`.

```jsonc
{
  "id": "destiny-painter",                 // adres podstrony: project.html?id=destiny-painter (małe litery, myślniki)
  "title": "Destiny Painter",
  "category": "game",                      // game | engine | library | app | model  (lista w "categories")
  "featured": true,                        // na początek listy + czerwony badge
  "year": "2025",
  "icon": "images/projects/destiny-painter-icon.webp",
  "iconFit": "contain",                    // "contain" = cała ikona (kwadratowe ikony), "cover" = wypełnij kartę
  "banner": "images/projects/destiny-painter-banner.webp",   // opcjonalny: tło nagłówka podstrony i obrazek na karcie
  "cardImage": "icon",                     // opcjonalnie: na karcie pokaż ikonę zamiast bannera
  "summary":     { "en": "Krótki opis — karta i nagłówek.", "pl": "..." },
  "description": { "en": "Długi opis — **Markdown**.",      "pl": "..." },
  "tags": ["Unity", "C#"],
  "links": [
    { "type": "itch", "url": "https://..." },
    { "type": "youtube", "label": "Trailer", "url": "https://youtu.be/..." }
  ],

  "gallery": [                             // zrzuty ekranu / rendery / zdjęcia
    { "src": "images/projects/dp/shot1.webp", "caption": { "en": "Main menu", "pl": "Menu" } },
    { "caption": "Camera 1", "variants": [ // kilka wersji jednego obrazka (przyciski na obrazku)
        { "label": { "en": "Day", "pl": "Dzień" }, "src": ".../Day.webp" },
        { "label": { "en": "Night", "pl": "Noc" }, "src": ".../Night.webp" } ] }
  ],
  "galleryTitle": { "en": "Gameplay", "pl": "Rozgrywka" },   // opcjonalnie; domyślnie wg kategorii

  "videos": [ { "url": "https://vimeo.com/123", "title": "Gameplay", "cover": "images/projects/x/cover.webp" } ],
                                           // + automatycznie linki youtube/vimeo z "links" (tam też można dać "cover")

  "webBuild": { "url": "https://.../index.html", "aspect": "16/9" },       // gra w przeglądarce (iframe, ładuje się po kliknięciu)
  // gra z układem w stałych pikselach (np. p5.js createCanvas(windowWidth, windowHeight)):
  // "webBuild": { "url": "...", "width": 1280, "height": 760 }  → renderuje się w 1280×760 i skaluje do bloku

  "model": {                               // model 3D w kilku wersjach — to wciąż JEDEN model
    "variants": [
      { "label": "HighPoly", "src": "models/glock18D/HighPoly.glb" },
      { "label": "250",      "src": "models/glock18D/250.glb.obf" }
    ],
    "cameraOrbit": "30deg 75deg auto", "autoRotate": true
  },

  "sections": [                            // dodatkowe sekcje (np. dla bibliotek: instalacja, przykład użycia)
    { "title": { "en": "Usage", "pl": "Użycie" }, "body": "```cpp\nmargs::Parser p;\n```" }
  ],

  "team": {                                // zespół z data/teams.json + role osób W TYM projekcie
    "id": "drop-table",
    "name": "Drop Table – 1",              // opcjonalnie: inna nazwa tylko w tym projekcie
    "logo": "images/teams/drop-table/logo-1.webp",   // opcjonalnie: inne logo tylko w tym projekcie
    "members": [
      { "person": "patryk-antosik", "role": { "en": "Gameplay programmer", "pl": "Programista rozgrywki" } },
      { "person": "marceli-antosik", "role": { "en": "Art lead", "pl": "Lider artystyczny" } }
    ]
  },
  "whatIDid": [                            // lista: co konkretnie zrobiłem (Markdown w linii dozwolony)
    { "en": "Player movement", "pl": "Poruszanie się postaci" }
  ],

  "related": ["twin2-engine"],              // „Powiązane projekty” na dole podstrony
  "layout": ["play", "videos", "gallery", "about", "sections"]   // opcjonalnie: własna kolejność bloków
}
```

**Typy linków:** `github`, `itch`, `playstore`, `youtube`, `vimeo`, `web`, `download`, `docs`, `vroid`, `play`.
Linki YouTube/Vimeo otwierają się w odtwarzaczu na stronie (bez wychodzenia), a na podstronie projektu są osadzone.

**Układ podstrony zależy od kategorii** (zmienisz go polem `layout`):
- `game` — Zagraj w przeglądarce → Filmy → Zrzuty ekranu → O projekcie → Sekcje
- `model` — Model 3D (z przełącznikiem wersji) → Rendery → O projekcie
- `library` / `engine` / `app` — O projekcie → Sekcje (Markdown, bloki kodu) → Filmy → Galeria

**Okładki filmów:** pole `cover`; bez niego okładka pobiera się sama (YouTube — miniatura filmu, Vimeo — przez publiczne API Vimeo).

**Gry w przeglądarce:** kliknięcie w okno gry daje jej klawiaturę (czerwona ramka) — strzałki, spacja i kółko myszy
nie przewijają wtedy strony, a P nie włącza trybu gry. Kliknięcie gdziekolwiek poza grą (albo Esc) oddaje klawiaturę stronie.
Działa dla gier z każdej domeny (także gdy testujesz lokalnie na `localhost`, a gra jest na `maipa01.github.io`).
Wyłączysz to `"captureKeys": false`.

## Zespoły i osoby
- `data/people.json` — każda osoba raz: `id`, `name`, `links`, opcjonalnie `avatar`, `title`, `"me": true`.
- `data/teams.json` — `id`, `name`, `logo` (puste = pikselowy znak z inicjałami), `banner`, `summary`, `description`, `members` (id osób), `links`.
- W projekcie podajesz tylko `team.id` i role osób w tym projekcie. Strona zespołu (`team.html?id=…`) sama zbiera
  wszystkie jego projekty i role każdej osoby we wszystkich projektach.

**Markdown w opisach:** `**pogrubienie**`, `*kursywa*`, `` `kod` ``, listy `- `, `1. `, nagłówki `## `, linki `[tekst](url)`,
cytat `> `, bloki kodu ```` ```cpp ... ``` ````. Link do innego projektu: `[Wind Rider](project.html?id=wind-rider)`.

**Kategorie:** w `categories`. `"showInProjects": false` (tak ma `model`) = nie pokazuj w siatce „Projekty”
(modele 3D mają własną sekcję „Modele 3D”).

## Obrazki
Wrzucaj duże PNG gdzie chcesz, a potem zrób z nich lekkie WebP:
```
pip install pillow
python tools/optimize-images.py images/renders           # cały folder
python tools/optimize-images.py images/projects/x.png    # jeden plik
```
Tworzy `.webp` obok oryginału — w JSON wpisuj ścieżkę do `.webp`.
Rendery z repo: 96 MB PNG → 2,3 MB WebP. Oryginalnych PNG strona już nie używa — możesz je usunąć albo zostawić jako źródła.

## Modele 3D
- **.glb / .gltf** → podgląd `<model-viewer>` (Blender: File → Export → glTF 2.0 → *glTF Binary*; przy dużych włącz *Draco*).
  Dekodery Draco/Meshopt są w `js/vendor/` — skompresowane modele działają bez zewnętrznych serwerów.
- **.vrm** (VRoid Studio) → osobny podgląd three.js + three-vrm: poprawne cieniowanie VRoid, mruganie, „oddech”,
  patrzenie w kamerę. Ładuje się dopiero po kliknięciu „Zobacz w 3D”.
- Wersje jednego modelu (HighPoly / 1500 / LowPoly / cokolwiek): `model.variants` — `label` to dowolny tekst.

### Ochrona modeli przed pobraniem
Szczerze: **nie da się w 100% ochronić pliku, który przeglądarka ma wyświetlić** — do pokazania modelu przeglądarka
musi dostać wszystkie wierzchołki i tekstury, więc zdeterminowana osoba zawsze je wyciągnie (np. z pamięci karty graficznej).
Osobne repo nic nie zmienia (publiczne → ten sam publiczny URL; prywatne → strona nie może go pobrać bez tokenu, a token musiałby być w kodzie).

Co realnie pomaga (od najskuteczniejszego):
1. **Pokazuj wersje „wystawowe”**, nie robocze: niższa rozdzielczość tekstur, bez plików .blend / źródeł, ewentualnie znak wodny na teksturze.
2. **Zaciemnianie plików** (gotowe narzędzie):
   ```
   python tools/obfuscate-model.py models/glock18D/HighPoly.glb     # → HighPoly.glb.obf
   ```
   i w JSON `"src": "models/glock18D/HighPoly.glb.obf"`. Plik `.obf` nie otwiera się w żadnym programie, a strona
   dekoduje go w pamięci. Nie wrzucaj wtedy oryginału do repo. Odstrasza 99% osób („zapisz jako”, link z kodu),
   ale nie jest szyfrowaniem.
   **Czy klucz można trzymać w `.env`?** Nie da się tego zrobić na GitHub Pages: to hosting plików statycznych, bez serwera,
   który mógłby przeczytać `.env`. Wszystko, czego potrzebuje przeglądarka do odkodowania modelu, musi do niej trafić —
   gdyby klucz był w `.env` wrzuconym do repo, strona by go udostępniła; gdyby go nie było w repo, strona nie mogłaby odkodować modeli.
   Zmiana klucza też nic nie daje: dekoder jest w `js/core/viewer3d.js`. Prawdziwa ochrona wymagałaby serwera z logowaniem (np. Cloudflare Workers),
   a i tak to, co trafi do karty graficznej, da się przechwycić.
3. **Licencja** w opisie (np. „© Patryk Antosik — all rights reserved”) — daje Ci podstawę prawną.
4. **Modele VRoid**: na VRoid Hub możesz zablokować pobieranie, ale plik `.vrm` wrzucony do repo GitHub Pages jest publiczny —
   używaj `.vrm.obf`.

## Postacie (`data/characters.json`)
`images` (pozy), `description`, `tags`, `links`, `model` (`.vrm`, `.glb` lub ich `.obf`) oraz `game`:
```json
"game": { "sprite": "assets/game/characters/remi.png" }
```
Postać z `game` jest grywalna (wybór klawiszem **C**, albo stań na jej karcie i wciśnij **E**).
Opcjonalnie w `game`: `frameWidth`, `frameHeight`, `hitbox`, `animations` — nadpisują domyślne z `data/game.json`.

## Języki
Przełącznik w menu (EN/PL). Język wybiera się sam według przeglądarki i jest zapamiętywany; wymuszenie: `?lang=pl`.
- Interfejs: `data/i18n/<kod>.json`; w HTML `data-i18n="nav.about"`, atrybuty: `data-i18n-attr="aria-label:nav.menu"`.
- Treść: `{"en": "...", "pl": "..."}` w dowolnym polu tekstowym.
- **Nowy język:** dopisz go w `data/i18n/languages.json`, skopiuj `en.json` jako `<kod>.json`, przetłumacz.
  Braki pokazują się w języku domyślnym, a w konsoli (F12) jest lista nieprzetłumaczonych tekstów ze ścieżkami.

## Tryb dzień / noc
Przycisk ☀/☾ w menu. Domyślnie według ustawień systemu, wybór jest zapamiętywany.
Kolory obu trybów są w `css/common/tokens.css` (`:root` = dzień, `[data-theme="dark"]` = noc).

## Tryb gry (klawisz **P** albo przycisk **GRAJ**)
Strona jest poziomem: górne krawędzie elementów to platformy, a **boki strony** to ściany, po których można się wspinać.

| Klawisz | Akcja |
|---|---|
| ← → / A D | ruch |
| Spacja / Z / K / ↑ / W | skok, w powietrzu drugi skok |
| dociśnij do boku strony w powietrzu | chwyć się ściany; ↑ wspinaczka (ograniczona wytrzymałość), ↓ zjazd, Spacja odbicie |
| ↓ na platformie | zeskok |
| E | użyj: otwórz projekt / zespół, wróć, wybierz postać, kliknij link |
| F | machnij |
| C | wybór postaci |
| **T** | **wyzwanie** na tej stronie |
| **G** | **garaż** (tuning auta za monety) |
| R | bez wyzwania: na górę strony · w wyzwaniu: od nowa · w grze autem: od nowa |
| Esc | zamyka garaż / wybór postaci, poza tym wyjście z trybu gry |

**Tryb swobodny** (po P): chodzisz po stronie, monet nie ma.

**Wyzwanie (T):** teleport na górę strony, pojawiają się monety, czas rusza przy pierwszym ruchu. Zbierz wszystkie →
rekord czasu, monety do garażu (tylko za pierwsze ukończenie) i odblokowanie następnego poziomu.
W trakcie wyzwania nie da się przejść na inną stronę (ani E, ani kliknięciem), filtry projektów są wyłączone, auto jest niedostępne.
Wyjście z trybu gry (Esc) przerywa wyzwanie.

**Poziomy:** strona główna to hub. Podstrony projektów odblokowują się po kolei, w kolejności kart na stronie głównej
(najpierw siatka projektów, potem modele 3D). Zablokowane mają kłódkę, ukończone — ptaszka. Blokady działają **tylko w trybie gry** —
zwykły odwiedzający zawsze ma dostęp do wszystkiego. Strony zespołów i 404 nie są poziomami (można po nich chodzić, ale nie ma wyzwania).

**Garaż (G):** auto składa się z **karoserii** i **kół** (każde osobno do kupienia, koła mają wspólną animację obrotu)
oraz **tuningu**: sportowe sprężyny (wyższy skok), nitro-skok (drugi skok), klatka bezpieczeństwa (przetrwanie jednej kraksy).
Ceny liczą się same: waga przedmiotu / suma wag × **wszystkie monety możliwe do zdobycia na wszystkich poziomach**,
więc za komplet ukończonych wyzwań kupisz dokładnie wszystko. Przedmiot z `"weight": 0` jest darmowy (startowy).

**Sekret:** gdzieś na stronie głównej, w odpowiednim miejscu, E robi coś specjalnego 🙂 (`data/game.json` → `car.secretAt`).
W grze autem: przeszkody na ziemi przeskakujesz, **drony** latają tuż nad dachem — przelatują nad autem na ziemi,
ale jeśli jesteś jeszcze w powietrzu po skoku, musisz szybko docisnąć **↓**. **Rampa** wybija auto wysoko (auto przechyla się do tyłu).

**Auto w `data/game.json` → `car`** (wszystkie obrazki w `assets/game/car/`):
```jsonc
"bodies":    [{ "id": "midnight", "name": {"en": "Midnight", "pl": "Północ"}, "sprite": "assets/game/car/bodies/midnight.png", "weight": 1 }],
"wheels":    [{ "id": "sport", "name": {...}, "sprite": "assets/game/car/wheels/sport.png", "weight": 1 }],
"upgrades":  [{ "id": "shield", "name": {...}, "description": {...}, "icon": "assets/game/car/upgrades/shield.png", "weight": 3 }],
"obstacles": [{ "id": "drone", "sprite": "assets/game/car/obstacles/drone.png", "kind": "air", "frames": 2, "fps": 10, "chance": 2 }],
"wheelAnchors": [[4, 8], [22, 8]]      // lewy górny róg każdego koła na karoserii (w pikselach sprite'a)
```
- karoseria: 32×16 px **bez kół**; koła: pasek `wheelFrames` klatek po `wheelSize` px (np. 4 klatki 8×8 → 32×8);
- przeszkody: `kind` = `ground` (przeskocz), `air` (dron — pojawia się zaraz za przeszkodą naziemną), `ramp` (rampa);
  `chance` = jak często; animowane — klatki obok siebie + `frames`, `fps`;
- id tuningu (`springs`, `doubleJump`, `shield`) są w kodzie gry — nazwy, opisy, ikony i ceny zmieniasz w JSON.

### Strona „Portfolio ukończone!” (`finale.html`)
Po ukończeniu wyzwania na **ostatnim** poziomie gra sama przenosi na `finale.html`: fajerwerki na całej stronie,
animowany napis „Gratulacje!”, machające wszystkie grywalne postacie i statystyki. Od tej chwili w stopce każdej strony jest
przycisk **„Portfolio ukończone!”**. Wejście na `finale.html` bez ukończenia wszystkiego przenosi na 404.

**Podgląd bez przechodzenia gry:**
- lokalnie: http://localhost:8000/finale.html?preview (działa tylko na `localhost` — na prawdziwej stronie `?preview` nic nie daje);
- albo w konsoli przeglądarki (F12): `maipa.completeAll()` (zalicza wszystkie poziomy + monety), potem odśwież;
  `maipa.resetProgress()` czyści postęp. `maipa.progress()` pokazuje zapisany stan.

Postęp (ukończone poziomy, monety, zakupy) zapisuje się w przeglądarce (`localStorage`: `maipa-progress`).

### Własne sprite'y (Aseprite)
Każda postać ma jeden poziomy pasek klatek 16×16 (`assets/game/characters/<id>.png`), układ wspólny:

| klatki | animacja |
|---|---|
| 0–1 | idle |
| 2–5 | bieg |
| 6 | skok |
| 7 | spadanie |
| 8–9 | machanie |
| 10–11 | wspinaczka |
| 12 | zjazd po ścianie |

Aseprite: **File → Export Sprite Sheet → Sheet type: Horizontal Strip**, bez paddingu. Inny układ/rozmiar ustawisz w `data/game.json` → `player`
(albo per postać w `characters.json` → `game`). Auto: `assets/game/car/` (opis wyżej), moneta: `assets/game/coin.png`.
Obecne sprite'y to placeholdery wygenerowane skryptem `tools/placeholder-sprites.py`.

## Podgląd lokalny
Nie otwieraj plików dwuklikiem (przeglądarka blokuje JSON z dysku). W folderze repo:
```
python -m http.server
```
i wejdź na http://localhost:8000 (404 lokalnie: http://localhost:8000/404.html).

## Struktura
```
index.html, project.html, team.html, 404.html, finale.html
css/common.css          wspólny wygląd — importuje pliki z css/common/:
  common/tokens.css       kolory dzień/noc, fonty, rozmiary
  common/fonts.css, base.css, buttons.css, nav.css, cards.css, viewer.css,
  common/dialogs.css, markdown.css, detail-page.css (project + team), footer.css
css/pages/<strona>.css  wygląd jednej strony: home, project, team, notfound, finale
css/game.css            tryb gry (każda strona)
js/core/                wspólny kod stron (spis w js/core/index.js):
  boot.js                 bootPage() — od tego zaczyna każda strona
  i18n.js, dom.js, storage.js, icons.js, site.js, chrome.js (nagłówek, stopka, motyw, język)
  content.js, markdown.js, media.js (lightbox, wideo), viewer3d.js, vrm.js, levels.js, play.js
js/pages/               jeden plik na stronę: home.js, project.js (+ project/), team.js, notfound.js, finale.js (+ finale/)
js/game/                tryb gry (spis modułów w js/game/index.js):
  index.js                createPlayMode(), pętla gry
  context.js              konfiguracja + wspólny stan „G”
  player.js, physics.js, level.js, input.js, interact.js, challenge.js, progress.js, hud.js, ui.js, render.js, ...
  car/parts.js, car/runner.js, car/garage.js   auto: części, gra, garaż
js/vendor/              model-viewer, three.js + three-vrm (bez CDN)
data/                   TREŚĆ
assets/game/            sprite'y gry (postacie, moneta, auto: car/bodies, wheels, obstacles, upgrades)
schemas/                schematy JSON (podpowiedzi w VS Code)
tools/                  optimize-images.py, obfuscate-model.py, validate-data.py, placeholder-sprites.py
```

**Nowa strona:** skopiuj np. `team.html`, podmień `css/pages/…css` i `js/pages/…js`; w JS:
`import { bootPage } from '../core/index.js'; bootPage({ page: 'nazwa', render(data) { … } });`
**Nowa funkcja gry:** nowy plik w `js/game/` z `export function installCośTam(G) { G.mojaFunkcja = … }`
i jedno wywołanie w `js/game/index.js`.
