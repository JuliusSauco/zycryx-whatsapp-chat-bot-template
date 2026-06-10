export interface MenuCommandMetadata {
    emoji: string;
    usage: string;
    description: string;
}

export const fallbackEmojiByTag: Record<string, string> = {
    main: 'ℹ️',
    jadibot: '✨',
    downloader: '🚀',
    game: '🎮',
    gacha: '🎴',
    rg: '🪪',
    group: '👥',
    nable: '⚙️',
    nsfw: '🔞',
    buscadores: '🔍',
    sticker: '🧧',
    econ: '💎',
    convertidor: '🔄',
    logo: '🎨',
    tools: '🔧',
    randow: '🪄',
    efec: '🎙️',
    owner: '👑',
    rpg: '🧰',
    hot: '🔥',
};

export const commandMetadata: Record<string, MenuCommandMetadata> = {
    menu: {emoji: '📚', usage: 'menu', description: 'Abre el índice principal con accesos a todos los menús.'},
    uptime: {emoji: '⏱️', usage: 'uptime', description: 'Muestra cuánto tiempo lleva activo el bot.'},
    speedtest: {emoji: '📡', usage: 'speedtest', description: 'Mide la velocidad y latencia del entorno del bot.'},
    sc: {emoji: '🧾', usage: 'sc', description: 'Muestra información del código fuente o runtime del bot.'},
    runtime: {emoji: '🧾', usage: 'runtime', description: 'Muestra información del código fuente o runtime del bot.'},
    donar: {emoji: '💖', usage: 'donar', description: 'Muestra formas de apoyar el mantenimiento del bot.'},
    gruposofc: {emoji: '👥', usage: 'gruposofc', description: 'Muestra grupos oficiales relacionados con el bot.'},
    infobot: {emoji: '🤖', usage: 'infobot', description: 'Muestra datos generales sobre el bot.'},
    ping: {emoji: '🏓', usage: 'ping', description: 'Comprueba si el bot responde correctamente.'},
    reporte: {emoji: '📝', usage: 'reporte <mensaje>', description: 'Envía un reporte o sugerencia al equipo del bot.'},
    mylid: {emoji: '🪪', usage: 'mylid', description: 'Muestra tus identificadores útiles para soporte.'},

    groupinfo: {emoji: '📋', usage: 'groupinfo', description: 'Muestra información general del grupo actual.'},
    staff: {emoji: '🛡️', usage: 'staff', description: 'Lista los administradores del grupo.'},
    listwarn: {emoji: '⚠️', usage: 'listwarn', description: 'Muestra usuarios con advertencias registradas en el grupo.'},
    fantasmas: {emoji: '👻', usage: 'fantasmas', description: 'Revisa usuarios con poca actividad en el grupo.'},

    kick: {emoji: '🚪', usage: 'kick @usuario', description: 'Expulsa a un usuario del grupo.'},
    promote: {emoji: '⬆️', usage: 'promote @usuario', description: 'Convierte a un usuario en administrador.'},
    demote: {emoji: '⬇️', usage: 'demote @usuario', description: 'Quita el rol de administrador a un usuario.'},
    warn: {emoji: '⚠️', usage: 'warn @usuario <razon>', description: 'Agrega una advertencia a un usuario del grupo.'},
    delwarn: {emoji: '✅', usage: 'delwarn @usuario', description: 'Quita advertencias de un usuario del grupo.'},
    link: {emoji: '🔗', usage: 'link', description: 'Obtiene el enlace de invitación del grupo.'},
    resetlink: {emoji: '♻️', usage: 'resetlink', description: 'Regenera el enlace de invitación del grupo.'},
    tagall: {emoji: '📣', usage: 'tagall <mensaje>', description: 'Menciona a todos los integrantes del grupo.'},
    hidetag: {emoji: '📢', usage: 'hidetag <mensaje>', description: 'Envía un mensaje mencionando a todos de forma oculta.'},
    delete: {emoji: '🗑️', usage: 'delete', description: 'Elimina un mensaje respondido cuando el bot puede hacerlo.'},
    pin: {emoji: '📌', usage: 'pin', description: 'Destaca el mensaje respondido en el grupo.'},
    unpin: {emoji: '📍', usage: 'unpin', description: 'Quita el destacado del mensaje respondido.'},
    setname: {emoji: '✏️', usage: 'setname <nombre>', description: 'Cambia el nombre del grupo.'},
    setdesc: {emoji: '📝', usage: 'setdesc <descripcion>', description: 'Cambia la descripción del grupo.'},
    setpp: {emoji: '🖼️', usage: 'setpp', description: 'Cambia la foto del grupo usando una imagen respondida.'},
    setprompt: {emoji: '🧠', usage: 'setprompt <texto>', description: 'Configura el prompt de respuesta automática del grupo.'},
    sethorario: {emoji: '🕒', usage: 'sethorario <HH:MM-HH:MM>', description: 'Define horarios para funciones configurables del grupo.'},
    setrole: {emoji: '🪪', usage: 'setrole @usuario Rol|Descripcion', description: 'Asigna un rol visible a un admin del grupo.'},
    enable: {emoji: '✅', usage: 'enable <opcion>', description: 'Activa una función configurable del grupo o subbot.'},
    disable: {emoji: '❌', usage: 'disable <opcion>', description: 'Desactiva una función configurable del grupo o subbot.'},

    backup: {emoji: '💾', usage: 'backup', description: 'Genera un respaldo de archivos o datos importantes del bot.'},
    restart: {emoji: '🔄', usage: 'restart', description: 'Reinicia el proceso del bot.'},
    update: {emoji: '⬆️', usage: 'update', description: 'Actualiza el bot desde el repositorio configurado.'},
    banuser: {emoji: '🚫', usage: 'banuser @usuario', description: 'Bloquea a un usuario para que no use el bot.'},
    unbanuser: {emoji: '✅', usage: 'unbanuser @usuario', description: 'Permite nuevamente a un usuario usar el bot.'},
    banchat: {emoji: '🔒', usage: 'banchat', description: 'Bloquea el uso del bot en el chat actual.'},
    unbanchat: {emoji: '🔓', usage: 'unbanchat', description: 'Reactiva el uso del bot en el chat actual.'},
    join: {emoji: '➕', usage: 'join <link>', description: 'Hace que el bot intente unirse a un grupo.'},
    leave: {emoji: '🚪', usage: 'leave', description: 'Hace que el bot salga del grupo actual.'},
    db: {emoji: '🗄️', usage: 'db', description: 'Ejecuta acciones de mantenimiento sobre la base de datos.'},
    fetch: {emoji: '🌐', usage: 'fetch <url>', description: 'Consulta una URL desde el entorno del bot.'},
    getplugin: {emoji: '📦', usage: 'getplugin <nombre>', description: 'Muestra el contenido de un plugin cargado.'},

    traducir: {emoji: '🌐', usage: 'traducir <idioma> <texto>', description: 'Traduce texto al idioma indicado.'},
    translate: {emoji: '🌐', usage: 'translate <lang> <text>', description: 'Traduce texto al idioma indicado.'},
    quemusica: {emoji: '🎧', usage: 'quemusica', description: 'Identifica una canción desde un audio respondido.'},
    whatmusic: {emoji: '🎧', usage: 'whatmusic', description: 'Identifica una canción desde un audio respondido.'},
    ssweb: {emoji: '📸', usage: 'ssweb <url>', description: 'Toma una captura de pantalla de una página web.'},
    superinspect: {emoji: '🕵️', usage: 'superinspect <url>', description: 'Inspecciona una URL y resume datos técnicos relevantes.'},
    hd: {emoji: '🖼️', usage: 'hd', description: 'Mejora la calidad de una imagen respondida.'},
    tobase64: {emoji: '🧬', usage: 'tobase64 <texto>', description: 'Convierte texto a formato Base64.'},
    tts: {emoji: '🗣️', usage: 'tts <texto>', description: 'Convierte texto en una nota de voz.'},
    tourl: {emoji: '🔗', usage: 'tourl', description: 'Sube el archivo respondido y devuelve una URL.'},
    tomp3: {emoji: '🎵', usage: 'tomp3', description: 'Convierte el audio o video respondido a MP3.'},
    toimg: {emoji: '🖼️', usage: 'toimg', description: 'Convierte un sticker respondido en imagen.'},

    play: {emoji: '🎵', usage: 'play <busqueda o link>', description: 'Busca música o videos de YouTube para descargar.'},
    tiktok: {emoji: '🎬', usage: 'tiktok <link>', description: 'Descarga videos de TikTok desde un enlace.'},
    instagram: {emoji: '📷', usage: 'instagram <link>', description: 'Descarga contenido público de Instagram.'},
    facebook: {emoji: '📘', usage: 'facebook <link>', description: 'Descarga videos de Facebook desde un enlace.'},
    spotify: {emoji: '🎶', usage: 'spotify <link o busqueda>', description: 'Busca o descarga música desde Spotify si el proveedor responde.'},
    applemusic: {emoji: '🍎', usage: 'applemusic <link>', description: 'Busca o descarga música desde Apple Music si está disponible.'},
    mediafire: {emoji: '📦', usage: 'mediafire <link>', description: 'Descarga archivos desde enlaces de MediaFire.'},
    drive: {emoji: '☁️', usage: 'drive <link>', description: 'Descarga archivos desde enlaces de Google Drive.'},
    gitclone: {emoji: '🧩', usage: 'gitclone <repo>', description: 'Descarga un repositorio de GitHub en archivo comprimido.'},

    google: {emoji: '🔍', usage: 'google <busqueda>', description: 'Busca información en Google.'},
    lyrics: {emoji: '🎼', usage: 'lyrics <cancion>', description: 'Busca la letra de una canción.'},
    pinterest: {emoji: '📌', usage: 'pinterest <busqueda>', description: 'Busca imágenes o contenido en Pinterest.'},
    image: {emoji: '🖼️', usage: 'image <busqueda>', description: 'Busca imágenes relacionadas con el texto indicado.'},
    chatgpt: {emoji: '🤖', usage: 'chatgpt <pregunta>', description: 'Consulta un asistente de IA con tu pregunta.'},
    dalle: {emoji: '🎨', usage: 'dalle <prompt>', description: 'Genera una imagen a partir de una descripción.'},

    sticker: {emoji: '🧧', usage: 'sticker', description: 'Convierte una imagen o video respondido en sticker.'},
    s: {emoji: '🧧', usage: 's', description: 'Convierte una imagen o video respondido en sticker.'},
    attp: {emoji: '🔤', usage: 'attp <texto>', description: 'Crea un sticker animado con texto.'},
    ttp: {emoji: '🔠', usage: 'ttp <texto>', description: 'Crea un sticker de texto.'},
    qc: {emoji: '💬', usage: 'qc <texto>', description: 'Genera un sticker estilo quote.'},
    exif: {emoji: '🏷️', usage: 'exif', description: 'Edita o muestra metadatos de stickers.'},
    emojimix: {emoji: '🧪', usage: 'emojimix 😄+🔥', description: 'Combina dos emojis en un sticker.'},
    stickerly: {emoji: '📥', usage: 'stickerly <link>', description: 'Descarga packs de stickers compatibles.'},
    hug: {emoji: '🤗', usage: 'hug @usuario', description: 'Envía un sticker de abrazo a alguien.'},
    slap: {emoji: '👋', usage: 'slap @usuario', description: 'Envía un sticker de cachetada a alguien.'},
    pat: {emoji: '🫳', usage: 'pat @usuario', description: 'Envía un sticker de palmaditas o cariño.'},

    slot: {emoji: '🎰', usage: 'slot', description: 'Juega una ronda de tragamonedas.'},
    ttt: {emoji: '❌', usage: 'ttt', description: 'Inicia o gestiona una partida de tres en raya.'},
    ppt: {emoji: '✂️', usage: 'ppt <piedra|papel|tijera>', description: 'Juega piedra, papel o tijera contra el bot.'},
    math: {emoji: '🧮', usage: 'math', description: 'Resuelve un reto matemático para ganar recompensa.'},
    ruleta: {emoji: '🎲', usage: 'ruleta', description: 'Juega una ronda de ruleta.'},
    acertijo: {emoji: '🧠', usage: 'acertijo', description: 'Inicia un reto de adivinanza o trivia.'},
    verdad: {emoji: '❓', usage: 'verdad', description: 'Recibe una pregunta de verdad para jugar en grupo.'},
    reto: {emoji: '🔥', usage: 'reto', description: 'Recibe un reto aleatorio para jugar en grupo.'},
    chiste: {emoji: '😄', usage: 'chiste', description: 'Envía un chiste aleatorio.'},
    ship: {emoji: '💞', usage: 'ship @usuario @usuario', description: 'Calcula una pareja o compatibilidad divertida.'},

    reg: {emoji: '🪪', usage: 'reg <nombre.edad>', description: 'Registra tu perfil para usar funciones del bot.'},
    perfil: {emoji: '👤', usage: 'perfil', description: 'Muestra tu perfil, nivel y datos de usuario.'},
    bal: {emoji: '💎', usage: 'bal', description: 'Muestra tu balance de economía.'},
    daily: {emoji: '🎁', usage: 'daily', description: 'Reclama tu recompensa diaria.'},
    work: {emoji: '🛠️', usage: 'work', description: 'Trabaja para ganar recursos del RPG.'},
    crime: {emoji: '🕶️', usage: 'crime', description: 'Intenta ganar recursos con una acción arriesgada.'},
    rob: {emoji: '💰', usage: 'rob @usuario', description: 'Intenta robar recursos a otro usuario.'},
    transfer: {emoji: '🤝', usage: 'transfer @usuario <cantidad>', description: 'Transfiere recursos a otro usuario.'},
    minar: {emoji: '⛏️', usage: 'minar', description: 'Mina recursos para tu cuenta.'},
    leaderboard: {emoji: '🏆', usage: 'leaderboard', description: 'Muestra el ranking de usuarios.'},
    rw: {emoji: '🎴', usage: 'rw', description: 'Usa el sistema gacha de personajes.'},
    harem: {emoji: '📚', usage: 'harem', description: 'Muestra tus personajes reclamados.'},

    waifu: {emoji: '💖', usage: 'waifu', description: 'Envía una imagen aleatoria de waifu.'},
    neko: {emoji: '🐱', usage: 'neko', description: 'Envía una imagen aleatoria de neko.'},
    meme: {emoji: '🤣', usage: 'meme', description: 'Envía un meme aleatorio.'},

    nsfw: {emoji: '🔞', usage: 'nsfw <categoria>', description: 'Muestra contenido adulto si el grupo lo tiene habilitado.'},
    slut: {emoji: '🔥', usage: 'slut', description: 'Ejecuta una acción RPG adulta si está permitida.'},

    jadibot: {emoji: '✨', usage: 'jadibot', description: 'Muestra cómo iniciar una sesión de subbot.'},
    serbot: {emoji: '✨', usage: 'serbot', description: 'Inicia el flujo para convertirte en subbot.'},
    bots: {emoji: '🤖', usage: 'bots', description: 'Lista subbots o sesiones disponibles.'},
    self: {emoji: '🔐', usage: 'self', description: 'Activa modo privado para el bot o subbot.'},
    setprefix: {emoji: '#️⃣', usage: 'setprefix <prefijo>', description: 'Cambia el prefijo del subbot.'},
    setbotname: {emoji: '🏷️', usage: 'setbotname <nombre>', description: 'Cambia el nombre visible del subbot.'},
    setlogo: {emoji: '🖼️', usage: 'setlogo', description: 'Cambia el logo del subbot usando una imagen.'},
};

export function getCommandMetadata(command: string, tags: string[]): MenuCommandMetadata {
    const key = normalizeCommandKey(command);
    const metadata = commandMetadata[key];
    if (metadata) return metadata;
    const tag = tags.find((value) => fallbackEmojiByTag[value]);
    return {
        emoji: tag ? fallbackEmojiByTag[tag] : '🔹',
        usage: command,
        description: 'Comando disponible en esta categoría.',
    };
}

export function normalizeCommandKey(command: string): string {
    return command
        .trim()
        .replace(/^[#./!]/, '')
        .split(/\s+/)[0]
        .toLowerCase();
}
