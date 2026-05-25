# WWB / Wuhan Heng Biotech Website

Static GitHub Pages-ready website for a restricted biotech research catalog.

## What is included

- Ecommerce-inspired front page layout with header, navigation, category sidebar, product cards, search, and quote-file behavior.
- Compliance-first copy: no consumer checkout, no public drug pricing, and no medical or dosing content.
- Local visual asset in `assets/lab-vials.jpg`.
- Plain HTML, CSS, and JavaScript. No build step is required.

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish to GitHub Pages

1. Create a new GitHub repository.
2. Push this folder to the repository.
3. In GitHub, go to `Settings` -> `Pages`.
4. Set source to `Deploy from a branch`, branch `main`, folder `/root`.
5. GitHub will provide the public Pages URL after deployment.

## Asset credit

Hero photo source: Pexels, Jess Loiterton, "Clear Glass Vials on Round Container".
