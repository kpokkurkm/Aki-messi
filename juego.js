// --- CONFIGURACIÓN ---
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTl75_rySeY1kBnMnmjIZaA3fDJwKZt_IBI9Afq0f9TE09Dsr0heUOALSN8Ay2r7JIbViiF6Pqeoxpw/pub?gid=0&single=true&output=csv";
let jugadores = [];
let respuestasUsuario = {};
let numeroPregunta = 1;
let juegoIniciado = false;
let atributoActual = "";
let candidatos = []; 

// Control de estados de la IA
let estadoJuego = "JUGANDO"; // Puede ser: "JUGANDO", "ADIVINANDO", "APRENDIENDO"
let jugadorAdivinado = null;

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
        console.log("[Base de Datos] Iniciando carga desde:", CSV_URL);
        const respuesta = await fetch(CSV_URL);
        if (!respuesta.ok) throw new Error("Error en la respuesta del servidor: " + respuesta.status);
        
        const texto = await respuesta.text();
        const lineas = texto.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        
        jugadores = [];
        for(let i = 1; i < lineas.length; i++) {
            const c = lineas[i].split(","); 
            if(c.length < 5) continue;

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

        const jugadoresLocales = JSON.parse(localStorage.getItem("jugadores_ia")) || [];
        jugadores = [...jugadores, ...jugadoresLocales];

        console.log("[Base de Datos] Éxito. Total jugadores cargados:", jugadores.length);
        iniciarJuego();
    } catch (e) {
        console.error("[Base de Datos] Error crítico:", e);
        document.getElementById("texto-pregunta").innerText = "⚠️ Error al conectar con la base de datos: " + e.message;
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
    console.log("[Juego] Partida iniciada. Pool inicial de candidatos:", candidatos.length);
    hacerSiguientePregunta();
}

function hacerSiguientePregunta() {
    console.log(`\n--- [RONDA Nº ${numeroPregunta}] ---`);
    console.log("[IA] Cantidad de candidatos en este turno:", candidatos.length);

    // CRÍTICO: Si ya se respondió la pregunta 10, pasamos directo a resolver la partida
    if (numeroPregunta > 10) {
        console.log("[IA] ¡Límite alcanzado! Resolviendo partida con los mejores candidatos.");
        if (candidatos.length > 0) {
            proponerJugador(candidatos[0]);
        } else {
            mostrarFormularioAprendizaje();
        }
        return;
    }
    
    if (candidatos.length === 0) {
        console.log("[IA] Quedamos en 0 candidatos. Yendo a formulario de aprendizaje.");
        mostrarFormularioAprendizaje();
        return;
    }
    
    if (candidatos.length === 1) {
        console.log("[IA] ¡Candidato único encontrado antes de tiempo!", candidatos[0].nombre);
        proponerJugador(candidatos[0]);
        return;
    }
    
    let atributosPendientes = columnasPreguntas.filter(a => !(a in respuestasUsuario));
    if (atributosPendientes.length === 0) {
        console.log("[IA] Sin más preguntas disponibles. Arriesgando con lo que queda.");
        proponerJugador(candidatos[0]);
        return;
    }
    
    // Algoritmo de descarte óptimo
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
    console.log(`[IA] Atributo seleccionado para preguntar: "${atributoActual}"`);
    
    // --- CONTROL VISUAL: PREGUNTA DE ORO (PREGUNTA 10) ---
    const imgGenio = document.querySelector(".genio-contenedor img") || document.querySelector("img");
    const contenedorPrincipal = document.body; 
    
    if (numeroPregunta === 10) {
        console.log("[Efecto Visual] ¡Activando modo Messi de Oro!");
        if (imgGenio) imgGenio.src = "img/messi_oro.png"; 
        
        contenedorPrincipal.style.transition = "all 0.8s ease";
        contenedorPrincipal.style.background = "linear-gradient(135deg, #FFE259 0%, #FFA751 100%)";
        
        document.getElementById("texto-pregunta").innerHTML = `✨ <b style="color: #D4AF37; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);">¡LA PREGUNTA DE ORO!</b> ✨<br><br>${textoPregunta}`;
    } else {
        document.getElementById("texto-pregunta").innerText = textoPregunta;
    }
    
    document.getElementById("contador-preguntas").innerText = "Pregunta Nº " + numeroPregunta;
}

