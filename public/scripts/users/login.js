const form = document.querySelector('#login-form');

const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');


function showError(input, message) {

    const errorElement = document.querySelector(
        `#${input.id}-error`
    );

    input.classList.add('input-error');

    errorElement.textContent = message;
    errorElement.classList.add('visible');

}


function clearError(input) {

    const errorElement = document.querySelector(
        `#${input.id}-error`
    );

    input.classList.remove('input-error');

    errorElement.textContent = '';
    errorElement.classList.remove('visible');

}


function validateEmail() {

    const email = emailInput.value.trim();

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!email) {

        showError(
            emailInput,
            'Please enter your email.'
        );

        return false;

    }


    if (!emailPattern.test(email)) {

        showError(
            emailInput,
            'Please enter a valid email address.'
        );

        return false;

    }


    clearError(emailInput);

    return true;

}


function validatePassword() {

    if (!passwordInput.value) {

        showError(
            passwordInput,
            'Please enter your password.'
        );

        return false;

    }


    clearError(passwordInput);

    return true;

}


emailInput.addEventListener('blur', validateEmail);

passwordInput.addEventListener(
    'blur',
    validatePassword
);


emailInput.addEventListener('input', () => {

    if (
        emailInput.classList.contains('input-error')
    ) {

        validateEmail();

    }

});


passwordInput.addEventListener('input', () => {

    if (
        passwordInput.classList.contains('input-error')
    ) {

        validatePassword();

    }

});


form.addEventListener('submit', (event) => {

    const isEmailValid = validateEmail();

    const isPasswordValid = validatePassword();


    if (!isEmailValid || !isPasswordValid) {

        event.preventDefault();

    }

});


const togglePasswordButton =
    document.querySelector('.toggle-password');


togglePasswordButton.addEventListener('click', () => {

    if (passwordInput.type === 'password') {

        passwordInput.type = 'text';

        togglePasswordButton.setAttribute(
            'aria-label',
            'Hide password'
        );

    } else {

        passwordInput.type = 'password';

        togglePasswordButton.setAttribute(
            'aria-label',
            'Show password'
        );

    }

});