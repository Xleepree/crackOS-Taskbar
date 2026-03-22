/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import St from 'gi://St';

import { taskbarHover } from './transitions.js';
import { CrackOSTaskbarControlPanel, CrackOSTaskbarDateTimePanel } from './tray.js';
import { CrackOSTaskbarDock } from './dock.js';

export default class CrackOSTaskbar {
    enable() {
        // main boxes
            this.taskbar = new St.BoxLayout({
                style_class: 'crackos-taskbar',
                vertical: false,
                reactive: true,
                can_focus: true,
                track_hover: true
            });

            this.leftBox = new St.BoxLayout({
                style_class: 'crackos-taskbar-left'
            });

            this.centerBox = new St.BoxLayout({
                style_class: 'crackos-taskbar-center'
            });

            this.rightBox = new St.BoxLayout({
                style_class: 'crackos-taskbar-right'
            });
            this.taskbar.add_child(this.leftBox);
            this.taskbar.add_child(this.centerBox);
            this.taskbar.add_child(this.rightBox);
        //

        // taskbar stuffs
            // leftBox
                let sprintButton = new St.Button({
                    label: 'X',
                    style_class: 'crackos-taskbar-sprintbutton',
                    reactive: true,
                    track_hover: true
                });
                this.leftBox.add_child(sprintButton);
            //

            // centerBox
                this.dock = new CrackOSTaskbarDock(this.centerBox);
            //

            // rightBox
                this.controlPanel = new CrackOSTaskbarControlPanel();
                this.dateTimePanel = new CrackOSTaskbarDateTimePanel();
                this.rightBox.add_child(this.controlPanel.actor);
                this.rightBox.add_child(this.dateTimePanel.actor);
            //

            let taskbarStuffs = [
                sprintButton,
                ...this.centerBox.get_children(),
                this.controlPanel.actor,
                this.dateTimePanel.actor
            ];
            taskbarStuffs.forEach(actor => taskbarHover(actor));
        //

        Main.layoutManager.addChrome(this.taskbar, {
            trackFullscreen: true
        });

        this._allocationSignal = this.taskbar.connect(
            'allocation-changed', 
            () => this._reposition()
        );
        this._monitorSignal = Main.layoutManager.connect(
            'monitors-changed',
            () => this._reposition()
        );
    }

    disable() {
        if (this._monitorSignal) {
            Main.layoutManager.disconnect(this._monitorSignal);
            this._monitorSignal = null;
        }
        if (this._allocationSignal) {
            Main.layoutManager.disconnect(this._allocationSignal);
            this._allocationSignal = null;
        }

        if (this.controlPanel) {
            this.controlPanel.destroy();
            this.controlPanel = null;
        }

        if (this.dock) {
            this.dock.destroy();
            this.dock = null;
        }

        if (this.taskbar) {
            this.taskbar.destroy();
            this.taskbar = null;
        }
    }

    _reposition() {
        let monitor = Main.layoutManager.primaryMonitor;

        let [minWidth, natWidth] = taskbar.get_preferred_width(-1);
        let [minHeight, natHeight] = taskbar.get_preferred_height(natWidth);

        this.taskbar.set_position(
            monitor.x + (monitor.width - natWidth) / 2,
            monitor.y + monitor.height - natHeight - 12
        );
    }
}