const { app, BrowserWindow, session, ipcMain, screen } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// requires 'electron-squirrel-startup' module, disabled for dev
// if (require('electron-squirrel-startup')) {
//    app.quit();
// }

let mainWindow;
let overlayWindow;
let isOverlayShowing = false;
let hideOverlayTimer;
let lastTriggerTime = 0;

const createOverlayWindow = () => {
    overlayWindow = new BrowserWindow({
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        focusable: false,
        fullscreenable: true,
        resizable: false,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: true, // Needed for simple script in overlay.html
            contextIsolation: false, // Allowed for this specific internal overlay
        }
    });

    // Path Safety Logic
    const isDev = !app.isPackaged;
    if (isDev) {
        // In dev, Vite serves public folder at root
        overlayWindow.loadURL('http://localhost:5173/overlay.html');
    } else {
        // In prod, public folder content is copied to dist/
        overlayWindow.loadFile(path.join(app.getAppPath(), 'dist', 'overlay.html'));
    }

    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Ensure it doesn't close but just hides
    overlayWindow.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            overlayWindow.hide();
        }
    });
};

const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#111827',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'public/icon.png')
    });

    // Handle Camera Permissions Automatically
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media') {
            callback(true);
        } else {
            callback(false);
        }
    });

    const isDev = !app.isPackaged;
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Initialize Overlay (Hidden)
    createOverlayWindow();
};

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // IPC: Edge Lighting Trigger
    // IPC: Edge Lighting Trigger
    ipcMain.on('SHOW_EDGE_LIGHTING', (event, { enabled, quiet }) => {
        console.log(`[IPC] SHOW_EDGE_LIGHTING received. Enabled: ${enabled}, Quiet: ${quiet}`);
        if (!overlayWindow) {
            console.error('[IPC] Overlay window not found');
            return;
        }
        if (!enabled || quiet) {
            console.log('[IPC] Edge lighting skipped (disabled or quiet)');
            return;
        }

        // Anti-spam Cooldown (8 seconds)
        const now = Date.now();
        if (now - lastTriggerTime < 8000) {
            console.log('[IPC] Edge lighting cooldown');
            return;
        }
        lastTriggerTime = now;

        // Multi-monitor: Find display with cursor
        const point = screen.getCursorScreenPoint();
        const display = screen.getDisplayNearestPoint(point);

        console.log('[IPC] Activating overlay on display:', display.id);
        overlayWindow.setBounds(display.bounds);
        overlayWindow.showInactive(); // Don't steal focus
        overlayWindow.webContents.send('PLAY_ANIMATION');

        if (hideOverlayTimer) clearTimeout(hideOverlayTimer);

        hideOverlayTimer = setTimeout(() => {
            overlayWindow.hide();
        }, 3000);
    });

    // IPC: System Notification (Native OS)
    ipcMain.on('SYSTEM_NOTIFICATION', (event, { title, body }) => {
        const { Notification } = require('electron');
        if (Notification.isSupported()) {
            new Notification({
                title: title,
                body: body,
                icon: path.join(__dirname, 'public/icon.png')
            }).show();
        }
    });

});


app.on('before-quit', () => {
    app.isQuitting = true;
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
