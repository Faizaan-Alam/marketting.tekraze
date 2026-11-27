# webapps/

Each sub-folder is one website or web app shown in the **Our Originals** row.

```
webapps/
  my-app/
    meta.json
    thumbnail.png
```

`meta.json`:

```json
{
  "title": "My App",
  "description": "One or two sentences about what it does.",
  "tags": ["React", "API"],
  "thumbnail": "thumbnail.png",
  "liveUrl": "https://myapp.example.com",
  "order": 10
}
```

| Field | Rules |
| --- | --- |
| `title` | 1–60 characters |
| `description` | 1–300 characters |
| `tags` | up to 6, each up to 24 characters |
| `thumbnail` | a file name **inside this folder**; real JPEG/PNG/WebP/AVIF, max 5 MB (SVG is refused) |
| `liveUrl` | optional; public `https://` URL only |
| `order` | optional sort order (lower first) |

Or let the script create it: `npm run webapp:add -- --title "..." --description "..." --url https://... --thumbnail path/to/image.png`.

**Security:** everything in this folder is treated as untrusted. The site never imports, serves or
runs anything from here: it only reads `meta.json` (validated) and copies the thumbnail after
checking its real file type. Live previews open only inside `<iframe sandbox="allow-scripts">`
(no same-origin access, no top navigation, no popups, no forms). A folder containing a built
static site (`index.html`) but no `meta.json` is listed with a default title and no preview; to
preview it, host it on its own domain and set `liveUrl`.
