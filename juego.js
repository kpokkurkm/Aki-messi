// --- CONFIGURACIÓN DE BASE DE DATOS ---
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTl75_rySeY1kBnMnmjIZaA3fDJwKZt_IBI9Afq0f9TE09Dsr0heUOALSN8Ay2r7JIbViiF6Pqeoxpw/pub?gid=0&single=true&output=csv";
let jugadores = [];
let respuestasUsuario = {};
let numeroPregunta = 1;
let atributoActual = "";
let candidatos = []; 

let estadoJuego = "JUGANDO"; // "JUGANDO", "ADIVINANDO", "APRENDIENDO"
let jugadorAdivinado = null;
let modoJuego = ""; 
const musica = document.getElementById("musica-fondo");

const columnasPreguntas = [
    "ZURDO", "RETIRADO", "PORTERO", "DEFENSA", "CENTROCAMPISTA", "DELANTERO",
    "EUROPA", "EUROPA_HISTORICO", "AFRICA", "AMERICA_NORTE", "AMERICA_SUR", "OCEANIA", "ASIA",
    "LALIGA", "LALIGA_HISTORICO", "PREMIER", "PREMIER_HISTORICO", "SERIE_A", "BUNDESLIGA", "LIGUE_1",
    "SELECCION_NACIONAL", "MUNDIAL", "EURO_AMERICA", "CHAMPIONS", "BALON_ORO", "MAX_GOLEADOR", "CAPITAN",
    "FICHAJE_CARO", "ENTRENADOR", "CALVO", "LEYENDA_90"
];

