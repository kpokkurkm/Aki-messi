// --- CONFIGURACIÓN ---
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTl75_rySeY1kBnMnmjIZaA3fDJwKZt_IBI9Afq0f9TE09Dsr0heUOALSN8Ay2r7JIbViiF6Pqeoxpw/pub?gid=0&single=true&output=csv";
let jugadores = [];
let respuestasUsuario = {};
let numeroPregunta = 1;
let juegoIniciado = false;
let atributoActual = "";
let candidatos = []; 

// Control de estados y modos de la IA
let estadoJuego = "JUGANDO"; // Puede ser: "JUGANDO", "ADIVINANDO", "APRENDIENDO"
let jugadorAdivinado = null;
let modoJuego = ""; // Puede ser: "entrenamiento" o "competitivo"
const musica = document.getElementById("musica-fondo");

const columnasPreguntas = [
    "ZURDO", "RETIRADO", "PORTERO", "DEFENSA", "CENTROCAMPISTA", "DELANTERO",
    "EUROPA", "EUROPA_HISTORICO", "AFRICA", "AMERICA_NORTE", "AMERICA_SUR", "OCEANIA", "ASIA",
    "LALIGA", "LALIGA_HISTORICO", "PREMIER", "PREMIER_HISTORICO", "SERIE_A", "BUNDESLIGA", "LIGUE_1",
    "SELECCION_NACIONAL", "MUNDIAL", "EURO_AMERICA", "CHAMPIONS", "BALON_ORO", "MAX_GOLEADOR", "CAPITAN",
    "FICHAJE_CARO", "ENTRENADOR", "CALVO", "LEYENDA_90"
];

// Función auxiliar para limpiar impurezas de Excel/Google Sheets
function limpiarCelda(texto) {
    if (!texto) return "";
    return texto.trim().replace(/^["']|["']$/g, ''); 
}

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

        console.log("[Base de Datos] Éxito. Total jugadores cargados:", jugadores.length);
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
    console.log("[Juego] Partida iniciada en modo:", modoJuego, "| Candidatos:", candidatos.length);
    hacerSiguientePregunta();
}

function hacerSiguientePregunta() {
    console.log(`\n--- [RONDA Nº ${numeroPregunta}] ---`);
    console.log("[IA] Cantidad de candidatos en este turno:", candidatos.length);

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
    
    const imgGenio = document.querySelector(".genio-contenedor img") || document.querySelector("img");
    const contenedorPrincipal = document.getElementById("pantalla-juego"); 
    
    if (numeroPregunta === 10) {
        console.log("[Efecto Visual] ¡Activando modo Messi de Oro!");
        if (imgGenio) imgGenio.src = "img/messi_oro.png"; 
        
        contenedorPrincipal.classList.add("ronda-dorada");
        
        document.getElementById("texto-pregunta").innerHTML = `✨ <b style="color: #D4AF37; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);">¡LA PREGUNTA DE ORO!</b> ✨<br><br>${textoPregunta}`;
    } else {
        contenedorPrincipal.classList.remove("ronda-dorada");
        document.getElementById("texto-pregunta").innerText = textoPregunta;
    }
    
    document.getElementById("contador-preguntas").innerText = "Pregunta Nº " + numeroPregunta;
}

/* ==========================================================================
   PROPOSICIÓN CON CARTA FUT / PANINI
   ========================================================================== */
function proponerJugador(jugador) {
    estadoJuego = "ADIVINANDO";
    jugadorAdivinado = jugador;
    console.log("[IA] Proponiendo resolución final. Jugador:", jugador.nombre);
    
    document.getElementById("contador-preguntas").innerText = "🔮 ¡TENGO A TU CRACK!";
    
    document.getElementById("texto-pregunta").innerHTML = `
        <p style="margin-bottom: 6px; font-weight: 800; font-size: 1.1rem; color: #111;">¿Estás pensando en este jugador?</p>
        
        <div class="fut-card-container">
            <div class="fut-card">
                <div class="fut-card-header">
                    <div>
                        <div class="fut-rating">99</div>
                        <div class="fut-position">CRACK</div>
                    </div>
                </div>
                <img class="fut-player-img" 
                     src="img/futbolistas/${jugador.foto}" 
                     onerror="this.onerror=null; this.src='https://cdn-icons-png.flaticon.com/512/53/53283.png';"
                     alt="${jugador.nombre}">
                <div class="fut-player-name">${jugador.nombre}</div>
                <div class="fut-stats-grid">
                    <div class="fut-stat-item">EQP <span>${jugador.equipo || 'Club'}</span></div>
                    <div class="fut-stat-item">NAC <span>${jugador.nacionalidad || 'Mundo'}</span></div>
                    <div class="fut-stat-item">PAC <span>99</span></div>
                </div>
            </div>
        </div>
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

function responder(valor) {
    const valorNumerico = parseInt(valor);
    console.log(`[Usuario] Click botón valor: ${valorNumerico}`);

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

function registrarVictoria() {
    estadoJuego = "APRENDIENDO";
    console.log("[Juego] ¡Victoria de la IA!");
    
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
            🏆 <b>${jugadorAdivinado.nombre}</b> se sumó a tu Álbum de Capturas.<br>
            ¡Ya coleccionaste <b>${historial.length}</b> futbolistas y tu racha es de <b>${racha}</b>!
        `;
    } else {
        document.getElementById("texto-pregunta").innerHTML = `
            ¡Jaja! ¡Te gané, viste! Re fácil.<br><br>
            🧠 Modo Entrenamiento: Adiviné a <b>${jugadorAdivinado.nombre}</b> con éxito.
        `;
    }

    const contenedorBotones = document.querySelector(".botones-contenedor");
    contenedorBotones.innerHTML = `
        <div class="fila-unika">
            <button class="btn btn-si" onclick="location.reload()" style="width: 100%;">Volver al menú</button>
        </div>
    `;
}

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

    if (modoJuego === "competitivo") {
        localStorage.setItem("racha_competitiva", 0);
    }

    document.getElementById("texto-pregunta").innerText = `¡Espectacular! Ya guardé a ${nombreInput} en mi memoria. En la próxima partida no se me escapa.`;
    
    const contenedorBotones = document.querySelector(".botones-contenedor");
    contenedorBotones.innerHTML = `
        <div class="fila-unika">
            <button class="btn btn-si" onclick="location.reload()" style="width: 100%;">Volver al menú</button>
        </div>
    `;
}

