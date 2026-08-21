export const CSS_TOOLKIT = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
.font-display { font-family: 'Archivo', sans-serif; }
.font-body { font-family: 'IBM Plex Sans', sans-serif; }
.font-mono { font-family: 'IBM Plex Mono', monospace; }

.inp { width:100%; padding:0.55rem 0.75rem; border-radius:0.5rem; border:1px solid #DDE3DA; font-size:0.875rem; font-family:'IBM Plex Sans',sans-serif; outline:none; background:#FFFFFF; color:#16211F; }
.inp:focus { border-color:#1C8C9E; box-shadow:0 0 0 3px rgba(28,140,158,0.15); }
.inp:disabled { background:#E9ECE6; cursor:not-allowed; }
.btn-primary { display:flex; align-items:center; justify-content:center; gap:0.4rem; background:#0B3B45; color:#F2F4EF; font-weight:600; font-size:0.875rem; padding:0.6rem 1rem; border-radius:0.5rem; transition:filter 0.15s; border:none; cursor:pointer; }
.btn-primary:hover { filter:brightness(1.15); }
.btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
.btn-success { display:flex; align-items:center; justify-content:center; gap:0.4rem; background:#2A6E4A; color:#FFFFFF; font-weight:600; font-size:0.875rem; padding:0.5rem 0.8rem; border-radius:0.5rem; border:none; cursor:pointer; }
.btn-success:hover { filter:brightness(1.1); }

.pw-sidebar { background-color:#0B3B45 !important; }
.pw-sidebar, .pw-sidebar * { color:#F2F4EF; }
.pw-sidebar .pw-nav-item { color:#B9CFCE; }
.pw-sidebar .pw-nav-item:hover { background-color:#12505C; }
.pw-sidebar .pw-nav-item-active { background-color:#1C8C9E !important; color:#FFFFFF !important; font-weight:600; }

@media print {
  body * { visibility: hidden; }
  #printable-area, #printable-area *, #printable-receipt, #printable-receipt * { visibility: visible; }
  #printable-area { position: absolute; left: 0; top: 0; width: 100%; }
  #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; max-width: 320px; margin: 0 auto; padding: 10px; background: white; color: black; }
  .no-print { display: none !important; }
}
`;