# anoshor.com

My portfolio. No framework, no bundler, no `node_modules`. Hosted on GitHub Pages.

## Structure

```
index.html          the whole site — about, skills, experience, projects, publications
assets/site.css     all styling, six themes as CSS custom properties
assets/site.js      theme · clock · reveal · skills tree · copy email · latest commit
CNAME               anoshor.com
```

Three static files. Edit and push; GitHub Pages serves them directly.

## Themes

Six palettes: sakura (default), ink, night, forest, overcast, and mono.
The choice persists in `localStorage`.

Both the theme and the open skill branch are deep-linkable:

```
https://anoshor.com/?theme=sumi
https://anoshor.com/?branch=ai
```

## Local preview

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.
