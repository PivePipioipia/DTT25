const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    triggerEdgeLighting: (payload) => ipcRenderer.send('SHOW_EDGE_LIGHTING', payload),
    systemNotification: (payload) => ipcRenderer.send('SYSTEM_NOTIFICATION', payload)
});
