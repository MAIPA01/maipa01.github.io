# MAIPA — portfolio

Strona: https://maipa01.github.io

Strona jest w czystym HTML/CSS/JS — **bez kroku budowania**. Cała treść siedzi w plikach JSON w folderze `data/`.
Zmieniasz JSON → commit → po ~1 minucie zmiana jest na stronie.

## Gdzie co edytować

| Plik | Co zawiera |
|---|---|
| `data/profile.json` | imię, role w hero, tekst „O mnie”, statystyki, karty umiejętności |
| `data/i18n/*.json` | **tłumaczenia interfejsu**: menu, przyciski, tytuły sekcji, stopka, teksty gry (patrz niżej) |
| `data/characters.json` | Twoje postacie (MAIPA-Chan i kolejne) — pozy, opis, linki, opcjonalny model 3D |
| `data/socials.json` | kontakty i social media (LinkedIn, email, GitHub, YouTube, itch.io, Google Play, VRoid Hub) |
| `data/projects.json` | projekty: gry, silniki, renderery, biblioteki + kategorie (filtry) |
| `data/models.json` | rendery (zdjęcia) i interaktywne modele 3D (.glb) |
| `data/game.json` | ustawienia trybu gry: sprite'y, fizyka, które elementy są platformami |

### Zasady
- **Ukrycie elementu bez kasowania:** dodaj `"hidden": true` (projekty, postacie, modele, rendery, kontakty, statystyki, umiejętności).
- **Kontakt bez linku jest ukryty:** `"url": ""` chowa pozycję.
- Wszystko oznaczone `TODO` to miejsca do uzupełnienia.

## Języki (tłumaczenia)
Strona ma przełącznik języka w menu (teraz **EN** i **PL**). Język wybiera się sam według przeglądarki, potem jest zapamiętywany; można też wymusić go linkiem, np. `https://maipa01.github.io/?lang=pl`.

Teksty są w dwóch miejscach:
1. **Interfejs** (menu, przyciski, tytuły sekcji, stopka, gra) — `data/i18n/en.json`, `data/i18n/pl.json`.
   W `index.html` element z `data-i18n="nav.about"` bierze tekst z klucza `nav.about`;
   `data-i18n-attr="aria-label:nav.menu"` tłumaczy atrybut.
2. **Treść** (opisy projektów, „O mnie”, postacie…) — w plikach `data/*.json` każde pole tekstowe może być:
   - zwykłym tekstem: `"title": "Stack"` (taki sam we wszystkich językach), albo
   - obiektem z językami: `"description": { "en": "Space shooter.", "pl": "Kosmiczna strzelanka." }`.

### Dodanie nowego języka (np. niemieckiego)
1. W `data/i18n/languages.json` dopisz `{ "code": "de", "label": "Deutsch", "short": "DE" }`.
2. Skopiuj `data/i18n/en.json` jako `data/i18n/de.json` i przetłumacz wartości (klucze zostaw).
3. W plikach z treścią dopisuj `"de": "..."` obok `"en"`/`"pl"` — możesz to robić stopniowo.

Wszystko, czego brakuje, wyświetla się w języku domyślnym (`"default"` w `languages.json`), a w konsoli przeglądarki
(F12 → Console) pojawia się lista nieprzetłumaczonych tekstów z dokładną ścieżką — łatwo znaleźć, co jeszcze zostało.

## Postacie
`data/characters.json` — każda postać to karta z:
- `images` — lista póz (PNG z przezroczystym tłem, ok. 800 px wysokości). Pod obrazkiem pojawiają się kropki do przełączania póz, kliknięcie powiększa.
- `description`, `tags`, `links` (np. `{ "type": "vroid", "url": "..." }`).
- `model` — opcjonalnie plik `.glb`; wtedy na karcie jest przycisk „Zobacz w 3D”.
  VRoid Studio eksportuje `.vrm` — najprościej zaimportować go do Blendera (dodatek *VRM Add-on for Blender*) i wyeksportować jako `.glb`.

Nowa postać: skopiuj blok `"TODO: next character"`, ustaw `"hidden": false`, wrzuć obrazki do `images/characters/<nazwa>/`.
Sekcja i link w menu chowają się same, gdy nie ma żadnej widocznej postaci.

## Font
Tytuły sekcji: **Exo 2 Black Italic** (ma cyfry i polskie znaki). Napis **MAIPA** (logo i hero) zostaje w oryginalnym foncie Viper.
Font zmienisz w `css/main.css` — zmienne `--font-title` i `--font-logo` na górze pliku.

