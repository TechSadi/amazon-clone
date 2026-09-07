/**
 * Sets the delivery progress bar from the value the server rendered.
 *
 * Kept out of the page itself so the Content-Security-Policy does not
 * have to allow inline scripts.
 */
const progressBar = document.querySelector('.js-progress-bar');

if (progressBar) {
    const percent = Number(progressBar.dataset.progress);

    progressBar.style.width = `${Number.isFinite(percent) ? percent : 0}%`;
}
