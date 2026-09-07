
import bcrypt from 'bcrypt';

import User from '../models/user.js';


export const loadLogin = (req, res) => {

    res.render('users/login', {
        error: null,
        formData: {}
    });

};

export const loadRegister = (req, res) => {

    res.render('users/register', {
        error: null,
        formData: {}
    });

};

export const registerUser = async (req, res) => {

    try {

        const {
            name,
            email,
            password,
            confirmPassword
        } = req.body;


        if (
            !name ||
            !email ||
            !password ||
            !confirmPassword
        ) {

            return res.status(400).render(
                'users/register',
                {
                    error: 'Please fill in all fields.',
                    formData: {
                        name,
                        email
                    }
                }
            );

        }


        if (name.trim().length < 2) {

            return res.status(400).render(
                'users/register',
                {
                    error:
                        'Please enter a valid name.',
                    formData: {
                        name,
                        email
                    }
                }
            );

        }


        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (!emailPattern.test(email)) {

            return res.status(400).render(
                'users/register',
                {
                    error:
                        'Please enter a valid email address.',
                    formData: {
                        name,
                        email
                    }
                }
            );

        }


        if (password.length < 6) {

            return res.status(400).render(
                'users/register',
                {
                    error:
                        'Password must be at least 6 characters.',
                    formData: {
                        name,
                        email
                    }
                }
            );

        }


        if (password !== confirmPassword) {

            return res.status(400).render(
                'users/register',
                {
                    error:
                        'Passwords do not match.',
                    formData: {
                        name,
                        email
                    }
                }
            );

        }


        const existingUser =
            await User.findOne({
                email: email.toLowerCase()
            });


        if (existingUser) {

            return res.status(409).render(
                'users/register',
                {
                    error:
                        'An account with this email already exists.',
                    formData: {
                        name,
                        email
                    }
                }
            );

        }


        const hashedPassword =
            await bcrypt.hash(password, 10);


        await User.create({

            name: name.trim(),

            email: email.toLowerCase().trim(),

            password: hashedPassword

        });


        res.redirect('/users/login');

    }

    catch (error) {

        console.error(
            'Registration error:',
            error
        );


        res.status(500).render(
            'users/register',
            {
                error:
                    'Something went wrong. Please try again.',
                formData: {
                    name: req.body.name,
                    email: req.body.email
                }
            }
        );

    }

};



export const loginUser = async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        if (!email || !password) {

            return res.status(400).render(
                'users/login',
                {
                    error: 'Please enter your email and password.',
                    formData: {
                        email
                    }
                }
            );

        }


        const user = await User.findOne({
            email: email.toLowerCase().trim()
        });


        if (!user) {

            return res.status(401).render(
                'users/login',
                {
                    error:
                        'Incorrect email or password.',
                    formData: {
                        email
                    }
                }
            );

        }


        const isPasswordCorrect =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!isPasswordCorrect) {

            return res.status(401).render(
                'users/login',
                {
                    error:
                        'Incorrect email or password.',
                    formData: {
                        email
                    }
                }
            );

        }


        // Authentication successful
        // Sessions will be added next

        // Strore the logged-in users's ID
        req.session.userId = user._id;

        // Redirect after a successful login
        res.redirect('/products');

    }

    catch (error) {

        console.error(
            'Login error:',
            error
        );


        res.status(500).render(
            'users/login',
            {
                error:
                    'Something went wrong. Please try again.',
                formData: {
                    email: req.body.email
                }
            }
        );

    }

};



export const logoutUser = (req, res) => {
    req.session.destroy((error) => {

        if (error) {
            console.error('Logout error:', error);

            return res.status(500).send(
                'Something went wrong while logging out.'
            );
        }

        res.clearCookie('connect.sid');

        res.redirect('/products');
    });
};