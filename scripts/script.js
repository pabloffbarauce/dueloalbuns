const API_KEY = '428b40f376c52bacd4ce5e1272f4218c'; 

let listaAlbuns = [];
let artistaAtual = "";

const inputArtista = document.getElementById('artista');
const datalistSugestoes = document.getElementById('artistas-sugeridos');
const btnIniciar = document.getElementById('botao-iniciar');
const divRanking = document.getElementById('ranking');

const statusRodada = document.getElementById('status-rodada');
const containerOpcoes = document.getElementById('container-opcoes');
const listaRanking = document.getElementById('lista-ranking');


inputArtista.addEventListener('input', function() {
    const termo = inputArtista.value.trim();
    if (termo.length < 3) return;

    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(termo)}&api_key=${API_KEY}&format=json&limit=5`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            datalistSugestoes.innerHTML = '';
            if (!data.results || !data.results.artistmatches) return;

            const artistas = data.results.artistmatches.artist;
            artistas.forEach(art => {
                const option = document.createElement('option');
                option.value = art.name;
                datalistSugestoes.appendChild(option);
            });
        })
        .catch(err => console.error("Erro ao carregar datalist:", err));
});

btnIniciar.addEventListener('click', function() {
    artistaAtual = inputArtista.value.trim();
    if (!artistaAtual) return alert("Por favor, digite ou selecione um artista!");

    // procura os 15 álbuns mais famosos
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettopalbums&artist=${encodeURIComponent(artistaAtual)}&api_key=${API_KEY}&format=json&limit=15`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data.topalbums || !data.topalbums.album) {
                return alert("Artista não encontrado ou sem álbuns no Last.fm.");
            }

            const rawAlbuns = data.topalbums.album;
            
            // filtro de albuns sem nome ou imagem
            listaAlbuns = rawAlbuns.filter(alb => alb.name && alb.name !== "(null)" && alb.image && alb.image[2]['#text']);

            if (listaAlbuns.length < 2) {
                return alert("Este artista não possui álbuns suficientes para um duelo.");
            }

            listaAlbuns.sort(() => Math.random() - 0.5);

            divRanking.style.display = "block";
            atualizarRankingDoBanco();
            proximaRodada();
        })
        .catch(err => alert("Erro na requisição."));
});

// rodadas
function proximaRodada() {
    containerOpcoes.innerHTML = '';

    // fim das opções
    if (listaAlbuns.length === 0) {
        statusRodada.innerText = "Escolhas realizadas!";
        containerOpcoes.innerHTML = "<p>Obrigado por jogar! Confira o ranking geral atualizado abaixo.</p>";
        return;
    }

    // número ímpar de álbuns
    if (listaAlbuns.length === 3) {
        statusRodada.innerText = "Escolha 1 dos 3 últimos álbuns:";
        const a1 = listaAlbuns.pop();
        const a2 = listaAlbuns.pop();
        const a3 = listaAlbuns.pop();
        
        gerarCardHTML(a1);
        gerarCardHTML(a2);
        gerarCardHTML(a3);
        return;
    }

    // rodada normal
    statusRodada.innerText = `Restam ${listaAlbuns.length} álbuns. Escolha o seu favorito:`;
    const albumA = listaAlbuns.pop();
    const albumB = listaAlbuns.pop();

    gerarCardHTML(albumA);
    gerarCardHTML(albumB);
}

function gerarCardHTML(album) {
    const urlCapa = album.image[2]['#text'];
    
    const divCard = document.createElement('div');
    divCard.className = "card-album"; 
    divCard.setAttribute("onclick", `registrarVoto('${album.name.replace(/'/g, "\\'")}', '${urlCapa}')`);

    divCard.innerHTML = `
        <img src="${urlCapa}" alt="${album.name}" class="capa-album">
        <strong class="titulo-album">${album.name}</strong>
    `;

    containerOpcoes.appendChild(divCard);
}

function registrarVoto(nomeAlbum, urlCapa) {
    console.log(`Votou em: ${nomeAlbum}`);

    fetch('/api/votar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            artista: artistaAtual,
            album: nomeAlbum,
            capa: urlCapa
        })
    })
    .then(res => {
        if (!res.ok) throw new Error("Erro ao salvar o voto.");
        return res.json();
    })
    .then(data => {
        atualizarRankingDoBanco();
        proximaRodada();
    })
    .catch(err => {
        console.error(err);
        proximaRodada(); 
    });
}

function atualizarRankingDoBanco() {
    if (!artistaAtual) return;

    fetch(`/api/ranking?artista=${encodeURIComponent(artistaAtual)}`)
        .then(res => res.json())
        .then(dadosRanking => {
            listaRanking.innerHTML = '';
            if (dadosRanking.length === 0) {
                listaRanking.innerHTML = `<li>Nenhum voto registrado para ${artistaAtual} ainda. Seja o primeiro!</li>`;
                return;
            }

            dadosRanking.forEach((item, index) => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>#${index + 1}</strong> - ${item.album_nome} (${item.votos} votos)`;
                listaRanking.appendChild(li);
            });
        })
        .catch(err => {
            console.error("Erro ao carregar o ranking:", err);
            listaRanking.innerHTML = `<li>Não foi possível conectar ao banco de dados para carregar o ranking de <strong>${artistaAtual}</strong>.</li>`;
        });
}

// resetar torneio
document.getElementById('botao-reset').addEventListener('click', () => {
    const artistaInput = document.getElementById('artista');
    const artista = artistaInput ? artistaInput.value.trim() : '';

    if (!artista) {
        alert('Por favor, selecione ou digite o nome de um artista para resetar o histórico.');
        return;
    }

    // confirmação
    const confirmar = confirm(`Tem certeza que deseja apagar todo o histórico de votação de "${artista}"?`);
    
    if (confirmar) {
        fetch(`/api/resetar/${encodeURIComponent(artista)}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao resetar os dados no servidor.');
            }
            return response.json();
        })
        .then(data => {
            alert(data.mensagem);
            const listaRanking = document.getElementById('lista-ranking');
            if (listaRanking) {
                listaRanking.innerHTML = '<li>Histórico resetado. Nenhum duelo iniciado ainda.</li>';
            }
        })
        .catch(error => {
            console.error('Erro na requisição de reset:', error);
            alert('Não foi possível conectar ao servidor para resetar o torneio.');
        });
    }
});