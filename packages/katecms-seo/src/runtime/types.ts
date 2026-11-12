export interface SeoSite {
  siteName: string
  titleSeparator: string
  titleTemplate: string
  description: string
  noindex: boolean
}

export interface SeoEntry {
  title: string
  description: string
  canonical: string
  image: string
  noindex: boolean
  nofollow: boolean
}

export interface SeoImageChoice {
  label: string
  url: string
}

export interface SeoEditorPayload extends SeoEntry {
  fallbackTitle: string
  publicPath: string
  site: SeoSite
  imageChoices: SeoImageChoice[]
}

export interface SeoHead {
  title: string
  description: string
  canonical: string
  image: string
  robots: string | null
  jsonLd: Record<string, unknown>
}

export interface SeoRedirect {
  id: number
  from: string
  to: string
  statusCode: number
}
