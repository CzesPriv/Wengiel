# Wengiel

Kreskowkowa gra match-3 inspirowana Bejeweled, ale zamiast diamentow zbiera skarby Polskiej ziemi:
wegiel kamienny, bursztyn, wegiel brunatny, miedz, sol kamienna i krzemien pasiasty.

## Uruchomienie

1. Zainstaluj Node.js 24+.
2. W katalogu projektu uruchom `npm start`.
3. Otworz `http://localhost:5173`.

## Sterowanie

- Kliknij dwa sasiednie pola, aby wykonac swap.
- `Strzalki` przesuwaja kursor.
- `Enter` lub `Spacja` wybieraja pole i wykonaja swap.
- `R` restartuje szychtę.
- `F` wlacza lub wylacza pelny ekran.
- `M` przelacza mute/unmute.
- Na telefonie mozesz tapnac dwa sasiednie pola albo wykonac krotki swipe, aby zrobic swap.

## Styl i assety

- Tlo korzysta z papierowej tekstury pobranej z Wikimedia Commons / ambientCG.
- Referencje bryl bursztynu i wegla zostaly pobrane z Wikimedia Commons i zapisane w `assets/references/`.
- Same kafelki skarbow sa autorskimi SVG, narysowanymi w duchu franco-belgijskiej `ligne claire`.
- Tlo dzwiekowe to instrumentalnie syntezowany `Mazurek Dabrowskiego` generowany lokalnie przez Web Audio.
- Duze combo uruchamia deszcz gwiazdek i glos `Jeszcze Polska nie zginela` przez `speechSynthesis`.
- Pasek sterowania ma tez osobny przycisk `Mute [M]`.
- Gra ma osobny uklad mobilny, a fullscreen skaluje canvas tak, by cala plansza miescila sie w viewport.
