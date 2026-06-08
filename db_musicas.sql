CREATE DATABASE IF NOT EXISTS duelo_albuns;
USE duelo_albuns;

CREATE TABLE IF NOT EXISTS ranking_albuns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    artista VARCHAR(100) NOT NULL,
    album_nome VARCHAR(150) NOT NULL,
    capa_url VARCHAR(255),
    votos INT DEFAULT 1,
    UNIQUE KEY artista_album (artista, album_nome)
);