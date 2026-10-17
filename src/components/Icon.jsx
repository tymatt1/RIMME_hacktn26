export default function Icon({ name = 'arrow', size = 20 }) {
  const paths = {
    arrow: <path d="M4 12h15M13 5l7 7-7 7" />,
    back: <path d="M20 12H5m6-7-7 7 7 7" />,
    check: <path d="m5 12 4 4L19 6" />,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    home: <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M2 21v-3a7 7 0 0 1 14 0v3M16 5a3 3 0 0 1 0 6m3 4a6 6 0 0 1 3 6" /></>,
    leaf: <path d="M20 3C8 2 2 7 5 15c7 5 14-1 15-12ZM4 21l11-12" />,
    list: <path d="M10 6h11M10 12h11M10 18h11m-19-12 2 2 3-4m-5 8 2 2 3-4m-5 8 2 2 3-4" />,
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    chat: <><path d="M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4Z" /><path d="M8 10h8m-8 4h5" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    book: <path d="M12 5c-4-3-8-2-10-1v15c3-2 7-2 10 0 3-2 7-2 10 0V4c-2-1-6-2-10 1Zm0 0v14" />,
    edit: <path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z" />,
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
    shield: <><path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Z" /><path d="m8 11 3 3 5-6" /></>,
    plus: <path d="M12 4v16M4 12h16" />,
    minus: <path d="M4 12h16" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    external: <path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7" />,
    bridge: <path d="M2 19h20M3 15h18M5 15V7m14 8V7M5 9c4 6 10 6 14 0M9 12v3m6-3v3M5 7V4m14 3V4" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.arrow}</svg>
}
