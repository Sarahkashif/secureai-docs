// pdf-parse's package entry runs a debug routine on import; importing the library file directly avoids that.
declare module 'pdf-parse/lib/pdf-parse.js' {
  const pdf: (data: Buffer) => Promise<{ text: string; numpages: number }>
  export default pdf
}
