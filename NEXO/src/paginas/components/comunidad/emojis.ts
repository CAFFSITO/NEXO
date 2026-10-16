// Los emojis del selector, por categoría y con palabras para buscarlos en
// castellano. Cada línea: el emoji y sus palabras clave.

export interface CategoriaEmoji { id: string; nombre: string; icono: string; emojis: { e: string; claves: string }[] }

const armar = (lineas: string) =>
  lineas.trim().split("\n").map((l) => {
    const [e, ...claves] = l.trim().split(" ");
    return { e, claves: claves.join(" ") };
  });

export const CATEGORIAS_EMOJI: CategoriaEmoji[] = [
  { id: "caras", nombre: "Caras", icono: "sentiment_satisfied", emojis: armar(`
😀 sonrisa feliz contento
😃 alegre feliz sonrisa
😄 risa feliz ojos
😁 sonrisa dientes
😆 carcajada risa
😅 risa nervios sudor
🤣 llorar de risa carcajada
😂 lagrimas risa jaja
🙂 sonrisa leve
🙃 al reves ironia
😉 guiño complice
😊 sonrojado contento
😇 angel inocente
🥰 enamorado corazones
😍 ojos corazon me encanta
🤩 estrellas fascinado
😘 beso
😋 rico delicioso
😛 lengua
😜 guiño lengua loco
🤪 loco divertido
🤗 abrazo
🤭 sorpresa risa tapada
🤫 silencio secreto
🤔 pensando duda
🫡 saludo respeto
🤐 boca cerrada
🤨 ceja sospecha
😐 neutral serio
😑 sin expresion
😶 sin palabras
🫠 derretido verguenza
😏 picaro
😒 fastidio
🙄 ojos en blanco
😬 mueca incomodo
😮‍💨 suspiro alivio
🤥 mentira
😌 aliviado tranquilo
😔 pensativo triste
😪 sueño
😴 dormido aburrido
😷 barbijo enfermo
🤒 fiebre enfermo
🤯 cabeza explota impactado
🥳 fiesta celebrar cumpleaños
😎 lentes genial cool
🤓 nerd estudioso anteojos
🧐 monoculo analizando
😕 confundido
😟 preocupado
🙁 triste leve
😮 asombro
😯 sorprendido
😲 impactado
😳 sonrojado verguenza
🥺 suplicando porfa
🥹 emocionado lagrimas
😢 llorar triste
😭 llanto
😱 grito miedo
😤 enojado resoplido
😡 furioso enojo
🤬 insultos enojo
😈 diablito
💀 calavera muerto de risa
🤡 payaso
👻 fantasma
👽 extraterrestre
🤖 robot
💩 caca
`) },
  { id: "gestos", nombre: "Gestos", icono: "waving_hand", emojis: armar(`
👍 bien de acuerdo pulgar arriba
👎 mal desacuerdo pulgar abajo
👏 aplausos bravo
🙌 celebrar manos arriba
🫶 corazon manos amor
👐 manos abiertas
🤝 acuerdo trato apreton
🙏 gracias por favor rezar
✌️ paz victoria
🤞 suerte dedos cruzados
🤟 te quiero rock
🤘 rock metal
👌 perfecto ok
🤌 que queres italiano
👈 señalar izquierda
👉 señalar derecha
👆 señalar arriba
👇 señalar abajo
☝️ un momento uno
✋ alto mano levantada
🤚 mano
🖐️ mano abierta cinco
👋 hola chau saludo
🤙 llamame
💪 fuerza musculo
🫵 vos
✍️ escribir
🧠 cerebro inteligencia
👀 mirando ojos
👂 escuchar oreja
🗣️ hablar
🙋 levantar la mano pregunta
🤷 no se encogerse
🤦 facepalm
🙇 reverencia perdon
`) },
  { id: "escuela", nombre: "Escuela", icono: "school", emojis: armar(`
🎓 graduacion egreso
🏫 escuela colegio
📚 libros estudiar
📖 libro leer
📝 tarea anotar apuntes
✏️ lapiz
🖊️ lapicera
🖍️ crayon dibujar
📐 escuadra geometria
📏 regla
🧮 abaco matematica
🔬 microscopio biologia ciencia
🧪 tubo ensayo quimica laboratorio
🧬 adn biologia
🔭 telescopio astronomia
🌍 mundo geografia
🗺️ mapa
🏛️ historia museo
🎨 arte pintura
🎭 teatro
🎵 musica nota
🎹 piano
🎸 guitarra
🥁 bateria tambor
💻 computadora programar
⌨️ teclado
🖥️ monitor
📱 celular telefono
🔋 bateria energia
💡 idea bombita
📌 fijar chinche
📎 clip
🗂️ carpeta
📅 calendario fecha
⏰ reloj alarma hora
⏳ tiempo reloj de arena
🔔 campana aviso timbre
📣 megafono anuncio
📢 altavoz anuncio
✅ hecho listo check
❌ no error cruz
❓ pregunta duda
❗ importante exclamacion
⚠️ atencion cuidado
💯 cien perfecto
🏆 trofeo campeon
🥇 primer puesto oro medalla
🎯 objetivo meta diana
📈 subiendo mejora grafico
📉 bajando
🧩 rompecabezas
♟️ ajedrez
`) },
  { id: "corazones", nombre: "Corazones", icono: "favorite", emojis: armar(`
❤️ corazon rojo amor
🧡 corazon naranja
💛 corazon amarillo
💚 corazon verde
💙 corazon azul
💜 corazon violeta
🖤 corazon negro
🤍 corazon blanco
🤎 corazon marron
💖 corazon brillante
💗 corazon creciente
💓 latido
💞 corazones girando
💕 dos corazones
💘 flechazo
💝 regalo corazon
❤️‍🔥 corazon en llamas
❤️‍🩹 corazon curado
💔 corazon roto
❣️ exclamacion corazon
`) },
  { id: "celebrar", nombre: "Celebrar", icono: "celebration", emojis: armar(`
🎉 fiesta celebrar confeti
🎊 confeti
🎈 globo cumpleaños
🎂 torta cumpleaños
🎁 regalo
✨ brillo magia
🌟 estrella brillante
⭐ estrella
💫 mareado estrella
🔥 fuego genial
⚡ rayo energia
💥 explosion
🎆 fuegos artificiales
🥂 brindis
🍾 champagne
🪅 piñata
🏅 medalla
🎖️ condecoracion
👑 corona rey reina
🚀 cohete despegue lanzamiento
`) },
  { id: "naturaleza", nombre: "Naturaleza", icono: "eco", emojis: armar(`
🌱 brote planta crecer
🌿 hierba
🍀 trebol suerte
🌳 arbol
🌲 pino
🌵 cactus
🌻 girasol
🌸 flor cerezo
🌹 rosa
🌈 arcoiris
☀️ sol
🌤️ sol nubes
⛅ nublado
🌧️ lluvia
⛈️ tormenta
❄️ nieve copo
🌊 ola mar
🌙 luna noche
🐶 perro
🐱 gato
🐭 raton
🐰 conejo
🦊 zorro
🐻 oso
🐼 panda
🐨 koala
🐯 tigre
🦁 leon
🐮 vaca
🐷 chancho
🐸 rana
🐵 mono
🐔 gallina
🐧 pinguino
🐦 pajaro
🦉 buho
🦋 mariposa
🐝 abeja
🐢 tortuga
🐬 delfin
🐳 ballena
🦕 dinosaurio
`) },
  { id: "comida", nombre: "Comida", icono: "restaurant", emojis: armar(`
🍎 manzana
🍌 banana
🍉 sandia
🍓 frutilla
🍇 uvas
🍊 naranja mandarina
🍋 limon
🥑 palta
🍕 pizza
🍔 hamburguesa
🌭 pancho
🍟 papas fritas
🥪 sandwich
🌮 taco
🍝 fideos
🍣 sushi
🥟 empanada
🧉 mate
☕ cafe
🍵 te
🧃 jugo
🥤 gaseosa
🍦 helado
🍩 dona
🍪 galletita
🍫 chocolate
🍬 caramelo
🍭 chupetin
🧁 cupcake
🥐 medialuna
🥖 pan
🧀 queso
🥚 huevo
🍿 pochoclo
`) },
  { id: "deportes", nombre: "Deportes", icono: "sports_soccer", emojis: armar(`
⚽ futbol pelota
🏀 basquet
🏐 voley
🏈 rugby americano
🏉 rugby
🎾 tenis
🏓 ping pong
🏸 badminton
🏑 hockey
🏒 hockey hielo
⛳ golf
🏊 natacion
🚴 bicicleta ciclismo
🏃 correr atletismo
🤸 gimnasia
🧘 yoga meditar
🏋️ pesas gimnasio
🥋 artes marciales
🛹 skate
⛸️ patinaje
🎮 videojuego joystick
🎲 dado juego
🎳 bowling
🏆 copa
`) },
  { id: "objetos", nombre: "Objetos", icono: "category", emojis: armar(`
📷 camara foto
🎥 video filmar
🎬 claqueta cine
📺 tele
🎧 auriculares
🎤 microfono cantar
📞 telefono
✉️ carta sobre
📩 mail recibido
📦 paquete
🛒 carrito compras
💰 plata dinero
💳 tarjeta
🧾 recibo
🔑 llave
🔒 candado cerrado
🔓 candado abierto
🛠️ herramientas
🔧 llave inglesa
🧲 iman
⚙️ engranaje configurar
🧹 escoba limpiar
🧴 alcohol gel
🪴 maceta planta
🚌 colectivo bus
🚗 auto
🚲 bici
✈️ avion viaje
🏠 casa
🏥 hospital
⛺ carpa campamento
🗓️ agenda
`) },
  { id: "simbolos", nombre: "Símbolos", icono: "emoji_symbols", emojis: armar(`
➕ mas sumar
➖ menos restar
✖️ multiplicar
➗ dividir
🟰 igual
♾️ infinito
💲 pesos
🔴 rojo circulo
🟠 naranja circulo
🟡 amarillo circulo
🟢 verde circulo
🔵 azul circulo
🟣 violeta circulo
⚫ negro circulo
⚪ blanco circulo
🔺 triangulo rojo
🔻 triangulo abajo
🔶 rombo naranja
🔷 rombo azul
⬆️ arriba flecha
⬇️ abajo flecha
⬅️ izquierda flecha
➡️ derecha flecha
🔁 repetir
🔄 actualizar
🆕 nuevo
🆗 ok
🆒 cool
🔝 top
🚫 prohibido
⛔ no pasar
♻️ reciclar
☮️ paz
☯️ yin yang
🏳️‍🌈 orgullo diversidad
🇦🇷 argentina bandera
`) },
];

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca emojis por palabra clave (sin importar tildes ni mayúsculas). */
export function buscarEmojis(q: string, limite = 48): string[] {
  const t = sinTildes(q.trim());
  if (!t) return [];
  const salida: string[] = [];
  for (const c of CATEGORIAS_EMOJI) for (const x of c.emojis) {
    if (sinTildes(x.claves).includes(t) && !salida.includes(x.e)) salida.push(x.e);
    if (salida.length >= limite) return salida;
  }
  return salida;
}

/** Las reacciones rápidas de un toque. */
export const REACCIONES_RAPIDAS = ["👍", "❤️", "😂", "🔥", "👏", "🤔", "😮", "🎉"];