// --- REPRODUCTOR DE MÚSICA SEGURO ---
function iniciarMusica() {
    if (musica) {
        musica.play().catch(error => {
            console.log("[Audio] Interacción requerida o bloqueo de autoplay activo:", error);
        });
    }
}

// --- NUEVO SISTEMA DE LOGROS COMPATIBLE (CON FIX DE PRIMER ESCUDO) ---
function actualizarLogros() {
    const historial = JSON.parse(localStorage.getItem("album_capturas")) || [];
    const racha = parseInt(localStorage.getItem("racha_competitiva")) || 0;
    const nivelActual = historial.length; 

    if (document.getElementById('racha-consecutivas')) {
        document.getElementById('racha-consecutivas').innerText = racha;
    }
    if (document.getElementById('total-capturados')) {
        document.getElementById('total-capturados').innerText = nivelActual;
    }
    
    let rangoTexto = "A.D. Torrejón de Ardoz (Niv. 1-10)";
    if (nivelActual > 10 && nivelActual <= 20) rangoTexto = "Alcorcón (Niv. 11-20)";
    if (nivelActual > 20 && nivelActual <= 30) rangoTexto = "Rayo Vallecano (Niv. 21-30)";
    if (nivelActual > 30 && nivelActual <= 40) rangoTexto = "Ajax (Niv. 31-40)";
    if (nivelActual > 40 && nivelActual <= 50) rangoTexto = "Tottenham (Niv. 41-50)";
    if (nivelActual > 50 && nivelActual <= 60) rangoTexto = "Liverpool (Niv. 51-60)";
    if (nivelActual > 60 && nivelActual <= 70) rangoTexto = "FC Barcelona (Niv. 61-70)";
    if (nivelActual > 70 && nivelActual <= 80) rangoTexto = "Inter Miami (Niv. 71-80)";
    if (nivelActual > 80 && nivelActual <= 90) rangoTexto = "Selección Española (Niv. 81-90)";
    if (nivelActual > 90) rangoTexto = "¡Campeón del Mundo! (Niv. 91-100)";

    if (document.getElementById('rango-texto')) {
        document.getElementById('rango-texto').innerText = rangoTexto;
    }

    if (nivelActual >= 1)  { const el = document.getElementById('logo-1'); if(el) el.classList.remove('oscurecido'); }
    if (nivelActual >= 11) { const el = document.getElementById('logo-2'); if(el) el.classList.remove('oscurecido'); }
    if (nivelActual >= 21) { const el = document.getElementById('logo-3'); if(el) el.classList.remove('oscurecido'); }
    if (nivelActual >= 31) { const el = document.getElementById('logo-4'); if(el) el.classList.remove('oscurecido'); }
    if (nivelActual >= 41) { const el = document.getElementById('logo-5'); if(el) el.classList.remove('oscurecido'); }
    if (nivelActual >= 51) { const el = document.getElementById('logo-6'); if(el) el.classList.remove('oscurecido'); }
    if (nivelActual >= 61) { const el = document.getElementById('logo-7'); if(el) el.classList.remove('oscurecido'); }
    if (nivelActual >= 71) { const el = document.getElementById('logo-8'); if(el) el.classList.remove('oscurecido'); }
    if (nivelActual >= 81) { const el = document.getElementById('logo-9'); if(el) el.classList.remove('oscurecido'); }
    if (nivelActual >= 91) { const el = document.getElementById('logo-10'); if(el) el.classList.remove('oscurecido'); }
    
    const coleccionTexto = document.getElementById("coleccion-lista-nombres");
    if (coleccionTexto) {
        coleccionTexto.innerText = historial.join(", ") || "Ningún jugador capturado todavía.";
    }
}

// --- MANU DE ESCUCHADORES DE EVENTOS ---
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

// Inicialización silenciosa de la base de datos al arrancar
cargarBaseDatos();