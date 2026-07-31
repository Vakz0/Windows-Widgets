/** Icônes minimalistes façon Notion (trait fin, sans dépendance externe). */

export function IconExternalLink() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6.5 3H3.5C3.22 3 3 3.22 3 3.5V12.5C3 12.78 3.22 13 3.5 13H12.5C12.78 13 13 12.78 13 12.5V9.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.3 3H13V6.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 3L7 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 6.5H13.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 2V4.2M10.5 2V4.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function IconRelation() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="7.5" y="5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" opacity="0.5" />
    </svg>
  )
}

export function IconSelect() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.5" y="5.5" width="11" height="5" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

export function IconStatus() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 8V2.7M8 8L11.7 11.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function IconCheckbox({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" />
        <path
          d="M5.4 8.1L7.1 9.8L10.6 6.1"
          stroke="var(--bg)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

export function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 4.5H12.5M6 4.5V3.2C6 2.8 6.3 2.5 6.7 2.5H9.3C9.7 2.5 10 2.8 10 3.2V4.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M5 4.5H11V12.2C11 12.6 10.7 13 10.3 13H5.7C5.3 13 5 12.6 5 12.2V4.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M6.75 7V10.5M9.25 7V10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