function limpiarCelda(texto) {
    if (!texto) return "";
    return texto.trim().replace(/^["']|["']$/g, ''); 
}

async function cargarBaseDatos() {
    try {
        console.log("[Base de Datos] Cargando...");
        const respuesta = await fetch(CSV_URL);
        if (!respuesta.ok) throw new Error("Status: " + respuesta.status);
        
        const texto = await respuesta.text();
        const lineas = texto.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        
        jugadores = [];
        for(let i = 1; i < lineas.length; i++) {
            const c = lineas[i].split(","); 
            if(c.length < 5) continue;

            let jugador = {
                id: limpiarCelda(c[0]), 
                nombre: limpiarCelda(c[1]), 
                foto: limpiarCelda(c[2]),
                equipo: limpiarCelda(c[3]), 
                nacionalidad: limpiarCelda(c[4]), 
                atributos: {}
            };

            for(let j = 0; j < columnasPreguntas.length; j++) {
                let valor = limpiarCelda(c[j + 5] || "0");
                jugador.atributos[columnasPreguntas[j]] = parseInt(valor) || 0;
            }
            jugadores.push(jugador);
        }

        const jugadoresLocales = JSON.parse(localStorage.getItem("jugadores_ia")) || [];
        jugadores = [...jugadores, ...jugadoresLocales];

        console.log("[Base de Datos] Éxito. Total jugadores:", jugadores.length);
    } catch (e) {
        console.error("[Base de Datos] Error:", e);
        document.getElementById("texto-pregunta").innerText = "⚠️ Error al conectar con la base de datos.";
    }
}

// --- LÓGICA DE JUEGO ---
function iniciarJuego() {
    if (jugadores.length === 0) return;
    respuestasUsuario = {};
    candidatos = [...jugadores]; 
    numeroPregunta = 1;
    estadoJuego = "JUGANDO";
    jugadorAdivinado = null;

    // Asegurar visibilidad correcta de la interfaz
    document.getElementById("bocadillo-charla").classList.remove("oculto");
    document.getElementById("contenedor-carta-fut").classList.add("oculto");
    document.getElementById("contenedor-carta-fut").innerHTML = "";

    hacerSiguientePregunta();
}

function hacerSiguientePregunta() {
    if (numeroPregunta > 10) {
        if (candidatos.length > 0) proponerJugador(candidatos[0]);
        else mostrarFormularioAprendizaje();
        return;
    }
    
    if (candidatos.length === 0) {
        mostrarFormularioAprendizaje();
        return;
    }
    
    if (candidatos.length === 1) {
        proponerJugador(candidatos[0]);
        return;
    }
    
    let atributosPendientes = columnasPreguntas.filter(a => !(a in respuestasUsuario));
    if (atributosPendientes.length === 0) {
        proponerJugador(candidatos[0]);
        return;
    }
    
    let mejoresAtributos = [];
    let menorDiferencia = Infinity;
    
    atributosPendientes.forEach(attr => {
        let conAtributo = candidatos.filter(j => parseInt(j.atributos[attr]) === 1).length;
        let sinAtributo = candidatos.length - conAtributo;
        if (conAtributo === 0 || sinAtributo === 0) return; 
        
        let diferencia = Math.abs(conAtributo - sinAtributo);
        if (diferencia < menorDiferencia) {
            menorDiferencia = diferencia;
            mejoresAtributos = [attr];
        } else if (diferencia === menorDiferencia) {
            mejoresAtributos.push(attr);
        }
    });
    
    if (mejoresAtributos.length === 0) {
        atributoActual = atributosPendientes[0];
    } else {
        const indiceAleatorio = Math.floor(Math.random() * mejoresAtributos.length);
        atributoActual = mejoresAtributos[indiceAleatorio];
    }
    
    const textoPregunta = traducirAtributoAPregunta(atributoActual);
    document.getElementById("texto-pregunta").innerText = textoPregunta;
    document.getElementById("contador-preguntas").innerText = "PREGUNTA Nº " + numeroPregunta;
}

// --- PRESENTACIÓN DE CARTA FUT DESACOPLADA ---
function proponerJugador(jugador) {
    estadoJuego = "ADIVINANDO";
    jugadorAdivinado = jugador;

    // Ocultar bocadillo de diálogo normal
    document.getElementById("bocadillo-charla").classList.add("oculto");
    document.getElementById("contador-preguntas").innerText = "🔮 ¡MI PREDICCIÓN!";

    // Generar la Carta FUT independiente
    const contenedorFut = document.getElementById("contenedor-carta-fut");
    contenedorFut.classList.remove("oculto");
    
    contenedorFut.innerHTML = `
        <div class="fut-card">
            <div class="fut-card-header">
                <div class="fut-rating">99</div>
                <div class="fut-position">CRACK</div>
            </div>
            <img class="fut-player-img" 
                 src="img/futbolistas/${jugador.foto}" 
                 onerror="this.onerror=null; this.src='https://cdn-icons-png.flaticon.com/512/53/53283.png';"
                 alt="${jugador.nombre}">
            <div class="fut-player-name">${jugador.nombre}</div>
            <div class="fut-stats-grid">
                <div class="fut-stat-item">EQP <span>${jugador.equipo || 'Club'}</span></div>
                <div class="fut-stat-item">NAC <span>${jugador.nacionalidad || 'Mundo'}</span></div>
            </div>
        </div>
    `;
}

function traducirAtributoAPregunta(attr) {
    const diccionario = {
        "ZURDO": "¿Es zurdo para pegarle a la pelota?",
        "RETIRADO": "¿Ya se retiró del fútbol profesional?",
        "PORTERO": "¿Su posición es arquero / portero?",
        "DEFENSA": "¿Es un jugador defensivo?",
        "CENTROCAMPISTA": "¿Juega en el mediocampo?",
        "DELANTERO": "¿Es un delantero goleador?",
        "EUROPA": "¿Nació en Europa?",
        "EUROPA_HISTORICO": "¿Ha jugado en la liga de algún país europeo?",
        "AFRICA": "¿Representa a un país africano?",
        "AMERICA_NORTE": "¿Nació en Norteamérica (EEUU, México, Canadá)?",
        "AMERICA_SUR": "¿Es un crack sudamericano?",
        "OCEANIA": "¿Pertenece a Oceanía?",
        "ASIA": "¿Nació o representa a un país de Asia?",
        "LALIGA": "¿Juega actualmente en LaLiga de España?",
        "LALIGA_HISTORICO": "¿Ha jugado alguna vez en LaLiga?",
        "PREMIER": "¿Juega en la Premier League de Inglaterra?",
        "PREMIER_HISTORICO": "¿Ha jugado alguna vez en la Premier League?",
        "SERIE_A": "¿Disputa la Serie A de Italia?",
        "BUNDESLIGA": "¿Juega en la Bundesliga de Alemania?",
        "LIGUE_1": "¿Juega en la Ligue 1 de Francia?",
        "SELECCION_NACIONAL": "¿Suele ser convocado a su selección?",
        "MUNDIAL": "¿Ganó la Copa del Mundo de la FIFA?",
        "EURO_AMERICA": "¿Ganó una Eurocopa o Copa América?",
        "CHAMPIONS": "¿Ganó la UEFA Champions League?",
        "BALON_ORO": "¿Ha ganado al menos un Balón de Oro?",
        "MAX_GOLEADOR": "¿Ha sido máximo goleador de un torneo importante?",
        "CAPITAN": "¿Ha sido capitán de su equipo o selección?",
        "FICHAJE_CARO": "¿Protagonizó un fichaje multimillonario?",
        "ENTRENADOR": "¿Trabaja o trabajó como director técnico?",
        "CALVO": "¿Es calvo o rapado?",
        "LEYENDA_90": "¿Brilló en los años 90 o antes?"
    };
    return diccionario[attr] || `¿Tiene la característica: ${attr}?`;
}

function responder(valor) {
    const valorNumerico = parseInt(valor);

    if (estadoJuego === "ADIVINANDO") {
        if (valorNumerico === 1) registrarVictoria();
        else mostrarFormularioAprendizaje();
        return;
    }

    if (valorNumerico !== -1) {
        candidatos = candidatos.filter(jugador => {
            const valorAtributo = parseInt(jugador.atributos[atributoActual]) || 0;
            return valorAtributo === valorNumerico;
        });
    }
    
    respuestasUsuario[atributoActual] = valorNumerico;
    numeroPregunta++;
    hacerSiguientePregunta();
}

function registrarVictoria() {
    estadoJuego = "APRENDIENDO";
    document.getElementById("contenedor-carta-fut").classList.add("oculto");
    document.getElementById("bocadillo-charla").classList.remove("oculto");
    
    if (modoJuego === "competitivo") {
        const historial = JSON.parse(localStorage.getItem("album_capturas")) || [];
        if (!historial.includes(jugadorAdivinado.nombre)) {
            historial.push(jugadorAdivinado.nombre);
            localStorage.setItem("album_capturas", JSON.stringify(historial));
        }

        let racha = parseInt(localStorage.getItem("racha_competitiva")) || 0;
        racha++;
        localStorage.setItem("racha_competitiva", racha);

        document.getElementById("texto-pregunta").innerHTML = `
            ¡Jaja! ¡Te gané, viste! Re fácil.<br><br>
            🏆 <b>${jugadorAdivinado.nombre}</b> se sumó a tu Álbum.
        `;
    } else {
        document.getElementById("texto-pregunta").innerHTML = `
            ¡Jaja! ¡Te gané, viste! Re fácil.<br><br>
            🧠 Adiviné a <b>${jugadorAdivinado.nombre}</b>.
        `;
    }

    const contenedorBotones = document.querySelector(".botones-contenedor");
    contenedorBotones.innerHTML = `
        <button class="btn btn-si" onclick="location.reload()" style="width: 100%;">Volver al menú</button>
    `;
}

function mostrarFormularioAprendizaje() {
    estadoJuego = "APRENDIENDO";
    document.getElementById("contenedor-carta-fut").classList.add("oculto");
    document.getElementById("bocadillo-charla").classList.remove("oculto");
    
    document.getElementById("texto-pregunta").innerText = "¡Me rindo, che! No sé quién es... ¿En qué futbolista estabas pensando?";
    
    const contenedorBotones = document.querySelector(".botones-contenedor");
    contenedorBotones.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px; width: 90%; margin: 0 auto;">
            <input type="text" id="nombre-nuevo-jugador" placeholder="Escribí el nombre del jugador..." 
                   style="padding: 12px; border-radius: 20px; border: 2px solid #FFD700; font-size: 15px; text-align: center; width: 100%; outline: none; font-weight: bold;">
            <button class="btn btn-si" onclick="procesarAprendizaje()" style="width: 100%;">Enseñar a Akimessi</button>
        </div>
    `;
}

function procesarAprendizaje() {
    const nombreInput = document.getElementById("nombre-nuevo-jugador").value.trim();
    if (!nombreInput) {
        alert("¡Dale, bobo! Poné un nombre válido.");
        return;
    }

    let nuevoJugador = {
        id: "local_" + Date.now(),
        nombre: nombreInput,
        foto: "generico.webp", 
        equipo: "Personalizado",
        nacionalidad: "Desconocida",
        atributos: {}
    };

    columnasPreguntas.forEach(attr => {
        nuevoJugador.atributos[attr] = (attr in respuestasUsuario && respuestasUsuario[attr] !== -1) ? respuestasUsuario[attr] : 0;
    });

    const jugadoresLocales = JSON.parse(localStorage.getItem("jugadores_ia")) || [];
    jugadoresLocales.push(nuevoJugador);
    localStorage.setItem("jugadores_ia", JSON.stringify(jugadoresLocales));

    if (modoJuego === "competitivo") localStorage.setItem("racha_competitiva", 0);

    document.getElementById("texto-pregunta").innerText = `¡Guardé a ${nombreInput} en mi memoria! En la próxima partida no se me escapa.`;
    
    const contenedorBotones = document.querySelector(".botones-contenedor");
    contenedorBotones.innerHTML = `
        <button class="btn btn-si" onclick="location.reload()" style="width: 100%;">Volver al menú</button>
    `;
}

function iniciarMusica() {
    if (musica) musica.play().catch(e => console.log("Audio autoplay restringido"));
}

function actualizarLogros() {
    const historial = JSON.parse(localStorage.getItem("album_capturas")) || [];
    const racha = parseInt(localStorage.getItem("racha_competitiva")) || 0;
    const nivelActual = historial.length; 

    if (document.getElementById('racha-consecutivas')) document.getElementById('racha-consecutivas').innerText = racha;
    if (document.getElementById('total-capturados')) document.getElementById('total-capturados').innerText = nivelActual;
    
    for(let i = 1; i <= 10; i++) {
        const req = (i - 1) * 10 + 1;
        const el = document.getElementById(`logo-${i}`);
        if (el && nivelActual >= req) el.classList.remove('oscurecido');
    }
}

// --- EVENTOS ---
document.getElementById("btn-entrenamiento").addEventListener("click", () => {
    iniciarMusica();
    modoJuego = "entrenamiento";
    document.getElementById("pantalla-inicio").classList.add("oculto");
    document.getElementById("pantalla-juego").classList.remove("oculto");
    iniciarJuego();
});

document.getElementById("btn-estrella").addEventListener("click", () => {
    iniciarMusica();
    modoJuego = "competitivo";
    document.getElementById("pantalla-inicio").classList.add("oculto");
    document.getElementById("pantalla-juego").classList.remove("oculto");
    iniciarJuego();
});

document.getElementById("btn-logros").addEventListener("click", () => {
    iniciarMusica();
    actualizarLogros(); 
    document.getElementById("pantalla-inicio").classList.add("oculto");
    document.getElementById("pantalla-logros").classList.remove("oculto");
});

document.getElementById("btn-volver").addEventListener("click", () => {
    document.getElementById("pantalla-logros").classList.add("oculto");
    document.getElementById("pantalla-inicio").classList.remove("oculto");
});

cargarBaseDatos();