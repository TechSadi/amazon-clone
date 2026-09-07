// Sign in navigation feedback
document.querySelectorAll('.js-signin-link').forEach((signInLink) => {

    signInLink.addEventListener('click', () => {

        const actionText =
            signInLink.querySelector('.orders-text');

        if (actionText) {
            actionText.textContent = 'Opening...';
        }

    });

});


// Sign out feedback
document.querySelectorAll('.js-logout-form').forEach((logoutForm) => {

    logoutForm.addEventListener('submit', () => {

        const logoutButton =
            logoutForm.querySelector('.js-logout-button');

        if (logoutButton) {

            logoutButton.textContent = 'Signing out...';

            logoutButton.disabled = true;

        }

    });

});