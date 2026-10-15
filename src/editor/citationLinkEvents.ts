import { syntaxTree, tokenClassNodeProp } from '@codemirror/language';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { editorInfoField, editorLivePreviewField, Keymap } from 'obsidian';
import { citationLocatorLinkAt, citationNoteTarget } from './citationLinks';
import { bibManagerField } from '../editorExtension';

/** Capture before Obsidian's native source-link handler uses the locator as a filename. */
export const citationLocatorLinkPlugin = ViewPlugin.fromClass(class {
  private eventRoot: Document;
  constructor(private view: EditorView) {
    // Obsidian handles middle-click on a capture listener above view.dom.
    // Use the owning document, but filter every event to this editor's content.
    this.eventRoot = view.dom.ownerDocument;
    this.eventRoot.addEventListener('click', this.onClick, true);
    this.eventRoot.addEventListener('mousedown', this.onMouseDown, true);
    this.eventRoot.addEventListener('mouseover', this.onMouseOver, true);
  }

  private getLink(event: MouseEvent) {
    const element = event.target as HTMLElement;
    if (!element?.closest || !this.view.contentDOM.contains(element)) return null;
    if (!this.view.state.field(bibManagerField)?.plugin.settings.renderLinkCitations) return null;
    const info = this.view.state.field(editorInfoField);
    if (!info?.file) return null;
    // Existing callout DOM can survive a plugin reload. Route those links safely
    // too, without requiring a note or application restart to rebuild the block.
    const anchor = element.closest('a.internal-link') as HTMLAnchorElement;
    if (anchor && this.view.contentDOM.contains(anchor) && !anchor.closest('code, pre')) {
      const raw = anchor.getAttribute('data-href') || anchor.getAttribute('href') || '';
      const target = citationNoteTarget(raw);
      if (target && (anchor.textContent === raw || anchor.querySelector('.pandoc-citation'))) {
        return { target, targetEl: anchor, info };
      }
    }
    const targetEl = element.closest('.cm-hmd-internal-link, .cm-link') as HTMLElement;
    if (!targetEl || !this.view.contentDOM.contains(targetEl) || element.closest('.pandoc-citation')) return null;
    const position = this.view.posAtDOM(element);
    const link = citationLocatorLinkAt(this.view.state.doc, position);
    if (!link) return null;
    const props = syntaxTree(this.view.state).resolveInner(position, 1).type.prop(tokenClassNodeProp);
    if (props && /code|math|templater|hashtag/.test(props)) return null;
    return { ...link, targetEl, info };
  }

  private open(event: MouseEvent) {
    const link = this.getLink(event);
    if (!link) return;
    const newPane = Keymap.isModEvent(event);
    if (event.button === 0 && !newPane && (event.altKey || event.shiftKey)) return;
    if (!this.view.state.field(editorLivePreviewField) && !newPane && event.button !== 1) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    app.workspace.openLinkText(link.target, link.info.file.path, event.button === 1 ? 'tab' : newPane);
  }

  private onClick = (event: MouseEvent) => { if (event.button === 0) this.open(event); };
  private onMouseDown = (event: MouseEvent) => { if (event.button === 1) this.open(event); };
  private onMouseOver = (event: MouseEvent) => {
    const link = this.getLink(event);
    if (!link) return;
    event.stopImmediatePropagation();
    app.workspace.trigger('hover-link', {
      event, source: 'editor', hoverParent: link.info,
      targetEl: link.targetEl, linktext: link.target, sourcePath: link.info.file.path,
    });
  };

  destroy() {
    this.eventRoot.removeEventListener('click', this.onClick, true);
    this.eventRoot.removeEventListener('mousedown', this.onMouseDown, true);
    this.eventRoot.removeEventListener('mouseover', this.onMouseOver, true);
  }
});
