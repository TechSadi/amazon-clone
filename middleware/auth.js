export const requireLogin = (req, res, next) => {

    if (!req.session.userId) {

        return res.redirect('/users/login');

    }

    next();

};