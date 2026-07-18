// --- CONFIGURACIÓN ---
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTl75_rySeY1kBnMnmjIZaA3fDJwKZt_IBI9Afq0f9TE09Dsr0heUOALSN8Ay2r7JIbViiF6Pqeoxpw/pub?gid=0&single=true&output=csv";
let jugadores = [];
let respuestasUsuario = {};
let numeroPregunta = 1;
let juegoIniciado = false;
let atributoActual = "";
let candidatos = []; 

const columnasPreguntas = [
    "ZURDO", "RETIRADO", "PORTERO", "DEFENSA", "CENTROCAMPISTA", "DELANTERO",
    "EUROPA", "EUROPA_HISTORICO", "AFRICA", "AMERICA_NORTE", "AMERICA_SUR", "OCEANIA", "ASIA",
    "LALIGA", "LALIGA_HISTORICO", "PREMIER", "PREMIER_HISTORICO", "SERIE_A", "BUNDESLIGA", "LIGUE_1",
    "SELECCION_NACIONAL", "MUNDIAL", "EURO_AMERICA", "CHAMPIONS", "BALON_ORO", "MAX_GOLEADOR", "CAPITAN",
    "FICHAJE_CARO", "ENTRENADOR", "CALVO", "LEYENDA_90"
];

// --- CARGA DE DATOS ---
async function cargarBaseDatos() {
    try {
        console.log("Iniciando carga de datos desde:", CSV_URL);
        const respuesta = await fetch(CSV_URL);
        if (!respuesta.ok) throw new Error("Error en la respuesta del servidor: " + respuesta.status);
        
        const texto = await respuesta.text();
        const lineas = texto.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        console.log("Líneas cargadas:", lineas.length);
        
        jugadores = [];
        for(let i = 1; i < lineas.length; i++) {
            const c = lineas[i].split(","); 
            if(c.length < 5) {
                console.warn("Línea ignorada por formato incorrecto (menos de 5 columnas):", lineas[i]);
                continue;
            }

            let jugador = {
                id: c[0].trim(), nombre: c[1].trim(), foto: c[2].trim(),
                equipo: c[3].trim(), nacionalidad: c[4].trim(), atributos: {}
            };

            for(let j = 0; j < columnasPreguntas.length; j++) {
                let valor = c[j + 5] ? c[j + 5].trim() : "0";
                jugador.atributos[columnasPreguntas[j]] = parseInt(valor) || 0;
            }
            jugadores.push(jugador);
        }

        // --- UBICACIÓN CORRECTA: Cargamos los jugadores de la IA después de procesar el CSV ---
        const jugadoresLocales = JSON.parse(localStorage.getItem("jugadores_ia")) || [];
        jugadores = [...jugadores, ...jugadoresLocales];
        // -------------------------------------------------------------------------------------

        console.log("Base de datos cargada con éxito. Total jugadores:", jugadores.length);
        iniciarJuego();
    } catch (e) {
        console.error("Error crítico al cargar la base de datos:", e);
        document.getElementById("texto-pregunta").innerText = "⚠️ Error al conectar con la base de datos: " + e.message;
    }
}

// --- LÓGICA DE JUEGO ---
function iniciarJuego() {
    if (jugadores.length === 0) return;
    respuestasUsuario = {};
    candidatos = [...jugadores]; 
    numeroPregunta = 1;
    juegoIniciado = true;
    console.log("Juego iniciado. Candidatos iniciales:", candidatos.length);
    hacerSiguientePregunta();
}

function hacerSiguientePregunta() {
    let atributosPendientes = columnasPreguntas.filter(a => !(a in respuestasUsuario));
    
    if (candidatos.length === 0) {
        document.getElementById("texto-pregunta").innerText = "¡No encontré a nadie con esas características!";
        return;
    }
    
    if (atributosPendientes.length === 0) {
        document.getElementById("texto-pregunta").innerText = "¡He agotado las preguntas y no estoy seguro!";
        return;
    }
    
    atributoActual = atributosPendientes[0];
    const textoPregunta = traducirAtributoAPregunta(atributoActual);
    
    document.getElementById("texto-pregunta").innerText = textoPregunta;
    document.getElementById("contador-preguntas").innerText = "Pregunta Nº " + numeroPregunta;
    console.log("Pregunta", numeroPregunta, ":", atributoActual, "| Candidatos restantes:", candidatos.length);
}

