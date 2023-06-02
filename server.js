const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authenticate = require('./authenticate');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;
const corsOptions = {
  origin: 'http://localhost:8081',
  optionsSuccessStatus: 200
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors(corsOptions));

//Create users with name, email, password
app.post('/users/register', async (req, res) => {
  const { email, name, password } = req.body;
  console.log(JSON.stringify(email));
  try {
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password,
      },
    });
    res.json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create user.' });
  }
});

// Returns JWT for user __id__
app.post('/users/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ 
      where: { 
        email: email
      },
    });
    if (!user) {
      res.status(404).json({ message: 'Email incorrect.' });
    } else if(user.password == password) {
      const userId = parseInt(String(user['id']));
      const token = jwt.sign({ userID: userId }, 'secret-key');
      await prisma.user.update({
        where: { id: userId },
        data: { jwt: token },
      });
      res.json({ token });
    } else {
      res.status(500).json({ message: 'Password incorrect.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to log in user.' });
  }
});

// Gets all users
app.get('/users', authenticate, async (_, res) => {
  try {
    const allUsers = await prisma.user.findMany({
      include: {
        posts: true,
      }
    });
    for (user of allUsers) {
      delete user['jwt'];
      delete user['password'];
    }
    res.json(allUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve users.' });
  }
});

// Invalidate JWT
app.post('/users/invalidateToken', authenticate, async (req, res) => {
  const id = await res.locals.userId;
  try {
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { jwt: null },
    });
    res.json({ message: 'The user has been logged out.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to log out user.' });
  }
});

// Create paste with title, content, date and connection to author
app.post('/paste/create', authenticate, async (req, res) => {
  const id = await res.locals.userId;
  const { title, content} = req.body;
  const date = new Date(Date.now());
  try {
    const newPaste = await prisma.paste.create({
      data: {
        title,
        content,
        date,
        author: {
          connect: {
            id: parseInt(id),
          },
        },
      },
      include: {
        author: true,
      },
    });
    res.json(newPaste);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add paste.' });
  }
});

// Get all Pastes
app.get('/paste', async (req, res) => {
  try {
    const allPaste = await prisma.paste.findMany({
      include: {
        author: {
          select: {
            name: true,
            email: true,
          }
        },
      },
    });
    res.json(allPaste);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve postes.' });
  }
});

//Get paste info
app.get('/paste/info/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pasteInfo = await prisma.paste.findFirst({
      where: { id: parseInt(id) },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          }
        },
      },
    });
    res.json(pasteInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve paste information.' })
  }
});

// Delete Paste
app.delete('/paste/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.paste.delete({ where: { id: parseInt(id) } });
    res.send('Your post was deleted.');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to delete your post.' });
  }
});

app.listen(port, () => {
  console.log(`Server is connected on ${port}`)
});