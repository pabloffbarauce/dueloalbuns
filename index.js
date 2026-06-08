const express = require('express');
const mysql = require('mysql2');
const path = require('path');

const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname)));

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456', 
    database: process.env.DB_NAME || 'duelo_albuns',
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
});

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err);
    } else {
        console.log('Conectado ao banco de dados com sucesso!');
    }
});

// registrando voto
app.post('/api/votar', (req, res) => {
    const { artista, album, capa } = req.body;

    if (!artista || !album) {
        return res.status(400).json({ erro: 'Dados incompletos para votação.' });
    }

    const sql = `
        INSERT INTO ranking_albuns (artista, album_nome, capa_url, votos) 
        VALUES (?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE votos = votos + 1
    `;

    db.query(sql, [artista, album, capa], (err, result) => {
        if (err) {
            console.error('Erro ao computar voto no banco de dados:', err);
            return res.status(500).json({ erro: 'Erro interno ao salvar voto.' });
        }
        res.json({ mensagem: 'Voto registrado com sucesso!' });
    });
});

// ranking do artista
app.get('/api/ranking', (req, res) => {
    const { artista } = req.query; //

    if (!artista) {
        return res.status(400).json({ erro: 'Artista não informado.' });
    }

    const sql = 'SELECT album_nome, capa_url, votos FROM ranking_albuns WHERE artista = ? ORDER BY votos DESC';

    db.query(sql, [artista], (err, results) => {
        if (err) {
            console.error('Erro ao buscar ranking no banco de dados:', err);
            return res.status(500).json(err);
        }
        res.json(results);
    });
});

// resetar torneio
app.delete('/api/resetar/:artista', (req, res) => {
    const { artista } = req.params;
    const sql = 'DELETE FROM ranking_albuns WHERE artista = ?';

    db.query(sql, [artista], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erro ao resetar dados do banco');
        }
        res.json({ mensagem: `Histórico de ${artista} apagado com sucesso!` });
    });
});

const port = process.env.PORT || 3000;

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});