const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('jaguarx', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: value => ipcRenderer.invoke('settings:save', value),
  createProfile: value => ipcRenderer.invoke('profile:create', value),
  selectProfile: id => ipcRenderer.invoke('profile:select', id),
  deleteProfile: id => ipcRenderer.invoke('profile:delete', id),
  listMods: id => ipcRenderer.invoke('mods:list', id),
  addMods: id => ipcRenderer.invoke('mods:add', id),
  removeMod: (id, filename) => ipcRenderer.invoke('mods:remove', id, filename),
  openFolder: (kind, id) => ipcRenderer.invoke('folder:open', kind, id),
  loginMicrosoft: clientId => ipcRenderer.invoke('auth:login', clientId),
  launchGame: () => ipcRenderer.invoke('game:launch'),
  onGameProgress: callback => ipcRenderer.on('game:progress', (_, value) => callback(value)),
  onGameLog: callback => ipcRenderer.on('game:log', (_, value) => callback(value)),
  onGameError: callback => ipcRenderer.on('game:error', (_, value) => callback(value)),
  openExternal: url => ipcRenderer.invoke('external:open', url)
});
