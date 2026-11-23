const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const appData = () => path.join(app.getPath('userData'), 'JaguarX Client');
const settingsPath = () => path.join(appData(), 'settings.json');

function defaults() {
  return {
    profiles: [{ id: 'default', name: 'Principal', version: '1.20.6', loader: 'Vanilla', ram: 4 }],
    selectedProfile: 'default',
    performance: 'balanced',
    cosmetics: { cape: 'none', accent: '#168cff' },
    hud: { showFps: true, showCoords: false, showCps: false, scale: 100 },
    microsoftClientId: ''
  };
}
function ensureData() {
  fs.mkdirSync(appData(), { recursive: true });
  if (!fs.existsSync(settingsPath())) fs.writeFileSync(settingsPath(), JSON.stringify(defaults(), null, 2));
}
function getSettings() {
  ensureData();
  try { return JSON.parse(fs.readFileSync(settingsPath(), 'utf8')); }
  catch { const d = defaults(); fs.writeFileSync(settingsPath(), JSON.stringify(d, null, 2)); return d; }
}
function putSettings(settings) {
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
  return settings;
}
function instanceDir(id) { return path.join(appData(), 'instances', String(id)); }

function createWindow() {
  const win = new BrowserWindow({
    width: 1180, height: 760, minWidth: 920, minHeight: 620,
    backgroundColor: '#05080e', autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  ensureData();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('settings:get', () => getSettings());
ipcMain.handle('settings:save', (_, value) => putSettings(value));
ipcMain.handle('profile:create', (_, data) => {
  const settings = getSettings();
  const profile = {
    id: `profile-${Date.now()}`,
    name: String(data.name || 'Nuevo perfil').slice(0, 32),
    version: String(data.version || '1.20.6'),
    loader: ['Vanilla', 'Fabric', 'Forge', 'NeoForge'].includes(data.loader) ? data.loader : 'Vanilla',
    ram: Math.max(2, Math.min(16, Number(data.ram) || 4))
  };
  settings.profiles.push(profile);
  fs.mkdirSync(path.join(instanceDir(profile.id), 'mods'), { recursive: true });
  putSettings(settings);
  return settings;
});
ipcMain.handle('profile:select', (_, id) => {
  const settings = getSettings();
  if (!settings.profiles.some(p => p.id === id)) throw new Error('Perfil no encontrado');
  settings.selectedProfile = id;
  return putSettings(settings);
});
ipcMain.handle('profile:delete', (_, id) => {
  const settings = getSettings();
  if (settings.profiles.length <= 1) throw new Error('Debes conservar al menos un perfil.');
  settings.profiles = settings.profiles.filter(p => p.id !== id);
  if (settings.selectedProfile === id) settings.selectedProfile = settings.profiles[0].id;
  putSettings(settings);
  return settings;
});
ipcMain.handle('mods:list', (_, id) => {
  const dir = path.join(instanceDir(id), 'mods');
  fs.mkdirSync(dir, { recursive: true });
  return fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.jar'));
});
ipcMain.handle('mods:add', async (_, id) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Mods de Minecraft Java', extensions: ['jar'] }]
  });
  if (result.canceled) return [];
  const dir = path.join(instanceDir(id), 'mods');
  fs.mkdirSync(dir, { recursive: true });
  const copied = [];
  for (const file of result.filePaths) {
    const target = path.join(dir, path.basename(file));
    fs.copyFileSync(file, target);
    copied.push(path.basename(file));
  }
  return copied;
});
ipcMain.handle('mods:remove', (_, id, filename) => {
  const dir = path.join(instanceDir(id), 'mods');
  const target = path.join(dir, path.basename(filename));
  if (fs.existsSync(target)) fs.unlinkSync(target);
  return fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.jar'));
});
ipcMain.handle('folder:open', async (_, kind, id) => {
  const dirs = {
    root: appData(),
    game: instanceDir(id),
    mods: path.join(instanceDir(id), 'mods'),
    resourcepacks: path.join(instanceDir(id), 'resourcepacks')
  };
  const target = dirs[kind] || dirs.root;
  fs.mkdirSync(target, { recursive: true });
  await shell.openPath(target);
  return target;
});
let minecraftAuth = null;
ipcMain.handle('auth:login', async (_, clientId) => {
  const id = String(clientId || '').trim();
  if (!id) throw new Error('Primero debes configurar el ID de aplicación Microsoft.');
  try {
    const { Microsoft } = require('minecraft-java-core');
    if (!Microsoft || typeof Microsoft.auth !== 'function') {
      throw new Error('La versión instalada de minecraft-java-core no expone Microsoft.auth.');
    }
    const auth = await Microsoft.auth({ client_id: id, type: 'electron' });
    if (!auth || auth.error) throw new Error(auth?.error || 'Microsoft no devolvió una sesión válida.');
    minecraftAuth = auth;
    const settings = getSettings();
    settings.microsoftClientId = id;
    putSettings(settings);
    return { ok: true, name: auth.name || auth.username || 'Cuenta Microsoft' };
  } catch (error) {
    throw new Error(`No se pudo iniciar sesión: ${error.message}`);
  }
});
ipcMain.handle('game:launch', async (_, profileData) => {
  if (!minecraftAuth) throw new Error('Inicia sesión con Microsoft antes de jugar.');
  const settings = getSettings();
  const profile = settings.profiles.find(p => p.id === settings.selectedProfile);
  if (!profile) throw new Error('No se encontró el perfil seleccionado.');
  try {
    const { Launch } = require('minecraft-java-core');
    const launcher = new Launch();
    launcher.on('progress', (progress) => BrowserWindow.getAllWindows()[0]?.webContents.send('game:progress', Number(progress) || 0));
    launcher.on('patch', (message) => BrowserWindow.getAllWindows()[0]?.webContents.send('game:log', String(message)));
    launcher.on('data', (message) => BrowserWindow.getAllWindows()[0]?.webContents.send('game:log', String(message)));
    launcher.on('error', (error) => BrowserWindow.getAllWindows()[0]?.webContents.send('game:error', String(error.message || error)));
    const root = path.join(appData(), 'minecraft');
    fs.mkdirSync(root, { recursive: true });
    const loader = profile.loader === 'Vanilla'
      ? { enable: false }
      : { enable: true, type: profile.loader.toLowerCase(), build: 'latest' };
    await launcher.launch({
      root,
      path: root,
      authenticator: minecraftAuth,
      version: profile.version,
      loader,
      memory: { min: '1G', max: `${Math.max(2, Math.min(16, Number(profile.ram) || 4))}G` }
    });
    return { ok: true, message: 'Minecraft se está preparando o se ha iniciado.' };
  } catch (error) {
    throw new Error(`No se pudo iniciar Minecraft: ${error.message}`);
  }
});
ipcMain.handle('external:open', (_, url) => {
  if (url === 'https://www.minecraft.net/download' || url === 'https://fabricmc.net/' ||
      url === 'https://files.minecraftforge.net/' || url === 'https://neoforged.net/') {
    return shell.openExternal(url);
  }
});