// --- PROPUESTA FINAL CON FOTO DEL FUTBOLISTA ---
function proponerJugador(jugador) {
    estadoJuego = "ADIVINANDO";
    jugadorAdivinado = jugador;
    console.log("[IA] Proponiendo resolución final. Jugador:", jugador.nombre);
    
    document.getElementById("texto-pregunta").innerHTML = `
        <p style="margin-bottom: 12px;">¡Ya sé quién es! ¿Es <b>${jugador.nombre}</b>?</p>
        <img src="img/futbolistas/${jugador.foto}" onerror="this.src='img/futbolistas/generico.webp'" 
             style="max-width: 160px; max-height: 160px; border-radius: 20px; border: 4px solid #FFD700; box-shadow: 0 8px 20px rgba(0,0,0,0.3); display: block; margin: 15px auto;">
    `;
}

function traducirAtributoAPregunta(attr) {
    const diccionario = {
        "ZURDO": "¿Es zurdo para pegarle a la pelota?",
        "RETIRADO": "¿Ya se retiró y colgó los botines?",
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
    console.log(`[Usuario] Click botón valor: ${valorNumerico} (Buscando coincidencia exacta)`);

    if (estadoJuego === "ADIVINANDO") {
        if (valorNumerico === 1) {
            registrarVictoria();
        } else {
            console.log("[Juego] La IA falló la predicción. Pasando a aprendizaje.");
            mostrarFormularioAprendizaje();
        }
        return;
    }

    if (valorNumerico !== -1) {
        const cantidadAntes = candidatos.length;
        
        candidatos = candidatos.filter(jugador => {
            const valorAtributo = parseInt(jugador.atributos[atributoActual]) || 0;
            return valorAtributo === valorNumerico;
        });
        
        console.log(`[Filtro Aplicado] Atributo: ${atributoActual} | Valor buscado: ${valorNumerico}`);
        console.log(`[Filtro Aplicado] Candidatos antes: ${cantidadAntes} -> Candidatos restantes: ${candidatos.length}`);
    } else {
        console.log("[Filtro Saltado] El usuario respondió 'No lo sé' (-1). No se descartan jugadores.");
    }
    
    respuestasUsuario[atributoActual] = valorNumerico;
    numeroPregunta++;
    hacerSiguientePregunta();
}

// --- REGISTRAR VICTORIA Y HISTORIAL ---
function registrarVictoria() {
    estadoJuego = "APRENDIENDO";
    console.log("[Juego] ¡Victoria de la IA!");
    
    const historial = JSON.parse(localStorage.getItem("album_capturas")) || [];
    if (!historial.includes(jugadorAdivinado.nombre)) {
        historial.push(jugadorAdivinado.nombre);
        localStorage.setItem("album_capturas", JSON.stringify(historial));
    }

    document.getElementById("texto-pregunta").innerHTML = `
        ¡Jaja! ¡Te gané, viste! Re fácil.<br><br>
        🏆 <b>${jugadorAdivinado.nombre}</b> se sumó a tu Álbum de Capturas.<br>
        ¡Ya coleccionaste <b>${historial.length}</b> futbolistas!
    `;

    const contenedorBotones = document.querySelector(".botones-contenedor");
    contenedorBotones.innerHTML = `
        <div class="fila-unika">
            <button class="btn btn-si" onclick="location.reload()" style="width: 100%;">Volver a jugar</button>
        </div>
    `;
}

// --- FUNCIONES DE APRENDIZAJE IA ---
function mostrarFormularioAprendizaje() {
    estadoJuego = "APRENDIENDO";
    document.getElementById("texto-pregunta").innerText = "¡Me rindo, che! No sé quién es... ¿En qué futbolista estabas pensando?";
    
    const contenedorBotones = document.querySelector(".botones-contenedor");
    contenedorBotones.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; width: 85%; margin: 0 auto; align-items: center;">
            <input type="text" id="nombre-nuevo-jugador" placeholder="Escribí el nombre del jugador..." 
                   style="padding: 14px; border-radius: 25px; border: 3px solid #FFD700; font-size: 16px; text-align: center; width: 100%; outline: none; font-weight: bold;">
            <button class="btn btn-si" onclick="procesarAprendizaje()" style="width: 100%; margin: 0;">Enseñar a Akimessi</button>
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

    console.log("[IA Aprendizaje] Nuevo jugador guardado localmente:", nombreInput);

    document.getElementById("texto-pregunta").innerText = `¡Espectacular! Ya guardé a ${nombreInput} en mi memoria. En la próxima partida no se me escapa.`;
    
    const contenedorBotones = document.querySelector(".botones-contenedor");
    contenedorBotones.innerHTML = `
        <div class="fila-unika">
            <button class="btn btn-si" onclick="location.reload()" style="width: 100%;">Volver a jugar</button>
        </div>
    `;
}

// Inicialización de la app
cargarBaseDatos();