import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import St from 'gi://St';
import Shell from 'gi://Shell';
import GLib from 'gi://GLib';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import Clutter from 'gi://Clutter';

import { taskbarHover, animateActor } from './transitions.js';
import { appIcon } from './icons.js';

export class CrackOSTaskbarDock {
    constructor(centerBox) {
        this.centerBox = centerBox;
        this._init();
    }

    _init() {
        this._tracker = Shell.WindowTracker.get_default();
        this._appButtons = new Map();
        this._appAge = new Map();
        this._workspace = global.workspace_manager.get_active_workspace();

        this._windowCreatedSignal =
            global.display.connect('window-created',
                () => this._refresh());
        this._restackedSignal =
            global.display.connect('restacked',
                () => this._refresh());
        this._windowRemovedSignal =
            this._workspace.connect('window-removed',
                () => this._refresh());
        this._appStateSignal =
            this._tracker.connect('notify::focus-app',
                () => this._refresh());
        this._workspaceChangedSignal =
            global.workspace_manager.connect('active-workspace-changed', () => {
                if (this._workspace && this._windowRemovedSignal) {
                    this._workspace.disconnect(this._windowRemovedSignal);
                }
                this._workspace = global.workspace_manager.get_active_workspace();
                this._windowRemovedSignal =
                    this._workspace.connect('window-removed', () => this._refresh());
                this._refresh();
            });

        this._refresh();
    }

    _refresh() {
        let workspace = global.workspace_manager.get_active_workspace();
        let windows = global.get_window_actors()
            .map(actor => actor.meta_window);
        let appWindows = new Map();

        for (let win of windows) {
            if (win.skip_taskbar) { continue; }
            let app = this._tracker.get_window_app(win);
            if (!app) { continue; }
            if (win.get_workspace() !== workspace) { continue; }
            let appId = app.get_id();
            if (!appWindows.has(appId)) {
                appWindows.set(appId, {
                    app: app,
                    windows: []
                });
                if (!this._appAge.has(appId)) { this._appAge.set(appId, Date.now()); }
            }
            appWindows.get(appId).windows.push(win);
        }

        let sortedApps = Array.from(appWindows.entries())
            .sort((a, b) => this._appAge.get(a[0]) - this._appAge.get(b[0]));

        let x = 0;
        const spacing = 7;
        for (let [appId, data] of sortedApps) {
            let button = this._appButtons.get(appId);
            if (!button) {
                let icon = appIcon(data.app.get_icon());
                button = new St.Button({
                    style_class: 'crackos-taskbar-runningapps',
                    child: icon,
                    reactive: true,
                    track_hover: true,
                    opacity: 0,
                    x
                });
                button.connect('clicked', () => {
                    let wins = data.windows;
                    if (wins.length === 1) {
                        let win = wins[0];
                        win.has_focus() ? win.minimize() : win.activate(global.get_current_time());
                    } else {
                        let focused = wins.find(w => w.has_focus());
                        focused ? focused.minimize() : wins[0].activate(global.get_current_time());
                    }
                });
                secondaryMenu(button, data.app, () => {
                    let workspace = global.workspace_manager.get_active_workspace();
                    return global.get_window_actors()
                        .map(a => a.meta_window)
                        .filter(win =>
                            !win.skip_taskbar &&
                            this._tracker.get_window_app(win)?.get_id() === appId &&
                            win.get_workspace() === workspace
                        );
                });
                taskbarHover(button);
                this.centerBox.add_child(button);
                this._appButtons.set(appId, button);
                animateActor(button, { opacity: 255, x });
            } else {
                animateActor(button, { x });
            }
            x += button.width + spacing;
        }

        for (const [appId, button] of this._appButtons) {
            if (!appWindows.has(appId)) {
                animateActor(button, { opacity: 0, duration: 150 });
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
                    if (button && button.get_parent()) {
                        button.destroy();
                        this._appButtons.delete(appId);
                        this._appAge.delete(appId);
                    };
                    return GLib.SOURCE_REMOVE;
                });
            }
        }
    }

    destroy() {
        if (this._windowCreatedSignal) {
            global.display.disconnect(this._windowCreatedSignal);
            this._windowCreatedSignal = null;
        }
        if (this._windowRemovedSignal) {
            this._workspace.disconnect(this._windowRemovedSignal);
            this._windowRemovedSignal = null;
        }
        if (this._workspaceChangedSignal) {
            global.workspace_manager.disconnect(this._workspaceChangedSignal);
            this._workspaceChangedSignal = null;
        }
        if (this._restackedSignal) {
            global.display.disconnect(this._restackedSignal);
            this._restackedSignal = null;
        }
        if (this._appStateSignal) {
            this._tracker.disconnect(this._appStateSignal);
            this._appStateSignal = null;
        }
        this.centerBox.get_children().forEach(c => c.destroy());
        this._appButtons.clear();
    }
}

function secondaryMenu(button, app, getWindows) {
    const menu = new PopupMenu.PopupMenu(button, 0.5, St.Side.BOTTOM);
    Main.uiGroup.add_child(menu.actor);
    menu.actor.hide();

    function rebuild() {
        menu.removeAll();

        let windows = getWindows();
        let appInfo = null;
        try { appInfo = app?.get_app_info(); } catch(e) { appInfo = null; }

        if (appInfo) {
            const actions = appInfo.list_actions();
            if (actions.length > 0) {
                for (let action of actions) {
                    let label = appInfo.get_action_name(action);
                    let item = new PopupMenu.PopupMenuItem(label);
                    item.connect('activate', () => appInfo.launch_action(action, null));
                    menu.addMenuItem(item);
                }
                menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            }
        } else {
            let newWin = new PopupMenu.PopupMenuItem('New Window');
            newWin.connect('activate', () => app?.activate());
            menu.addMenuItem(newWin);
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        }

        for (let win of windows) {
            let item = new PopupMenu.PopupMenuItem(win.get_title() || 'Untitled');
            if (win.has_focus()) { item.setOrnament(PopupMenu.Ornament.DOT); } 
            item.connect('activate', () => win.activate(global.get_current_time()));
            menu.addMenuItem(item);
        }

        if (windows.length > 0) {
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            let closeAll = new PopupMenu.PopupMenuItem('Close All');
            closeAll.connect('activate', () => windows.forEach(w => w.delete(global.get_current_time())));
            menu.addMenuItem(closeAll);
        }
    }

    rebuild();
    const tracker = Shell.WindowTracker.get_default();
    const signal = tracker.connect('notify::focus-app', () => rebuild());

    button.connect('destroy', () => {
        tracker.disconnect(signal);
        menu.destroy();
    });

    button.connect('button-press-event', (actor, event) => {
        if (event.get_button() === 3) {
            rebuild();
            menu.toggle();
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    });
}