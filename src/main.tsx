import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
const _w=console.warn;console.warn=function(...a:any[]){const s=typeof a[0]==='string'?a[0]:'';if(s.includes('PCFSoftShadowMap')||s.includes('THREE.Clock'))return;_w.apply(console,a)};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
