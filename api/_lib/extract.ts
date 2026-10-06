import mammoth from 'mammoth'
// @ts-ignore -- the deep import has no bundled types (see types.d.ts); works with or without them
import pdf from 'pdf-parse/lib/pdf-parse.js'

export type SupportedMime =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'text/plain'

const BY_EXT: Record<string, SupportedMime> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
}

/** Decides the MIME type from the extension AND verifies the file's real signature. Returns null if they disagree. */
export function detectMime(fileName: string, buf: Buffer): SupportedMime | null {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const mime = BY_EXT[ext]
  if (!mime || buf.length === 0) return null
  if (mime === 'application/pdf') return buf.subarray(0, 5).toString('latin1') === '%PDF-' ? mime : null
  if (ext === 'docx') return buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04 ? mime : null
  // Plain text: reject anything containing NUL bytes (binary).
  return buf.subarray(0, 8192).includes(0) ? null : mime
}

export interface Extracted {
  text: string
  pageCount: number | null
}

export async function extractText(buf: Buffer, mime: SupportedMime): Promise<Extracted> {
  let text = ''
  let pageCount: number | null = null
  if (mime === 'application/pdf') {
    const out = await pdf(buf)
    text = out.text
    pageCount = out.numpages
  } else if (mime === 'text/plain') {
    text = buf.toString('utf8')
  } else {
    text = (await mammoth.extractRawText({ buffer: buf })).value
  }
  // Normalize: drop NULs, unify newlines, collapse runs of blank lines and spaces.
  text = text
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { text, pageCount }
}
