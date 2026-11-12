/** One form layout breakpoint. `name` is stored on the form and used in data attributes. */
export interface FormBreakpointConfig {
  name: string
  label?: string
  /** Builder canvas max width in pixels. `null` or omit for the full stage. */
  maxWidth?: number | null
}

/** Form addon settings. Read from the main CMS config as `katecms.form`. */
export interface FormConfig {
  /** Absolute directory for files submitted through forms. Empty uses `data/katecms-form`. */
  uploadDir?: string
  /** Largest accepted upload, in bytes. */
  maxFileBytes?: number
  breakpoints?: FormBreakpointConfig[]
}

export interface ResolvedFormBreakpoint {
  name: string
  label: string
  maxWidth: number | null
}

export interface ResolvedFormConfig {
  uploadDir: string
  maxFileBytes: number
  breakpoints: ResolvedFormBreakpoint[]
}
