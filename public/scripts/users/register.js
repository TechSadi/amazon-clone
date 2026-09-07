const form = document.querySelector('#register-form');

const nameInput = document.querySelector('#name');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
const confirmPasswordInput =
    document.querySelector('#confirmPassword');


function showError(input, message) {

    const errorElement = document.querySelector(
        `#${input.id}-error`
    );

    input.classList.remove('input-success');
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


function validateName() {

    const value = nameInput.value.trim();

    if (!value) {

        showError(
            nameInput,
            'Please enter your name.'
        );

        return false;
    }

    if (value.length < 2) {

        showError(
            nameInput,
            'Name must contain at least 2 characters.'
        );

        return false;
    }

    clearError(nameInput);

    return true;

}


function validateEmail() {

    const value = emailInput.value.trim();

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!value) {

        showError(
            emailInput,
            'Please enter your email.'
        );

        return false;
    }

    if (!emailPattern.test(value)) {

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

    const value = passwordInput.value;

    if (!value) {

        showError(
            passwordInput,
            'Please enter a password.'
        );

        return false;
    }

    if (value.length < 6) {

        showError(
            passwordInput,
            'Password must be at least 6 characters.'
        );

        return false;
    }

    clearError(passwordInput);

    return true;

}


function validateConfirmPassword() {

    const value = confirmPasswordInput.value;

    if (!value) {

        showError(
            confirmPasswordInput,
            'Please re-enter your password.'
        );

        return false;
    }

    if (value !== passwordInput.value) {

        showError(
            confirmPasswordInput,
            'Passwords do not match.'
        );

        return false;
    }

    clearError(confirmPasswordInput);

    return true;

}


nameInput.addEventListener('blur', validateName);

emailInput.addEventListener('blur', validateEmail);

passwordInput.addEventListener('blur', validatePassword);

confirmPasswordInput.addEventListener(
    'blur',
    validateConfirmPassword
);


nameInput.addEventListener('input', () => {

    if (nameInput.classList.contains('input-error')) {

        validateName();

    }

});


emailInput.addEventListener('input', () => {

    if (emailInput.classList.contains('input-error')) {

        validateEmail();

    }

});


passwordInput.addEventListener('input', () => {

    if (passwordInput.classList.contains('input-error')) {

        validatePassword();

    }

    if (confirmPasswordInput.value) {

        validateConfirmPassword();

    }

});


confirmPasswordInput.addEventListener(
    'input',
    validateConfirmPassword
);


form.addEventListener('submit', (event) => {

    const isNameValid = validateName();

    const isEmailValid = validateEmail();

    const isPasswordValid = validatePassword();

    const isConfirmPasswordValid =
        validateConfirmPassword();


    if (
        !isNameValid ||
        !isEmailValid ||
        !isPasswordValid ||
        !isConfirmPasswordValid
    ) {

        event.preventDefault();

    }

});


const passwordToggleButtons =
    document.querySelectorAll('.toggle-password');


passwordToggleButtons.forEach((button) => {

    button.addEventListener('click', () => {

        const targetId =
            button.dataset.target;

        const input =
            document.querySelector(`#${targetId}`);


        if (input.type === 'password') {

            input.type = 'text';

            button.setAttribute(
                'aria-label',
                'Hide password'
            );

        } else {

            input.type = 'password';

            button.setAttribute(
                'aria-label',
                'Show password'
            );

        }

    });

});