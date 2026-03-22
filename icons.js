import St from 'gi://St';
import Gio from 'gi://Gio';

export function controlIconModify(target, string, size = 18) {
    if (!(target instanceof St.Icon)) { return; }
    try {
        target.gicon = Gio.icon_new_for_string(string);
        target.icon_size = size;
    } catch(e) {
        logError(e);
    }
}

export function controlIconBlank() {
    return new St.Icon({
        style_class: 'crackos-control-icon',
        opacity: 0
    });
}

export function appIcon(icon, size = 35) {
    if (icon != null) {
        return new St.Icon({
            gicon: icon,
            icon_size: size
        });
    } else {
        return new St.Icon({
            icon_name: 'application-x-executable',
            icon_size: size
        });
    }
}