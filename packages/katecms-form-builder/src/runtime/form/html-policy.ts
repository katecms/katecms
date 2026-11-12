/** Tags kept in form copy. Scripts, SVG, and event handlers are not in this list. */
export const HTML_ALLOWED_TAGS = [
  'a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 'span', 'strong', 'ul',
]

export const HTML_LINK_ATTRIBUTES = ['href', 'name', 'target', 'rel']
export const HTML_IMAGE_ATTRIBUTES = ['src', 'alt', 'title', 'width', 'height']
export const HTML_BROWSER_ATTRIBUTES = [...HTML_LINK_ATTRIBUTES, ...HTML_IMAGE_ATTRIBUTES]
