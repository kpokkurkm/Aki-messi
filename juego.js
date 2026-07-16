// URL de tu Google Sheets publicado como CSV con truco para evitar caché
const CSV_FILE = "Hoja1.csv";
const SHEET_CSV_URL = `${BASE_URL}&t=${new Date().getTime()}`;

let jugadores = [];
let columnasPreguntas = [];
let respuestasUsuario = {};
let numeroPregunta = 1;
let atributoActual = "";
let juegoIniciado = false; 

// Cargar la base de datos de inmediato al abrir la aplicación
window.onload = async () => {
    await cargarBaseDatos();
};

function limpiarTexto(texto) {
    if (!texto) return "";
    return texto.trim()
                .replace(/[\r\n]+/g, "")
                .toUpperCase();
}

function parsearValorCelda(valor) {
    if (valor === undefined || valor === null) return -1;
    let v = valor.toString().trim().toUpperCase();
    
    if (v === "1" || v === "SI" || v === "SÍ") return 1;
    if (v === "0" || v === "NO") return 0;
    
    return -1; // -1 significa que no se sabe o está vacío
}

async function cargarBaseDatos() {
    try {
        const respuesta = await fetch(CSV_FILE); // Carga el archivo local
        const texto = await respuesta.text();
        const lineas = texto.split("\n").map(l => l.replace("\r", "").trim()).filter(l => l.length > 0);
        
        if (lineas.length === 0) return;

        const primeraLinea = lineas[0];
        const separador = primeraLinea.includes(";") ? ";" : ",";
        
        const cabecera = primeraLinea.split(separador);
        columnasPreguntas = cabecera.slice(5).map(col => limpiarTexto(col)); 

        console.log("Cabeceras de preguntas detectadas en Sheets:", columnasPreguntas);

        jugadores = [];
        for(let i = 1; i < lineas.length; i++) {
            const c = lineas[i].split(separador);
            if(c.length < 5) continue;

            let jugador = {
                id: c[0].trim(),
                nombre: c[1].trim(),
                foto: c[2].trim(),
                equipo: c[3].trim(),
                nacionalidad: c[4].trim(),
                atributos: {}
            };

            for(let j = 0; j < columnasPreguntas.length; j++) {
                let valorCelda = c[j + 5];
                let claveAtributo = columnasPreguntas[j];
                jugador.atributos[claveAtributo] = parsearValorCelda(valorCelda);
            }
            jugadores.push(jugador);
        }
        console.log("Base de datos cargada con éxito. Jugadores totales:", jugadores.length);
    } catch (e) {
        console.error("Error al cargar la base de datos", e);
        document.getElementById("texto-pregunta").innerText = "⚠️ Error al conectar con la base de datos de AkiMessi.";
    }
}

function iniciarJuego() {
    if (jugadores.length === 0) {
        document.getElementById("texto-pregunta").innerText = "⚠️ No se han podido cargar futbolistas de Google Sheets.";
        return;
    }
    
    respuestasUsuario = {};
    numeroPregunta = 1;
    juegoIniciado = true; 
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
            
            if (resDada === 1 || resDada === 0) {
                if (resEsperada !== -1 && resEsperada !== resDada) {
                    return false; // Descartado
                }
            }
        }
        return true;
    });

    console.log(`Pregunta ${numeroPregunta} | Candidatos restantes: ${candidatosActivos.length}`);
    
    // Si solo queda un candidato, ¡adivinamos inmediatamente!
    if (candidatosActivos.length === 1) {
        adivinarJugador(candidatosActivos[0]);
        return;
    }

    // Si nos quedamos sin candidatos en absoluto
    if (candidatosActivos.length === 0) {
        adivinarJugador(null);
        return;
    }

    // Si ya pasamos la ronda 10, adivinamos con el que mejor punteo tenga de la lista restante
    if (numeroPregunta > 10) {
        adivinarJugador(candidatosActivos[0]);
        return;
    }

    if (numeroPregunta === 10) {
        document.getElementById("pantalla-juego").classList.add("ronda-dorada");
        document.getElementById("imagen-messi").src = "img/messi_oro.png";
        document.getElementById("contador-preguntas").innerText = "🏆 PREGUNTA DE ORO 🏆";
    }

    // 2. Elegir la mejor pregunta
    let mejorAtributo = elegirMejorAtributo(candidatosActivos);
    
    // Salvaguarda: si no encuentra una pregunta ideal pero quedan muchos candidatos, agarra cualquier pregunta restante
    if (!mejorAtributo) {
        mejorAtributo = columnasPreguntas.find(attr => respuestasUsuario[attr] === undefined);
    }

    // Si de verdad ya no quedan más preguntas disponibles en la base de datos
    if (!mejorAtributo) {
        adivinarJugador(candidatosActivos[0]);
        return;
    }

    atributoActual = mejorAtributo;
    let textoMostrar = traducirAtributoAPregunta(mejorAtributo);
    
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
        if (respuestasUsuario[attr] !== undefined) return;

        let conSueldoDeSies = listaCandidatos.filter(j => j.atributos[attr] === 1).length;
        let conSueldoDeNoes = listaCandidatos.filter(j => j.atributos[attr] === 0).length;

        // Buscamos que divida lo más equilibrado posible (lo más cercano a diferencia 0)
        let diferencia = Math.abs(conSueldoDeSies - conSueldoDeNoes);
        
        // Solo la tomamos en cuenta si realmente ayuda a dividir el grupo activo
        if (diferencia < mejorDiferencia && (conSueldoDeSies > 0 || conSueldoDeNoes > 0)) {
            mejorDiferencia = diferencia;
            mejorAttr = attr;
        }
    });

    return mejorAttr;
}

function responder(valor) {
    if (!juegoIniciado) {
        iniciarJuego();
        return;
    }

    respuestasUsuario[atributoActual] = valor;
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

function adivinarJugador(jugador) {
    const imgElement = document.getElementById("imagen-messi");
    if (jugador) {
        document.getElementById("texto-pregunta").innerText = `¡YA SÉ QUIÊN ES! ¡Es ${jugador.nombre}! Que juega en ${jugador.equipo}. ¿A que te la gané, bobo?`;
        
        const rutaFoto = `img/futbolistas/${jugador.foto}`;
        imgElement.src = rutaFoto;
        imgElement.onerror = () => {
            imgElement.src = "img/messi_genio.png";
        };
    } else {
        document.getElementById("texto-pregunta").innerText = "¡Me amagaste bien! No encontré ningún futbolista con esas características... ¿Me estás mintiendo, bobo?";
        imgElement.src = "img/messi_oro.png";
    }
}