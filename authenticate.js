const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).json({ message: 'No authorization header provided.' });
        return;
    }
    const token = authHeader.split(' ')[1];
    console.log(authHeader);
    try {
        const decodedToken = jwt.verify(token, 'secret-key');
        const userId = decodedToken.userID;
        prisma.user
            .findFirst({
                where: { id: userId },
                select: { jwt: true },
            })
            .then((user) => {
                if (!user || user.jwt !== token) {
                    res.status(401).json({ message: 'Invalid or expired token.' });
                    return;
                }
                req.userId = userId;
                res.locals.userId = parseInt(userId);
                next();
            })
            .catch((error) => {
                console.error(error);
                res.status(500).json({ message: 'Failed to authentificate user.' });
            });
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: 'Invalid token.' });
    }
}

module.exports = authenticate;