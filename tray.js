import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import UPowerGlib from 'gi://UPowerGlib';
import Gvc from 'gi://Gvc';
import NM from 'gi://NM';
import GnomeDesktop from 'gi://GnomeDesktop';

import { controlIconModify, controlIconBlank } from './icons.js';

export class CrackOSTaskbarControlPanel {
    constructor(parentBox) {
        this.actor = new St.BoxLayout({
            vertical: false,
            style_class: 'crackos-taskbar-controlpanel',
            reactive: true,
            track_hover: true,
            can_focus: true
        });
        this._setupIcons();
        this._setupVolume();
        this._setupBattery();
        this._setupWifi();
        this._volumeSignals = [];
        this._batterySignal = null;
        this._wifiSignal = null;
        this._powerSignal = null;
    }

    _setupIcons() {
        this.grid = new Clutter.GridLayout();
        this.gridWidget = new St.Widget({ layout_manager: this.grid });

        this.wifiIcon = controlIconBlank();
        this.volumeIcon = controlIconBlank();
        this.batteryIcon = controlIconBlank();

        this.grid.attach(this.wifiIcon, 0, 0, 1, 1);
        this.grid.attach(this.volumeIcon, 1, 0, 1, 1);
        this.grid.attach(this.batteryIcon, 0, 1, 2, 1);

        this.actor.add_child(this.gridWidget);
    }

    _setupVolume() {
        this.mixer = new Gvc.MixerControl({ name: 'crackOS Volume' });
        this.mixer.open();
        this._volumeSignals.push(
            this.mixer.connect('default-sink-changed', () => this._updateVolume())
        );
        this._volumeSignals.push(
            this.mixer.connect('state-changed', () => this._updateVolume())
        );
        this._updateVolume();
    }

    _updateVolume() {
        let sink = this.mixer.get_default_sink();
        if (!sink) { return; }
        if (sink.is_muted) {
            controlIconModify(this.volumeIcon, 'audio-volume-muted-symbolic');
        } else if (sink.volume < 0.3 * sink.get_base_volume()) {
            controlIconModify(this.volumeIcon, 'audio-volume-low-symbolic');
        } else if (sink.volume < 0.7 * sink.get_base_volume()) {
            controlIconModify(this.volumeIcon, 'audio-volume-medium-symbolic');
        } else {
            controlIconModify(this.volumeIcon, 'audio-volume-high-symbolic');
        }
    }

    _setupBattery() {
        this.power = UPowerGlib.Client.new();
        this.battery = this.power.get_display_device();
        if (!this.battery) { return; }
        const update = () => {
            const pct = Math.round(this.battery.percentage);
            if (pct > 80) {
                controlIconModify(this.batteryIcon, 'battery-full-symbolic');
            } else if (pct > 40) {
                controlIconModify(this.batteryIcon, 'battery-good-symbolic');
            } else if (pct > 20) {
                controlIconModify(this.batteryIcon, 'battery-low-symbolic');
            } else {
                controlIconModify(this.batteryIcon, 'battery-empty-symbolic');
            }
        };
        update();
        this._batterySignal = this.battery.connect('notify::percentage', update);
        this._powerSignal =
            this.power.connect('notify::display-device', () => {
                this.battery = this.power.get_display_device();
            });
    }

    _setupWifi() {
        this.nmClient = NM.Client.new(null);
        const update = () => {
            let conn = this.nmClient.get_primary_connection();
            let dev = conn?.get_devices()?.[0];
            if (!dev || dev.get_device_type() !== NM.DeviceType.WIFI) {
                controlIconModify(this.wifiIcon, 'network-wireless-offline-symbolic');
                return;
            }
            controlIconModify(this.wifiIcon, 'network-wireless-signal-excellent-symbolic');
        }
        update();
        this._wifiSignal = this.nmClient.connect('notify::connectivity', update);
    }

    destroy() {
        if (this._volumeSignals && this.mixer) {
            this._volumeSignals.forEach(id => this.mixer.disconnect(id));
            this._volumeSignals = null;
        }
        if (this.mixer) {
            this.mixer.close();
            this.mixer = null;
        }
        if (this._batterySignal && this.battery) {
            this.battery.disconnect(this._batterySignal);
            this._batterySignal = null;
        }
        if (this._powerSignal && this.power) {
            this.power.disconnect(this._powerSignal);
            this._powerSignal = null;
        }
        if (this._wifiSignal && this.nmClient) {
            this.nmClient.disconnect(this._wifiSignal);
            this._wifiSignal = null;
        }

        if (this.actor) { 
            this.actor.destroy(); 
            this.actor = null;
        }
    }
}

export class CrackOSTaskbarDateTimePanel {
    constructor() {
        this.actor = new St.Button({
            style_class: 'crackos-taskbar-datetimepanel',
            reactive: true,
            track_hover: true,
            can_focus: true
        });
        this.label = new St.Label({
            text: '',
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.set_child(this.label);
        this._setupClock();
    }
    
    _setupClock() {
        this.wallClock = new GnomeDesktop.WallClock();
        const updateClock = () => {
            this.label.text = this.wallClock.clock;
        };
        updateClock();
        this._clockSignal = this.wallClock.connect(
            'notify::clock',
            updateClock
        );
    }

    destroy() {
        if (this._clockSignal && this.wallClock) {
            this.wallClock.disconnect(this._clockSignal);
            this._clockSignal = null;
        }
        if (this.actor) { 
            this.actor.destroy(); 
            this.actor = null;
        }
    }
}