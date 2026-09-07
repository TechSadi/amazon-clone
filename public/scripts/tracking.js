/**
 * Sets the delivery progress bar from the value the server rendered.
 *
 * Kept out of the page so the Content-Security-Policy does not have to
 * allow inline scripts or inline style attributes.
 */
(function () {
    'use strict';

    var bar = window.App.$('.js-progress-bar');

    if (!bar) {
        return;
    }

    var percent = Number(bar.dataset.progress);

    if (!isFinite(percent)) {
        percent = 0;
    }

    percent = Math.min(100, Math.max(0, percent));

    // Next frame, so the bar animates from zero to its real value
    // instead of being painted at full width straight away.
    window.requestAnimationFrame(function () {
        bar.style.width = percent + '%';
    });
})();