function traducirAtributoAPregunta(attr) {
    const diccionario = {
        "ZURDO": "¿Es zurdo para pegarle a la pelota?",
        "RETIRADO": "¿Ya se retiró y colgó los botines?",
        "SUB_21": "¿Es un pibe de menos de 21 años?",
        "PORTERO": "¿Su posición es arquero / portero?",
        "DEFENSA": "¿Es un defensor rústico o de categoría?",
        "CENTROCAMPISTA": "¿Juega en el mediocampo repartiendo juego?",
        "DELANTERO": "¿Es un delantero letal que vive del gol?",
        "EUROPA": "¿Nació o juega con una selección de Europa?",
        "EUROPA_HISTORICO": "¿Ha jugado alguna vez en Europa?",
        "AFRICA": "¿Representa a un país del continente africano?",
        "AMERICA_NORTE": "¿Nació en Norteamérica (EEUU, México, Canadá)?",
        "AMERICA_SUR": "¿Es un crack sudamericano de pura cepa?",
        "OCEANIA": "¿Pertenece al continente de Oceanía?",
        "ASIA": "¿Nació o representa a un país de Asia?",
        "LALIGA": "¿Juega actualmente en LaLiga de España?",
        "LALIGA_HISTORICO": "¿Ha jugado alguna vez en LaLiga española?",
        "PREMIER": "¿Juega en la Premier League de Inglaterra?",
        "PREMIER_HISTORICO": "¿Ha jugado alguna vez en la Premier League?",
        "SERIE_A": "¿Disputa la Serie A de Italia?",
        "BUNDESLIGA": "¿Muestra su juego en la Bundesliga de Alemania?",
        "LIGUE_1": "¿Juega en la Ligue 1 de Francia?",
        "SELECCION_NACIONAL": "¿Suele ser convocado por su selección nacional?",
        "MUNDIAL": "¿Ganó alguna vez la Copa del Mundo de la FIFA?",
        "EURO_AMERICA": "¿Ganó una Eurocopa o una Copa América?",
        "CHAMPIONS": "¿Tiene la Orejona de la Champions en su vitrina?",
        "BALON_ORO": "¿Ha ganado al menos un Balón de Oro?",
        "MAX_GOLEADOR": "¿Ha sido máximo goleador de una gran liga o torneo?",
        "CAPITAN": "¿Lleva o ha llevado el brazalete de capitán?",
        "FICHAJE_CARO": "¿Fue protagonista de un fichaje multimillonario?",
        "ENTRENADOR": "¿Trabaja o trabajó como director técnico tras retirarse?",
        "CALVO": "¿Es pelado / calvo?",
        "LEYENDA_90": "¿Es un histórico que brilló en los años 90 o antes?"
    };
    return diccionario[attr] || `¿Tiene la característica: ${attr}?`;
}

// --- LÓGICA DE RESPUESTA ---
function responder(valor) {
    const valorNumerico = parseInt(valor);
    console.log("--- FILTRO ---");
    console.log("Atributo actual:", atributoActual);
    console.log("Respuesta usuario (esperado):", valorNumerico);

    if (valorNumerico !== -1) {
        candidatos = candidatos.filter(jugador => {
            const valorAtributo = parseInt(jugador.atributos[atributoActual]);
            
            if (jugador.nombre.includes("Pele")) {
                console.log("Evaluando a Pele:", "Valor CSV:", valorAtributo, "¿Coincide?", valorAtributo === valorNumerico);
            }
            
            return valorAtributo === valorNumerico;
        });
        console.log("Candidatos restantes tras filtrar:", candidatos.length);
    }
    
    respuestasUsuario[atributoActual] = valorNumerico;

    if (candidatos.length === 1) {
        document.getElementById("texto-pregunta").innerText = "¡Ya sé quién es! ¿Es " + candidatos[0].nombre + "?";
        return;
    }

    if (candidatos.length === 0) {
        mostrarFormularioAprendizaje();
        return;
    }
    
    numeroPregunta++;
    hacerSiguientePregunta();
}

// --- NUEVAS FUNCIONES DE APRENDIZAJE IA ---

function mostrarFormularioAprendizaje() {
    document.getElementById("texto-pregunta").innerText = "¡Me rindo, che! No sé quién es... ¿En qué futbolista estabas pensando?";
    
    const contenedorBotones = document.querySelector(".botones-contenedor");
    contenedorBotones.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; width: 85%; margin: 0 auto; align-items: center;">
            <input type="text" id="nombre-nuevo-jugador" placeholder="Escribí el nombre del jugador..." 
                   style="padding: 14px; border-radius: 25px; border: 3px solid #FFD700; font-size: 16px; text-align: center; width: 100%; outline: none; font-weight: bold;">
            <button class="btn btn-si" onclick="procesarAprendizaje()" style="width: 100%; margin: 0;">Enseñar a Messi</button>
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
        if (attr in respuestasUsuario) {
            nuevoJugador.atributos[attr] = respuestasUsuario[attr] === -1 ? 0 : respuestasUsuario[attr];
        } else {
            nuevoJugador.atributos[attr] = 0;
        }
    });

    const jugadoresLocales = JSON.parse(localStorage.getItem("jugadores_ia")) || [];
    jugadoresLocales.push(nuevoJugador);
    localStorage.setItem("jugadores_ia", JSON.stringify(jugadoresLocales));

    document.getElementById("texto-pregunta").innerText = `¡Espectacular! Ya guardé a ${nombreInput} en mi memoria. En la próxima partida no se me escapa.`;
    
    const contenedorBotones = document.querySelector(".botones-contenedor");
    contenedorBotones.innerHTML = `
        <div class="fila-unika">
            <button class="btn btn-si" onclick="location.reload()" style="width: 100%;">Volver a jugar</button>
        </div>
    `;
}

// Inicialización limpia de la app
cargarBaseDatos();