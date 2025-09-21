# GTrender

Een kleine web-app om een GorillaTag playermodel te kleuren, poseren en aankleden. Ideaal om snel een render te maken die je direct kunt downloaden. Alle logica draait volledig in de browser met behulp van [three.js](https://threejs.org/), dus je kunt de site eenvoudig hosten op GitHub Pages.

## Features

- RGB-schuiven met waarden van 0 tot 9 (zoals in GorillaTag) inclusief live kleurvoorbeeld en hex-code
- Meerdere poses die lokaal uit GLB-bestanden geladen worden
- Cosmetics die je kunt combineren (feesthoed, borst-badge en neon polsbanden)
- Orbit controls voor de camera en een simpele studiosetting met belichting en vloer
- Download-knop om de WebGL render direct als PNG op te slaan

## Bestanden

```
assets/          3D modellen (GLB)
index.html       Mark-up en script tags
script.js        Logica voor three.js, UI-koppelingen en cosmetics
style.css        Styling van de interface
```

## Lokaal testen

Je hebt geen build-stap nodig. Open `index.html` direct in een moderne browser of gebruik een statische webserver voor live-reloads, bijvoorbeeld:

```bash
npx serve .
```

## Deploy naar GitHub Pages

1. Commit en push je wijzigingen naar de `main` branch van deze repository.
2. Ga in GitHub naar **Settings → Pages**.
3. Kies als source `Deploy from a branch` en selecteer `main` + de root map (`/`).
4. Na de build verschijnt je site op `https://<gebruikersnaam>.github.io/GTrender/`.

Veel plezier met het maken van Gorilla renders! 🎉
