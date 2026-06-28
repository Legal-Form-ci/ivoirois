import DOMPurify from 'dompurify';

const SAFE_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
  'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img',
  'hr', 'sub', 'sup', 'mark', 'audio', 'video', 'source'
];
const SAFE_ATTRS = [
  'href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class',
  'colspan', 'rowspan', 'controls', 'preload', 'poster', 'playsinline',
  'aria-label', 'title'
];

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: SAFE_TAGS,
    ALLOWED_ATTR: SAFE_ATTRS,
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload'],
  });
}