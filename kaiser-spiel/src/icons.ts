// Flache Zweiton-Symbole im Polytopia-Stil (viewBox 0 0 32 32)

const svg = (body: string) => `<svg class="ico" viewBox="0 0 32 32" aria-hidden="true">${body}</svg>`;

export const ICONS: Record<string, string> = {
  taler: svg('<circle cx="16" cy="16" r="12" fill="#f2b53b"/><path d="M16 4a12 12 0 0 1 0 24z" fill="#d8962a"/><circle cx="16" cy="16" r="7.5" fill="none" stroke="#fbe3a3" stroke-width="2"/><path d="M13 12h6M16 12v9" stroke="#8a5a12" stroke-width="2.4" stroke-linecap="round"/>'),
  korn: svg('<path d="M16 4l-5 9h10z" fill="#f4c64a"/><path d="M16 4l5 9h-5z" fill="#d9a22a"/><path d="M9 12l-3 7h8z" fill="#f4c64a"/><path d="M23 12l3 7h-8z" fill="#d9a22a"/><path d="M15 13h2v15h-2z" fill="#b07a22"/><path d="M10 20h12l-2 4h-8z" fill="#c98b26"/>'),
  land: svg('<path d="M16 6l12 6-12 6-12-6z" fill="#74c043"/><path d="M4 12l12 6v6L4 18z" fill="#9a6a3c"/><path d="M28 12l-12 6v6l12-6z" fill="#6e4a28"/><path d="M10 12l6 3 6-3" stroke="#5aa83a" stroke-width="1.6" fill="none"/>'),
  volk: svg('<rect x="10" y="5" width="6" height="8" fill="#f2c6a0"/><rect x="16" y="5" width="6" height="8" fill="#dfa982"/><rect x="9" y="14" width="7" height="9" fill="#4f8fe8"/><rect x="16" y="14" width="7" height="9" fill="#2f6fe0"/><rect x="11" y="23" width="4" height="5" fill="#3b3346"/><rect x="17" y="23" width="4" height="5" fill="#2a2433"/>'),
  ansehen: svg('<path d="M16 3l3.8 8 8.7 1-6.4 6 1.7 8.7L16 22.4 8.2 26.7 9.9 18 3.5 12l8.7-1z" fill="#3fc3dc"/><path d="M16 3l3.8 8 8.7 1-6.4 6 1.7 8.7L16 22.4z" fill="#2a9db3"/>'),
  markt: svg('<path d="M4 12l3-6h18l3 6z" fill="#e9566a"/><path d="M10 6h4l-1 6H9zM18 6h4l2 6h-4z" fill="#fff"/><rect x="6" y="12" width="20" height="3" fill="#c23a4e"/><rect x="7" y="15" width="2.5" height="11" fill="#7a4f2e"/><rect x="22.5" y="15" width="2.5" height="11" fill="#5a3a20"/><rect x="10" y="19" width="12" height="7" fill="#c79a5a"/><rect x="16" y="19" width="6" height="7" fill="#a8743f"/>'),
  volkmenu: svg('<rect x="3" y="9" width="5" height="6" fill="#f2c6a0"/><rect x="3" y="16" width="5" height="8" fill="#46a85a"/><rect x="24" y="9" width="5" height="6" fill="#dfa982"/><rect x="24" y="16" width="5" height="8" fill="#e0402f"/><rect x="11" y="5" width="5" height="7" fill="#f2c6a0"/><rect x="16" y="5" width="5" height="7" fill="#dfa982"/><rect x="10" y="13" width="6" height="10" fill="#4f8fe8"/><rect x="16" y="13" width="6" height="10" fill="#2f6fe0"/><rect x="11" y="23" width="4" height="5" fill="#3b3346"/><rect x="17" y="23" width="4" height="5" fill="#2a2433"/>'),
  bauen: svg('<path d="M6 9l9-5 4 4-9 5z" fill="#c9cdd3"/><path d="M15 4l4 4-3 2-4-4z" fill="#9aa3ad"/><path d="M12 12l3-2 11 14-3 3z" fill="#a8743f"/><path d="M15 10l11 14-3 3-11-14z" fill="#7a4f2e" opacity=".6"/>'),
  militaer: svg('<path d="M6 4l16 18-2 2L4 6z" fill="#dfe6ee"/><path d="M26 4L10 22l2 2L28 6z" fill="#c3cad3"/><path d="M8 21l3 3-3 4-3-3zM24 21l-3 3 3 4 3-3z" fill="#7a4f2e"/><path d="M9 19l4 4M23 19l-4 4" stroke="#f2b53b" stroke-width="2.4" stroke-linecap="round"/>'),
  familie: svg('<path d="M16 28L4 15a6.5 6.5 0 0 1 12-7 6.5 6.5 0 0 1 12 7z" fill="#e9566a"/><path d="M16 28V8a6.5 6.5 0 0 1 12 7z" fill="#c23a4e"/>'),
  reich: svg('<path d="M4 24l-1-14 7 6 6-10 6 10 7-6-1 14z" fill="#f2b53b"/><path d="M16 6l6 10 7-6-1 14H16z" fill="#d8962a"/><rect x="4" y="24" width="24" height="4" fill="#c4841f"/><circle cx="16" cy="19" r="2" fill="#e9566a"/>'),
  jahr: svg('<rect x="7" y="3" width="18" height="3" fill="#7a4f2e"/><rect x="7" y="26" width="18" height="3" fill="#7a4f2e"/><path d="M9 6h14c0 6-5 8-5 10s5 4 5 10H9c0-6 5-8 5-10S9 12 9 6z" fill="#fff5dc"/><path d="M11 9h10c-1 3-4 4-5 6-1-2-4-3-5-6zM10 25c1-3 4-5 6-6 2 1 5 3 6 6z" fill="#f2b53b"/>'),
};
export const ico = (name: string) => ICONS[name] || '';
