// URL de tu Google Sheets publicado como CSV con truco para evitar caché
const BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTl75_rySeY1kBnMnmjIZaA3fDJwKZt_IBI9Afq0f9TE09Dsr0heUOALSN8Ay2r7JIbViiF6Pqeoxpw/pub?gid=0&single=true&output=csv";
const SHEET_CSV_URL = `${BASE_URL}&t=${new Date().getTime()}`;

let jugadores = [];
let columnasPreguntas = [];
let respuestasUsuario = {};
let numeroPregunta = 1;
let atributoActual = "";
let juegoIniciado = false; // Nueva variable para controlar la pantalla de bienvenida

// Cargar la base de datos de inmediato al abrir la aplicación
window.onload = async () => {
    await cargarBaseDatos();
};

async function cargarBaseDatos() {
    try {
        const respuesta = await fetch(SHEET_CSV_URL);
        const texto = await respuesta.text();
        const lineas = texto.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        
        if (lineas.length === 0) return;

        // DETECTAR SEPARADOR: ¿Coma (,) o Punto y coma (;)?
        const primeraLinea = lineas[0];
        const separador = primeraLinea.includes(";") ? ";" : ",";
        
        // Extraer cabecera usando el separador correcto
        const cabecera = primeraLinea.split(separador);
        columnasPreguntas = cabecera.slice(5); // Las preguntas empiezan desde la sexta columna (ZURDO)

        // Parsear filas de jugadores
        for(let i = 1; i < lineas.length; i++) {
            const c = lineas[i].split(separador);
            // Solo exigimos que tenga al menos los 5 datos básicos de identificación
            if(c.length < 5) continue;

            let jugador = {
                id: c[0],
                nombre: c[1],
                foto: c[2],
                equipo: c[3],
                nacionalidad: c[4],
                atributos: {}
            };

            // Rellenar las características asegurándonos de que si falta alguna columna, use -1 (No lo sé)
            for(let j = 0; j < columnasPreguntas.length; j++) {
                let valorCelda = c[j + 5];
                let valorParseado = parseInt(valorCelda);
                jugador.atributos[columnasPreguntas[j]] = isNaN(valorParseado) ? -1 : valorParseado;
            }
            jugadores.push(jugador);
        }
        console.log("Base de datos cargada con éxito. Jugadores:", jugadores.length);
    } catch (e) {
        console.error("Error al cargar la base de datos", e);
        document.getElementById("texto-pregunta").innerText = "⚠️ Error al conectar con la base de datos de AkiMessi.";
    }
}

function iniciarJuego() {
    // SEGURO DE CARGA: Si no hay jugadores cargados, avisamos en pantalla para no congelar el juego
    if (jugadores.length === 0) {
        document.getElementById("texto-pregunta").innerText = "⚠️ No se han podido cargar futbolistas de Google Sheets. Verifica que el enlace esté publicado correctamente.";
        return;
    }
    
    respuestasUsuario = {};
    numeroPregunta = 1;
    juegoIniciado = true; // El juego ha comenzado oficialmente
    document.getElementById("pantalla-juego").classList.remove("ronda-dorada");
    document.getElementById("imagen-messi").src = "img/messi_genio.png";
    hacerSiguientePregunta();
}

function hacerSiguientePregunta() {
    // 1. Filtrar los candidatos activos
    let candidatosActivos = jugadores.filter(j => {
        for (let attr in respuestasUsuario) {
            let resEsperada = j.atributos[attr];
            let resDada = respuestasUsuario[attr];
            if (resEsperada !== -1 && resEsperada !== resDada) {
                return false;
            }
        }
        return true;
    });

    // ¡FIN DEL JUEGO! Si ya respondimos la pregunta 10 o si queda 1 solo jugador
    if (numeroPregunta > 10 || candidatosActivos.length <= 1) {
        adivinarJugador(candidatosActivos[0]);
        return;
    }

    // Activar el modo "PREGUNTA DE ORO" justo en la ronda 10
    if (numeroPregunta === 10) {
        document.getElementById("pantalla-juego").classList.add("ronda-dorada");
        document.getElementById("imagen-messi").src = "img/messi_oro.png";
        document.getElementById("contador-preguntas").innerText = "🏆 PREGUNTA DE ORO 🏆";
    }

    // 2. Elegir la mejor pregunta basándonos en la división de candidatos (entropía básica)
    let mejorAtributo = elegirMejorAtributo(candidatosActivos);
    
    if (!mejorAtributo) {
        adivinarJugador(candidatosActivos[0]);
        return;
    }

    atributoActual = mejorAtributo;
    let textoMostrar = traducirAtributoAPregunta(mejorAtributo);
    
    // Cambiar texto de pregunta e indicador según la ronda
    if (numeroPregunta === 10) {
        document.getElementById("texto-pregunta").innerText = `¡Última oportunidad! ${textoMostrar}`;
    } else {
        document.getElementById("texto-pregunta").innerText = textoMostrar;
        document.getElementById("contador-preguntas").innerText = `Pregunta Nº ${numeroPregunta}`;
    }
}

function elegirMejorAtributo(listaCandidatos) {
    let mejorAttr = null;
    let mejorDiferencia = Infinity;

    columnasPreguntas.forEach(attr => {
        // Ignorar atributos que ya se han preguntado
        if (respuestasUsuario[attr] !== undefined) return;

        let conSueldoDeSies = listaCandidatos.filter(j => j.atributos[attr] === 1).length;
        let conSueldoDeNoes = listaCandidatos.filter(j => j.atributos[attr] === 0).length;

        // Buscamos que la pregunta divida a los candidatos lo más cerca posible de la mitad (50/50)
        let diferencia = Math.abs(conSueldoDeSies - conSueldoDeNoes);
        
        if (diferencia < mejorDiferencia) {
            mejorDiferencia = diferencia;
            mejorAttr = attr;
        }
    });

    return mejorAttr;
}

function responder(valor) {
    // Si aún no hemos iniciado el juego (estamos en el saludo inicial),
    // cualquier botón sirve para gatillar el inicio real del juego.
    if (!juegoIniciado) {
        iniciarJuego();
        return;
    }

    if (valor !== -1) {
        // Guardamos si respondió SÍ (1) o NO (0)
        respuestasUsuario[atributoActual] = valor;
    }
    // Si presionó NO LO SÉ (-1), simplemente saltamos la pregunta incrementando el contador
    numeroPregunta++;
    hacerSiguientePregunta();
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
        "AFRICA": "¿Representa a un país del continente africano?",
        "AMERICA_NORTE": "¿Nació en Norteamérica (EEUU, México, Canadá)?",
        "AMERICA_SUR": "¿Es un crack sudamericano de pura cepa?",
        "OCEANIA": "¿Pertenece al continente de Oceanía?",
        "ASIA": "¿Nació o representa a un país de Asia?",
        "LALIGA": "¿Juega actualmente en LaLiga de España?",
        "PREMIER": "¿Juega en la Premier League de Inglaterra?",
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

function adivinarJugador(jugador) {
    if (jugador) {
        document.getElementById("texto-pregunta").innerText = `¡YA SÉ QUIÉN ES! ¡Es ${jugador.nombre}! Que juega en ${jugador.equipo}. ¿A que te la gané, bobo?`;
        document.getElementById("imagen-messi").src = `img/futbolistas/${jugador.foto}`;
    } else {
        document.getElementById("texto-pregunta").innerText = "¡Me amagaste bien! No encontré ningún futbolista con esas características... ¿Me estás mintiendo, bobo?";
        document.getElementById("imagen-messi").src = "img/messi_oro.png";
    }
}