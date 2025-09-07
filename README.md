## Obsidian Pandoc Inline Citations

Displays a formatted reference list in the sidebar and renders inline Pandoc citations in your notes.

#### Update Summary

Adds support for ignoring aliased citations (`[[@key|Alias]]`), allowing Obsidian to render the alias text natively while retaining Pandoc rendering for standard citations (`[[@key]]`).

### What’s New
- Live Preview now skips aliased wikilinks so Obsidian renders the alias text natively:
  - `[[@key|Alias]]` → shows `Alias` (unchanged, clickable)
- Non‑aliased citations continue to render as CSL/Pandoc-formatted text:
  - `[[@key]]` → e.g., `(Klein 2022)`
  - `[@key]`, groups, locators, suppress/author‑only, etc., remain supported

### Acknowledgements 👏 🎉

This project builds on the excellent work of [mgmeyers](https://github.com/mgmeyers), the original creator of the [Pandoc Reference List](https://github.com/mgmeyers/obsidian-pandoc-reference-list) Obsidian plugin.  

- **Plugin name**: Pandoc Reference List  
- **Author**: mgmeyers  
- **Version**: 2.0.25  
- **Repository**: [github.com/mgmeyers/obsidian-pandoc-reference-list](https://github.com/mgmeyers/obsidian-pandoc-reference-list)  

The original plugin provides the full functionality for rendering Pandoc-style references in Obsidian. My contribution is a minor adjustment to better fit my workflow: ensuring that aliased citations (e.g., `[[@Key|Alias]]`) are left untouched so Obsidian can display the alias natively, while non-aliased citations continue to render with Pandoc formatting.  

<img src="https://raw.githubusercontent.com/mgmeyers/obsidian-pandoc-reference-list/main/Screen%20Shot.png" alt="A screenshot of the plugin's works cited list">

I’m grateful for the robust foundation built by the original project — my update would not exist without it.

### Setup
- Ensure [Pandoc](https://pandoc.org/) is installed. Requires Pandoc ≥ 2.11
- Provide a path to your bibliography file (plugin settings)
- Optional: provide a path or URL to a [CSL style](https://citationstyles.org/)
- Run "Pandoc Reference List: Show reference list" from the command palette to open the sidebar



## Manual Install (build from source)
This plugin isn’t in the Community Plugins browser. You can build and install it locally.

### Prerequisites
- Node.js (LTS recommended) and a package manager (`yarn` or `npm`)
- Pandoc ≥ 2.11 installed and available on PATH

### Build
```bash
git clone https://github.com/sjelms/obsidian-pandoc-inline-citations.git
cd obsidian-pandoc-inline-citations
# install dependencies
yarn install   # or: npm install
# build release bundle
yarn build     # or: node esbuild.config.mjs production
```

### Install into your vault
Copy the compiled files into your vault’s plugins folder:

```text
<your-vault>/.obsidian/plugins/obsidian-pandoc-inline-citations/
```

Place these files there:
- `main.js`
- `manifest.json`
- `styles.css`

If you prefer, copy the whole prepared folder:
`plugin-dist/obsidian-pandoc-inline-citations` → `<your-vault>/.obsidian/plugins/`

Then, in Obsidian:
- Settings → Community plugins → Turn off Safe mode (if needed)
- Enable “Pandoc Inline Citations”

## Usage Notes
- Aliased wikilinks are left untouched by the renderer (`[[@key|Alias]]`), so they display exactly as typed.
- Non‑aliased citations in text or wikilinks are rendered inline using your selected CSL style.
- The sidebar reference list updates based on citekeys present in the active file.

## Troubleshooting
- If inline rendering doesn’t appear, make sure:
  - A bibliography is set in plugin settings or via frontmatter
  - Pandoc is installed and discoverable (set a fallback path in settings if needed)
  - For Zotero-based setups, confirm Zotero connectivity is configured
