import Clutter from 'gi://Clutter';

export function taskbarHover(actor, {
    lift = 12,
    // scale = 1.01,
    duration = 200
} = {}) {
    actor.set_pivot_point(0.5, 1.0);
    const signalId = actor.connect('notify::hover', () => {
        actor.remove_all_transitions();
        actor.ease({
            translation_y: actor.hover ? -lift : 0,
            // scale_x: scale,
            // scale_y: scale,
            duration,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD
        });
    });
    return signalId;
}

export function animateActor(actor, { 
    x = null, 
    y = null, 
    opacity = null, 
    duration = 200 
} = {}) {
    const props = {};
    if (x !== null) props.translation_x = x;
    if (y !== null) props.translation_y = y;
    if (opacity !== null) props.opacity = opacity;
    actor.remove_all_transitions();
    actor.ease({
        ...props,
        duration,
        mode: Clutter.AnimationMode.EASE_OUT_QUAD
    });
}