### Projekt — przykład
```json
{
  "title": "Mój silnik",
  "category": "engine",
  "year": "2025",
  "image": "images/projects/moj-silnik.jpg",
  "imageFit": "cover",
  "description": { "en": "C++ engine with ECS and an editor.", "pl": "Silnik w C++ z ECS i edytorem." },
  "tags": ["C++", "OpenGL", "ECS"],
  "featured": true,
  "links": [
    { "type": "github", "url": "https://github.com/MAIPA01/moj-silnik" },
    { "type": "youtube", "url": "https://youtu.be/..." }
  ]
}
```
- `category` — `id` z listy `categories` (domyślnie `game`, `engine`, `library`; możesz dopisać własne, np. `{ "id": "tool", "label": "Tools" }`).
- `links[].type` — `github`, `itch`, `playstore`, `youtube`, `web`, `download`, `docs`, `vroid`. Pierwszy link jest głównym przyciskiem.
  Opcjonalnie `"label"` zmienia napis na przycisku.
- `featured: true` — projekt idzie na początek listy z czerwonym badge.
- `imageFit: "contain"` — pokazuje cały obrazek (dobre dla kwadratowych ikon aplikacji); bez tego obrazek wypełnia kartę (zrzuty ekranu 16:10).
- Brak `image` → karta dostaje pixel-artowy placeholder z ikoną kategorii.
- Filtr **Google Play** pojawia się sam, jeśli któryś projekt ma link `playstore`.

### Modele 3D
1. W Blenderze: **File → Export → glTF 2.0**, format **glTF Binary (.glb)**, zaznacz *Apply Modifiers*; przy dużych modelach włącz kompresję *Draco*.
2. Wrzuć plik do `models/`.
3. Dopisz wpis w `data/models.json`:
```json
{ "title": "Dodge Challenger", "src": "models/challenger.glb", "poster": "images/renders/challenger-side.jpg",
  "description": { "en": "My car model.", "pl": "Mój model auta." }, "autoRotate": true, "cameraOrbit": "30deg 75deg auto" }
```
Przeglądarka modeli (Google `<model-viewer>`, plik `js/vendor/model-viewer.min.js`) ładuje się dopiero, gdy użytkownik przewinie do sekcji 3D, więc nie spowalnia strony. Trzymaj pliki .glb najlepiej poniżej ~15 MB.

## Tryb gry (klawisz **P** albo przycisk **PLAY**)
Strona sama jest poziomem: górne krawędzie kart projektów, nagłówków itd. są platformami. Postać spada przez portfolio, zbiera monety nad projektami, a na karcie projektu `E` otwiera jego link.

Sterowanie: `← →` / `A D` ruch · `Spacja` / `↑` skok (podwójny) · `↓` zeskok z platformy · `E` otwórz · `R` powrót na górę · `Esc` wyjście. Na telefonie są przyciski na ekranie.

### Własne sprite'y z Aseprite
1. Narysuj animacje w jednym pliku (np. 16×16 px na klatkę).
2. **File → Export Sprite Sheet** → *Sheet type: Horizontal Strip*, bez paddingu → zapisz jako `assets/game/player.png`.
3. W `data/game.json` ustaw `frameWidth`/`frameHeight` i numery klatek (liczone od 0, od lewej) dla `idle`, `run`, `jump`, `fall`.
4. `hitbox` = prostokąt kolizji w pikselach sprite'a (bez przezroczystych brzegów).
5. Moneta: `assets/game/coin.png` — ta sama zasada.

Obecne sprite'y to placeholder (pixelowa MAIPA-Chan) wygenerowany skryptem — podmień na swoje.
Więcej pomysłów na rozwinięcie gry: [`GAME_IDEA.md`](GAME_IDEA.md).

## Podgląd lokalny
`fetch()` nie działa z `file://`, więc nie otwieraj `index.html` dwuklikiem. Zamiast tego w folderze repo:
```
python -m http.server
```
i wejdź na http://localhost:8000.

## Struktura
```
index.html            szkielet strony
css/main.css          wygląd (kolory na górze pliku w :root)
js/app.js             renderuje stronę z JSON-ów
js/i18n.js            tłumaczenia (data-i18n, przełącznik języka)
js/icons.js           ikony SVG (Simple Icons, CC0)
js/game/playmode.js   tryb gry
js/vendor/            model-viewer (bez CDN)
data/                 TREŚĆ — to edytujesz
data/i18n/            tłumaczenia interfejsu
images/characters/    pozy postaci
assets/game/          sprite'y gry
images/renders/       rendery auta (zoptymalizowane JPG)
images/projects/      obrazki projektów
models/               modele .glb
Old/, Instalatory/    stara strona i instalatory gier (linki do pobrania nadal działają)
```
