import React from 'react'
import ReactDOM from 'react-dom/client'
import type { IpcRendererEvent } from 'electron'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// The preload bridge is only available when the app runs inside Electron.
// Plain Vite dev sessions should still boot without crashing.
const ipcRenderer = window.ipcRenderer

if (ipcRenderer) {
  ipcRenderer.on('main-process-message', (_event: IpcRendererEvent, message: unknown) => {
    console.log(message)
  })
}
