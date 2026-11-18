# MAIPA — portfolio

Strona: https://maipa01.github.io

Czysty HTML/CSS/JS — **bez kroku budowania**. Cała treść jest w plikach JSON w `data/`.
Zmieniasz JSON → commit → po ~1 minucie zmiana jest na stronie (odśwież z Ctrl+F5).

## Strony
| Adres | Co to jest |
|---|---|
| `index.html` | strona główna |
| `project.html?id=<id>` | **strona projektu** — jeden szablon dla wszystkich projektów, generuje się z `data/projects.json` |
| `404.html` | „nie znaleziono” — GitHub Pages pokazuje ją sam dla każdego złego adresu |

Nagłówek, stopka, tryb dzień/noc, wybór języka i tryb gry działają na każdej stronie (`js/core.js`).

## Gdzie co edytować
| Plik | Co zawiera |
|---|---|
| `data/profile.json` | imię, role w hero, „O mnie”, statystyki, karty umiejętności |
| `data/projects.json` | projekty (gry, silniki, biblioteki, aplikacje, **modele 3D**) + kategorie |
| `data/characters.json` | postacie (pozy, opis, model VRM/GLB, sprite do gry) |
| `data/socials.json` | kontakty i social media |
| `data/game.json` | tryb gry: fizyka, platformy, auto, animacje |
| `data/i18n/*.json` | tłumaczenia interfejsu (menu, przyciski, tytuły sekcji, teksty gry) |

Ogólne zasady: każdy tekst może być zwykłym napisem albo `{"en": "...", "pl": "..."}`;
`"hidden": true` chowa element bez kasowania; link z pustym `"url"` jest ukryty.

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

  "videos": [ { "url": "https://vimeo.com/123", "title": "Gameplay" } ],   // + automatycznie linki youtube/vimeo z "links"

  "webBuild": { "url": "https://.../index.html", "aspect": "16/9" },       // gra w przeglądarce (iframe, ładuje się po kliknięciu)

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

  "team": {                                // zespół (pokazuje się po prawej)
    "name": "Twin^2 Team", "url": "https://...",
    "description": { "en": "...", "pl": "..." },
    "members": [
      { "name": "Patryk Antosik", "role": { "en": "Engine & graphics", "pl": "Silnik i grafika" }, "url": "https://github.com/MAIPA01", "me": true },
      { "name": "...", "role": "...", "url": "" }
    ]
  },
  "myRole": { "items": [ { "en": "Rendering pipeline", "pl": "Pipeline renderingu" } ] },   // czym się zajmowałem

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

W projektach jest już szablon `team` i `myRole` z `"hidden": true` i wpisami `TODO` — uzupełnij i usuń `"hidden"`.

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
Kolory obu trybów są w `css/main.css` na górze (`:root` = dzień, `[data-theme="dark"]` = noc).

## Tryb gry (klawisz **P** albo przycisk **GRAJ**)
Strona jest poziomem: górne krawędzie elementów to platformy, boki to ściany.

| Klawisz | Akcja |
|---|---|
| ← → / A D | ruch |
| Spacja / Z / K (lub ↑ na ziemi) | skok, w powietrzu drugi skok |
| dociśnij do ściany w powietrzu | chwyć się ściany |
| ↑ / ↓ na ścianie | wspinaczka (ograniczona wytrzymałość — postać miga, gdy się kończy) / szybszy zjazd |
| Spacja na ścianie | odbicie od ściany |
| ↓ na platformie | zeskok |
| E | użyj: otwórz projekt, wróć, wybierz postać, kliknij link, wsiądź/wysiądź z auta |
| F | machnij (w aucie: klakson) |
| C | wybór postaci |
| R | od nowa (reset monet i czasu) |
| Esc | wyjście |

- **Speedrun:** czas startuje przy pierwszym ruchu, kończy się po zebraniu wszystkich monet; rekord każdej strony zapisuje się w przeglądarce.
- **Wiele stron:** gra zostaje włączona po przejściu na inną stronę. E na karcie projektu otwiera jego podstronę (nowy poziom),
  E na „Wróć” wraca i stawia postać przy tej samej karcie.
- **Sekret:** gdzieś na stronie głównej stoi ukryte auto 🙂 (`data/game.json` → `car.hideAt`).

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
(albo per postać w `characters.json` → `game`). Auto: `assets/game/car.png` (2 klatki 32×16), moneta: `assets/game/coin.png`.
Obecne sprite'y to placeholdery wygenerowane skryptem `tools/placeholder-sprites.py`.

## Podgląd lokalny
Nie otwieraj plików dwuklikiem (przeglądarka blokuje JSON z dysku). W folderze repo:
```
python -m http.server
```
i wejdź na http://localhost:8000 (404 lokalnie: http://localhost:8000/404.html).

## Struktura
```
index.html, project.html, 404.html
css/main.css            wygląd (kolory dzień/noc na górze)
js/core.js              wspólne: nagłówek, stopka, motyw, język, lightbox, wideo, podgląd 3D, markdown, gra
js/app.js               strona główna
js/project.js           podstrona projektu
js/notfound.js          404
js/vrm.js               podgląd postaci VRM
js/i18n.js, js/icons.js tłumaczenia, ikony (Simple Icons, CC0)
js/game/playmode.js     tryb gry
js/vendor/              model-viewer, three.js + three-vrm (bez CDN)
data/                   TREŚĆ
assets/game/            sprite'y gry
tools/                  optimize-images.py, obfuscate-model.py, placeholder-sprites.py
```
