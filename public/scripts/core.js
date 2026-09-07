/**
 * Shared front-end runtime.
 *
 * Loaded on every page, before any page script. It owns the four things
 * every page needed its own copy of before: talking to the JSON API,
 * telling the visitor what happened, putting a control into a loading
 * state, and keeping the cart badge honest.
 *
 * Everything is exposed on `window.App`. Page scripts add behaviour on
 * top; they never re-implement any of this.
 */
(function () {
    'use strict';

    /* ----------------------------------------------------------------
       DOM helpers
       ---------------------------------------------------------------- */

    /** First match, or null. Scope defaults to the document. */
    function $(selector, scope) {
        return (scope || document).querySelector(selector);
    }

    /** All matches as a real array, so `.map` and `.filter` work. */
    function $$(selector, scope) {
        return Array.prototype.slice.call(
            (scope || document).querySelectorAll(selector)
        );
    }

    /* ----------------------------------------------------------------
       Toasts
       ---------------------------------------------------------------- */

    var ICONS = {
        success:
            '<path d="M20 6 9 17l-5-5"/>',
        error:
            '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5"/><path d="M12 16.2h.01"/>',
        warning:
            '<path d="M12 3.5 22 20H2z"/><path d="M12 9.5v4"/><path d="M12 17h.01"/>',
        info:
            '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.6h.01"/>'
    };

    var activeToasts = [];

    function removeToast(toast) {
        if (!toast || toast.dataset.leaving === 'true') {
            return;
        }

        toast.dataset.leaving = 'true';
        toast.classList.remove('is-visible');
        toast.classList.add('is-leaving');

        window.clearTimeout(Number(toast.dataset.timer));

        var index = activeToasts.indexOf(toast);

        if (index !== -1) {
            activeToasts.splice(index, 1);
        }

        window.setTimeout(function () {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 260);
    }

    /**
     * Shows a message in the shared live region.
     *
     * Options:
     *   message   text to show (required)
     *   type      'info' | 'success' | 'error' | 'warning'
     *   duration  ms before it leaves; 0 keeps it until dismissed
     *   action    { label, onClick } for a single inline action (Undo)
     *
     * Returns a handle with `dismiss()`.
     */
    function toast(options) {
        var settings = typeof options === 'string'
            ? { message: options }
            : options || {};

        var region = $('.js-toast-region');

        if (!region || !settings.message) {
            return { dismiss: function () {} };
        }

        // Only ever one message on screen. A queue would make the visitor
        // wait to read the result of the thing they just did.
        activeToasts.slice().forEach(removeToast);

        var type = settings.type || 'info';

        var duration =
            typeof settings.duration === 'number'
                ? settings.duration
                : settings.action
                  ? 7000
                  : 4000;

        var element = document.createElement('div');
        element.className = 'toast toast--' + type;

        var icon = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg'
        );
        icon.setAttribute('class', 'toast__icon');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = ICONS[type] || ICONS.info;
        element.appendChild(icon);

        var message = document.createElement('span');
        message.className = 'toast__message';
        message.textContent = settings.message;
        element.appendChild(message);

        if (settings.action && settings.action.label) {
            var actionButton = document.createElement('button');
            actionButton.type = 'button';
            actionButton.className = 'toast__action';
            actionButton.textContent = settings.action.label;

            actionButton.addEventListener('click', function () {
                // A second click cannot re-run the action.
                actionButton.disabled = true;
                window.clearTimeout(Number(element.dataset.timer));

                Promise.resolve(settings.action.onClick())
                    .then(function () {
                        removeToast(element);
                    })
                    .catch(function () {
                        actionButton.disabled = false;
                    });
            });

            element.appendChild(actionButton);
        }

        var dismiss = document.createElement('button');
        dismiss.type = 'button';
        dismiss.className = 'toast__dismiss';
        dismiss.setAttribute('aria-label', 'Dismiss notification');
        dismiss.innerHTML =
            '<svg viewBox="0 0 24 24" aria-hidden="true">' +
            '<path d="M6 6l12 12M18 6L6 18"/></svg>';
        dismiss.addEventListener('click', function () {
            removeToast(element);
        });
        element.appendChild(dismiss);

        region.appendChild(element);
        activeToasts.push(element);

        // Next frame, so the entry transition actually runs.
        window.requestAnimationFrame(function () {
            element.classList.add('is-visible');
        });

        if (duration > 0) {
            element.dataset.timer = String(
                window.setTimeout(function () {
                    removeToast(element);
                }, duration)
            );
        }

        return {
            dismiss: function () {
                removeToast(element);
            }
        };
    }

    /* ----------------------------------------------------------------
       Loading state
       ---------------------------------------------------------------- */

    /**
     * Puts a button into or out of its loading state.
     *
     * The label stays in the DOM at its original width, so the button
     * cannot resize mid-request and shift what is around it.
     */
    function setLoading(button, isLoading) {
        if (!button) {
            return;
        }

        if (isLoading) {
            button.dataset.loadingWidth = String(button.offsetWidth);
            button.style.minWidth = button.offsetWidth + 'px';
            button.classList.add('is-loading');
            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
            return;
        }

        button.classList.remove('is-loading');
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.style.minWidth = '';
    }

    /* ----------------------------------------------------------------
       API
       ---------------------------------------------------------------- */

    var GENERIC_ERROR =
        'Something went wrong on our end. Please try again.';

    var OFFLINE_ERROR =
        'You appear to be offline. Check your connection and try again.';

    /**
     * The single place the browser talks to this site's JSON endpoints.
     *
     * Attaches the CSRF token, asks for JSON so failures arrive as JSON
     * rather than as an HTML error page, and turns a failed response
     * into a thrown Error carrying a message that is safe to show.
     *
     * Resolves to null when the session has ended, after sending the
     * visitor to sign in. Callers stop when they get null.
     */
    async function api(url, options) {
        var settings = options || {};
        var tokenMeta = $('meta[name="csrf-token"]');

        var headers = {
            Accept: 'application/json',
            'X-CSRF-Token': tokenMeta ? tokenMeta.content : ''
        };

        if (settings.body !== undefined) {
            headers['Content-Type'] = 'application/json';
        }

        var response;

        try {
            response = await fetch(url, {
                method: settings.method || 'GET',
                headers: headers,
                credentials: 'same-origin',
                body:
                    settings.body === undefined
                        ? undefined
                        : JSON.stringify(settings.body)
            });
        } catch (networkError) {
            // fetch only rejects when the request never completed.
            var offline = new Error(
                navigator.onLine === false ? OFFLINE_ERROR : GENERIC_ERROR
            );
            offline.isNetworkError = true;
            throw offline;
        }

        if (response.status === 401) {
            var target = encodeURIComponent(
                window.location.pathname + window.location.search
            );

            window.location.href = '/users/login?returnTo=' + target;

            return null;
        }

        var data = null;

        try {
            data = await response.json();
        } catch (parseError) {
            data = null;
        }

        if (!response.ok) {
            var error = new Error(
                (data && data.error && data.error.message) || GENERIC_ERROR
            );

            error.status = response.status;

            throw error;
        }

        return data;
    }

    /**
     * Runs an API call with the button that started it in its loading
     * state, and reports any failure as a toast rather than an alert.
     *
     * Returns the response body, or null when the call failed or the
     * session ended. Callers check for null before using the result.
     */
    async function submit(button, request) {
        setLoading(button, true);

        try {
            return await request();
        } catch (error) {
            toast({ message: error.message, type: 'error' });
            return null;
        } finally {
            setLoading(button, false);
        }
    }

    /* ----------------------------------------------------------------
       Cart badge
       ---------------------------------------------------------------- */

    /** Updates every place the page shows a cart count. */
    function setCartQuantity(quantity) {
        var count = Number(quantity) || 0;

        $$('.js-cart-quantity').forEach(function (element) {
            if (element.textContent === String(count)) {
                return;
            }

            element.textContent = String(count);

            // Re-triggering a running animation needs a reflow.
            element.classList.remove('is-bumped');
            void element.offsetWidth;
            element.classList.add('is-bumped');
        });

        $$('.js-cart-count').forEach(function (element) {
            element.textContent = String(count);
        });

        $$('.js-cart-label').forEach(function (element) {
            element.textContent =
                count === 1 ? '1 item' : count + ' items';
        });
    }

    /* ----------------------------------------------------------------
       Site chrome
       ---------------------------------------------------------------- */

    var FOCUSABLE =
        'a[href], button:not([disabled]), input:not([disabled]), ' +
        'select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function initDrawer() {
        var drawer = $('.js-site-drawer');
        var toggle = $('.js-drawer-toggle');

        if (!drawer || !toggle) {
            return;
        }

        var lastFocused = null;

        function open() {
            lastFocused = document.activeElement;

            drawer.classList.add('is-open');
            drawer.removeAttribute('inert');
            toggle.setAttribute('aria-expanded', 'true');
            document.body.classList.add('has-open-drawer');

            var first = $(FOCUSABLE, drawer);

            if (first) {
                first.focus();
            }
        }

        function close() {
            if (!drawer.classList.contains('is-open')) {
                return;
            }

            drawer.classList.remove('is-open');
            drawer.setAttribute('inert', '');
            toggle.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('has-open-drawer');

            if (lastFocused && lastFocused.focus) {
                lastFocused.focus();
            }
        }

        drawer.setAttribute('inert', '');

        toggle.addEventListener('click', function () {
            if (drawer.classList.contains('is-open')) {
                close();
            } else {
                open();
            }
        });

        $$('.js-drawer-close', drawer).forEach(function (element) {
            element.addEventListener('click', close);
        });

        document.addEventListener('keydown', function (event) {
            if (!drawer.classList.contains('is-open')) {
                return;
            }

            if (event.key === 'Escape') {
                close();
                return;
            }

            if (event.key !== 'Tab') {
                return;
            }

            // Keep Tab inside the panel while it covers the page.
            var focusable = $$(FOCUSABLE, drawer);

            if (focusable.length === 0) {
                return;
            }

            var first = focusable[0];
            var last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });

        // A viewport change can hide the toggle while the drawer is open.
        window.matchMedia('(min-width: 721px)').addEventListener(
            'change',
            function (event) {
                if (event.matches) {
                    close();
                }
            }
        );
    }

    function initSearch() {
        $$('.js-site-search').forEach(function (form) {
            var input = $('.js-search-input', form);
            var clear = $('.js-search-clear', form);

            if (!input || !clear) {
                return;
            }

            function sync() {
                clear.hidden = input.value.trim().length === 0;
            }

            sync();

            input.addEventListener('input', sync);

            clear.addEventListener('click', function () {
                input.value = '';
                sync();
                input.focus();
            });

            form.addEventListener('submit', function (event) {
                var term = input.value.trim();

                // An empty search is a request for the whole catalogue,
                // not a search for "". Submitting `?q=` would render a
                // "no results for" heading with nothing in it.
                if (!term) {
                    event.preventDefault();
                    window.location.href = '/products';
                    return;
                }

                input.value = term;
            });
        });
    }

    /** Retry controls. A plain link cannot re-issue a POST or a 500. */
    function initReload() {
        $$('[data-action="reload"]').forEach(function (button) {
            button.addEventListener('click', function () {
                setLoading(button, true);
                window.location.reload();
            });
        });
    }

    function initSignOut() {
        $$('.js-logout-form').forEach(function (form) {
            form.addEventListener('submit', function () {
                $$('button', form).forEach(function (button) {
                    button.disabled = true;
                    button.textContent = 'Signing out...';
                });
            });
        });
    }

    /* ----------------------------------------------------------------
       Public surface
       ---------------------------------------------------------------- */

    window.App = {
        $: $,
        $$: $$,
        toast: toast,
        setLoading: setLoading,
        api: api,
        submit: submit,
        setCartQuantity: setCartQuantity
    };

    initDrawer();
    initSearch();
    initSignOut();
    initReload();
})();
