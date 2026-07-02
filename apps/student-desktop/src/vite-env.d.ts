/// <reference types="vite/client" />
interface Window {
  ipcRenderer: {
    on: (...args: any[]) => any;
    off: (...args: any[]) => any;
    send: (...args: any[]) => any;
    invoke: (...args: any[]) => any;
    exitApp: () => void; // sends 'exit-app' to the main process on logout
  };
}
