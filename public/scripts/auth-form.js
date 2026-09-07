/**
 * Client-side validation for the sign-in and sign-up forms.
 *
 * The two pages used to ship near-identical copies of this file. The
 * rules now come from the markup itself - `required`, `type="email"`,
 * `minlength`, `data-match` - so one implementation covers both forms
 * and any field added later.
 *
 * This is a convenience, not a control: the server validates everything
 * again, and the form still submits normally if scripting is off.
 */
(function () {
    'use strict';

    var App = window.App;

    var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    /* ----------------------------------------------------------------
       Messages
       ---------------------------------------------------------------- */

    function errorNode(input) {
        return App.$('#' + input.id + '-error');
    }

    function showError(input, message) {
        var node = errorNode(input);

        input.classList.add('is-invalid');
        input.setAttribute('aria-invalid', 'true');

        if (node) {
            node.textContent = message;
            node.classList.add('is-visible');
        }
    }

    function clearError(input) {
        var node = errorNode(input);

        input.classList.remove('is-invalid');
        input.removeAttribute('aria-invalid');

        if (node) {
            node.textContent = '';
            node.classList.remove('is-visible');
        }
    }

    /* ----------------------------------------------------------------
       Rules
       ---------------------------------------------------------------- */

    function validate(input) {
        var value = input.value;
        var trimmed = value.trim();
        var label = input.dataset.label || 'this field';

        if (input.required && !trimmed) {
            showError(input, 'Please enter ' + label + '.');
            return false;
        }

        if (!trimmed) {
            clearError(input);
            return true;
        }

        if (input.type === 'email' && !EMAIL_PATTERN.test(trimmed)) {
            showError(input, 'Please enter a valid email address.');
            return false;
        }

        var minimum = Number(input.getAttribute('minlength'));

        // Passwords are checked against the raw value: a leading space is
        // a real character in a password, not padding.
        var measured = input.type === 'password' ? value : trimmed;

        if (minimum && measured.length < minimum) {
            showError(
                input,
                input.type === 'password'
                    ? 'Password must be at least ' + minimum + ' characters.'
                    : 'This must be at least ' + minimum + ' characters.'
            );
            return false;
        }

        if (input.dataset.match) {
            var other = App.$('#' + input.dataset.match);

            if (other && other.value !== value) {
                showError(
                    input,
                    input.dataset.matchMessage || 'These values do not match.'
                );
                return false;
            }
        }

        clearError(input);
        return true;
    }

    /* ----------------------------------------------------------------
       Password strength
       ---------------------------------------------------------------- */

    var LEVELS = ['Weak', 'Fair', 'Strong'];

    function strengthOf(value) {
        if (value.length < 8) {
            return 0;
        }

        var variety = 0;

        if (/[a-z]/.test(value) && /[A-Z]/.test(value)) {
            variety++;
        }

        if (/\d/.test(value)) {
            variety++;
        }

        if (/[^A-Za-z0-9]/.test(value)) {
            variety++;
        }

        if (value.length >= 12) {
            variety++;
        }

        return variety >= 3 ? 2 : variety >= 1 ? 1 : 0;
    }

    function initStrengthMeter() {
        var input = App.$('.js-password');
        var meter = App.$('.js-strength');
        var fill = App.$('.js-strength-fill');
        var label = App.$('.js-strength-label');

        if (!input || !meter || !fill || !label) {
            return;
        }

        input.addEventListener('input', function () {
            if (!input.value) {
                meter.hidden = true;
                return;
            }

            var level = strengthOf(input.value);

            meter.hidden = false;
            meter.dataset.level = String(level);
            label.textContent = LEVELS[level];
        });
    }

    /* ----------------------------------------------------------------
       Wiring
       ---------------------------------------------------------------- */

    App.$$('.js-validated-form').forEach(function (form) {
        var fields = App.$$('input[data-label]', form);

        fields.forEach(function (input) {
            // Nothing is flagged until the visitor has finished with the
            // field once; after that, corrections are reflected live.
            input.addEventListener('blur', function () {
                validate(input);
            });

            input.addEventListener('input', function () {
                if (input.classList.contains('is-invalid')) {
                    validate(input);
                }

                // Re-check a confirmation field that already matched, so
                // editing the first password does not leave a stale pass.
                fields.forEach(function (other) {
                    if (
                        other !== input &&
                        other.dataset.match === input.id &&
                        other.value
                    ) {
                        validate(other);
                    }
                });
            });
        });

        form.addEventListener('submit', function (event) {
            var firstInvalid = null;

            fields.forEach(function (input) {
                if (!validate(input) && !firstInvalid) {
                    firstInvalid = input;
                }
            });

            if (firstInvalid) {
                event.preventDefault();
                firstInvalid.focus();
                return;
            }

            // A normal form post: the button stays in its loading state
            // until the browser replaces the page, which is exactly as
            // long as the request takes.
            App.setLoading(App.$('button[type="submit"]', form), true);
        });
    });

    /* ----------------------------------------------------------------
       Password visibility
       ---------------------------------------------------------------- */

    App.$$('.js-toggle-password').forEach(function (button) {
        button.addEventListener('click', function () {
            var input = App.$('#' + button.dataset.target);

            if (!input) {
                return;
            }

            var reveal = input.type === 'password';

            input.type = reveal ? 'text' : 'password';

            button.setAttribute(
                'aria-label',
                reveal ? 'Hide password' : 'Show password'
            );
            button.setAttribute('aria-pressed', reveal ? 'true' : 'false');

            // These are SVG elements, and `hidden` is a property of
            // HTMLElement only: assigning to it here sets an ordinary
            // JavaScript property and changes nothing on screen. The
            // attribute has to be written directly.
            setHidden(App.$('.js-eye-show', button), reveal);
            setHidden(App.$('.js-eye-hide', button), !reveal);
        });
    });

    function setHidden(element, isHidden) {
        if (!element) {
            return;
        }

        if (isHidden) {
            element.setAttribute('hidden', '');
        } else {
            element.removeAttribute('hidden');
        }
    }

    initStrengthMeter();
})();
