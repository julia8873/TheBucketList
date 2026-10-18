import { CollectionItem } from '../types';

export const DEFAULT_COLLECTIONS: CollectionItem[] = [
  {
    id: 'collection-halloween',
    title: 'Especial Noche de Halloween',
    description: 'La lista definitiva de planes espeluznantes, calabazas, películas y misterio para celebrar Halloween por todo lo alto.',
    category: 'seasonal',
    badge: '🎃 Especial',
    emoji: '🎃',
    gradientColors: ['#2E0854', '#8A2BE2', '#E65C00'],
    cover_path: JSON.stringify({
      type: 'gradient',
      colors: ['#1A002C', '#3A0C53', '#E65C00'],
      diagonal: true,
    }),
    author: {
      name: 'TheBucketList',
      isOfficial: true,
    },
    clonesCount: 0,
    likesCount: 0,
    tags: ['Halloween', 'Otoño', 'Cine'],
    tasks: [
      {
        title: 'Tallar una calabaza terrorífica e iluminarla con una vela',
        description: 'Vacia la calabaza, diseña una cara espeluznante y colócala en la ventana o balcón.',
        priority: 'high',
      },
      {
        title: 'Maratón de cine de terror con palomitas',
        description: 'Ver clásicos como Halloween, El Resplandor, Scream o Pesadilla en Elm Street.',
        priority: 'medium',
      },
      {
        title: 'Hornear galletas o cupcakes con decoración monstruosa',
        description: 'Fantasmas de merengue, galletas con forma de murciélago o dedos de bruja.',
        priority: 'medium',
      },
      {
        title: 'Visitar un pasaje del terror o escape room de miedo',
        description: 'Vive una experiencia inmersiva llena de sustos y adrenalina.',
        priority: 'high',
      },
      {
        title: 'Idear y lucir un disfraz temático inolvidable',
        description: 'Hazlo casero o busca los mejores accesorios para sorprender a todos.',
        priority: 'high',
      },
      {
        title: 'Preparar un cóctel humeante o ponche de manzana especiada',
        description: 'Bebida temática con canela, clavo y un toque de misterio.',
        priority: 'low',
      },
      {
        title: 'Noche de historias de misterio y leyendas urbanas a oscuras',
        description: 'Reúne amigos a la luz de las velas para contar historias que quitan el sueño.',
        priority: 'low',
      },
    ],
  },
  {
    id: 'collection-navidad',
    title: 'Magia de Navidad',
    description: 'Tradiciones acogedoras, luces parpadeantes y momentos inolvidables para disfrutar de la época más mágica del año.',
    category: 'seasonal',
    badge: '🎄 Festivo',
    emoji: '🎄',
    gradientColors: ['#0A2E1C', '#1E5E3A', '#9B1B1B'],
    cover_path: JSON.stringify({
      type: 'gradient',
      colors: ['#0A2E1C', '#1B4D3E', '#8B1E1E'],
      diagonal: true,
    }),
    author: {
      name: 'TheBucketList',
      isOfficial: true,
    },
    clonesCount: 0,
    likesCount: 0,
    tags: ['Navidad', 'Invierno', 'Familia'],
    tasks: [
      {
        title: 'Montar y decorar el árbol de Navidad con villancicos de fondo',
        description: 'Desempolva los adornos, pon la estrella en la cima y enciende las luces.',
        priority: 'high',
      },
      {
        title: 'Pasear por un mercadillo navideño y tomar un dulce típico',
        description: 'Churros con chocolate, castañas asadas o turrón artesanal entre luces de colores.',
        priority: 'medium',
      },
      {
        title: 'Organizar un amigo invisible con personas especiales',
        description: 'Sorteo secreto, pistas divertidas y entrega de regalos con risas aseguradas.',
        priority: 'high',
      },
      {
        title: 'Tarde de sofá, manta y películas navideñas clásicas',
        description: 'Solo en casa, Love Actually, El Grinch o Pesadilla antes de Navidad.',
        priority: 'medium',
      },
      {
        title: 'Patinar sobre hielo en una pista al aire libre',
        description: 'Ponte los patines y desafía el equilibrio con guantes y bufanda.',
        priority: 'medium',
      },
      {
        title: 'Hornear y montar una casita de galletas de jengibre',
        description: 'Glaseado blanco como nieve, gominolas y mucha paciencia arquitectónica.',
        priority: 'low',
      },
      {
        title: 'Escribir una carta con reflexiones del año y metas para el siguiente',
        description: 'Agradece lo vivido y fija tus mayores deseos para el año entrante.',
        priority: 'low',
      },
    ],
  },
  {
    id: 'collection-switch',
    title: 'Imprescindibles de Nintendo Switch',
    description: 'Los grandes hitos y obras maestras que todo poseedor de una Switch debería experimentar y completar.',
    category: 'gaming',
    badge: '🎮 Gaming',
    emoji: '🎮',
    gradientColors: ['#E60012', '#99000D', '#009AC7'],
    cover_path: JSON.stringify({
      type: 'gradient',
      colors: ['#E60012', '#222222', '#009AC7'],
      diagonal: true,
    }),
    author: {
      name: 'TheBucketList',
      isOfficial: true,
    },
    clonesCount: 0,
    likesCount: 0,
    tags: ['Gaming', 'Nintendo', 'Switch'],
    tasks: [
      {
        title: 'Derrotar a Ganon y salvar Hyrule en Zelda: Breath of the Wild',
        description: 'Explora a fondo, completa santuarios y forja la Espada Maestra.',
        priority: 'high',
      },
      {
        title: 'Reunir 500 energetilunas y superar la Cara Más Oculta en Mario Odyssey',
        description: 'Domina los saltos con Cappy y viaja por todos los reinos.',
        priority: 'high',
      },
      {
        title: 'Llevar tu isla a 5 estrellas de reputación en Animal Crossing',
        description: 'Decora, diseña caminos y recibe el concierto de Totakeke.',
        priority: 'medium',
      },
      {
        title: 'Ganar todas las copas con 3 estrellas en 150cc en Mario Kart 8 Deluxe',
        description: 'Aprende los mejores atajos y derrapes en cada circuito.',
        priority: 'medium',
      },
      {
        title: 'Completar el Panteón de Hallownest en Hollow Knight',
        description: 'Una de las mayores hazañas de habilidad y paciencia del mundo indie.',
        priority: 'high',
      },
      {
        title: 'Escapar del Inframundo y vencer a Hades por primera vez',
        description: 'Combina bendiciones divinas y domina cada una de las armas infernales.',
        priority: 'medium',
      },
      {
        title: 'Llegar a la cima de Celeste Mountain en Celeste',
        description: 'Una emotiva historia de superación con una jugabilidad milimétrica.',
        priority: 'medium',
      },
    ],
  },
  {
    id: 'collection-viajes',
    title: '10 Países para Visitar en la Vida',
    description: 'Destinos icónicos que te dejarán sin aliento. Naturaleza indómita, historia milenaria y culturas fascinantes.',
    category: 'travel',
    badge: '✈️ Viajes',
    emoji: '✈️',
    gradientColors: ['#0B2545', '#134074', '#D4AF37'],
    cover_path: JSON.stringify({
      type: 'gradient',
      colors: ['#0B2545', '#134074', '#3E78B2'],
      diagonal: true,
    }),
    author: {
      name: 'TheBucketList',
      isOfficial: true,
    },
    clonesCount: 0,
    likesCount: 0,
    tags: ['Viajes', 'Aventura', 'Mundo'],
    tasks: [
      {
        title: 'Japón: Perderse entre los neones de Tokio y templos de Kioto',
        description: 'Comer ramen auténtico, viajar en Shinkansen y admirar el Monte Fuji.',
        priority: 'high',
      },
      {
        title: 'Islandia: Recorrer cascadas gigantes y contemplar auroras boreales',
        description: 'Bañarse en aguas termales azules y caminar sobre campos de lava volcánica.',
        priority: 'high',
      },
      {
        title: 'Italia: Roma milenaria, canales de Venecia y costa amalfitana',
        description: 'Cultura, gastronomía sublime, historia viva y pueblos colgados del mar.',
        priority: 'high',
      },
      {
        title: 'Perú: Ver amanecer sobre la ciudadela sagrada de Machu Picchu',
        description: 'Recorrer el Valle Sagrado y degustar la gastronomía limeña.',
        priority: 'high',
      },
      {
        title: 'Noruega: Navegar por los fiordos y asomarse al abismo del Preikestolen',
        description: 'Pueblos pesqueros de casas rojas en Lofoten y sol de medianoche.',
        priority: 'medium',
      },
      {
        title: 'Grecia: Puesta de sol en Santorini y templos clásicos de Atenas',
        description: 'Mar Egeo de azul intenso, casitas blancas con cúpulas azules y souvlaki.',
        priority: 'medium',
      },
      {
        title: 'Egipto: Navegar en faluca por el Nilo y ver las Pirámides de Giza',
        description: 'El misterio de los faraones en el Valle de los Reyes y templos colosales.',
        priority: 'high',
      },
    ],
  },
  {
    id: 'collection-libros',
    title: 'Reto Lector: 12 Libros en un Año',
    description: 'Un viaje a través de géneros, épocas y mundos para cultivar el hábito de la lectura constante mes a mes.',
    category: 'culture',
    badge: '📚 Reto Lector',
    emoji: '📚',
    gradientColors: ['#3A1C0A', '#6B3E26', '#D4B13A'],
    cover_path: JSON.stringify({
      type: 'gradient',
      colors: ['#2B1408', '#4E2B16', '#A3683A'],
      diagonal: true,
    }),
    author: {
      name: 'TheBucketList',
      isOfficial: true,
    },
    clonesCount: 0,
    likesCount: 0,
    tags: ['Libros', 'Lectura', 'Cultura'],
    tasks: [
      {
        title: 'Leer un clásico atemporal de la literatura universal',
        description: 'Cien años de soledad, Orgullo y prejuicio, 1984 o Crimen y castigo.',
        priority: 'medium',
      },
      {
        title: 'Devorar un thriller psicológico que no puedas soltar',
        description: 'Giro tras giro hasta descubrir el final antes de dormir.',
        priority: 'medium',
      },
      {
        title: 'Sumergirse en una gran saga de ciencia ficción o fantasía épica',
        description: 'Dune, El nombre del viento, El Archivo de las Tormentas o Fundación.',
        priority: 'high',
      },
      {
        title: 'Leer un libro de no ficción que te enseñe una nueva habilidad',
        description: 'Filosofía estoica, psicología de hábitos o historia fascinante.',
        priority: 'medium',
      },
      {
        title: 'Leer una novela gráfica o cómic aclamado por la crítica',
        description: 'Maus, Sandman, Persépolis o Watchmen.',
        priority: 'low',
      },
      {
        title: 'Leer una obra escrita por un autor de otro continente',
        description: 'Literatura japonesa, africana o latinoamericana contemporánea.',
        priority: 'medium',
      },
      {
        title: 'Releer tu libro preferido de la infancia con ojos de adulto',
        description: 'El Principito, Harry Potter o Momo.',
        priority: 'low',
      },
    ],
  },
  {
    id: 'collection-cocina',
    title: 'Maestría Culinaria en Casa',
    description: 'Técnicas, recetas emblemáticas y recetas caseras para subir de nivel tus habilidades en los fogones.',
    category: 'food',
    badge: '🍳 Gourmet',
    emoji: '🍳',
    gradientColors: ['#3D1E0B', '#8C4318', '#E69500'],
    cover_path: JSON.stringify({
      type: 'gradient',
      colors: ['#2E1508', '#632B0F', '#B36224'],
      diagonal: true,
    }),
    author: {
      name: 'TheBucketList',
      isOfficial: true,
    },
    clonesCount: 0,
    likesCount: 0,
    tags: ['Cocina', 'Gastronomía', 'Recetas'],
    tasks: [
      {
        title: 'Preparar una auténtica pasta carbonara romana tradicional',
        description: 'Solo yema de huevo, guanciale crujiente, pecorino romano y pimienta negra recién molida.',
        priority: 'high',
      },
      {
        title: 'Amasar y hornear una pizza napolitana con fermentación de 48h',
        description: 'Masa aireada con alveolos pronunciados, tomate San Marzano y mozzarella fresca.',
        priority: 'high',
      },
      {
        title: 'Hornear una hogaza de pan casero con corteza crujiente',
        description: 'Harina de fuerza, agua, sal y paciencia para un pan digno de panadería.',
        priority: 'medium',
      },
      {
        title: 'Hacer sushi casero completo: nigiris, makis y uramakis',
        description: 'Aprende a sazonar el arroz (shari) y cortar el salmón con precisión.',
        priority: 'medium',
      },
      {
        title: 'Cocinar un ramen casero con caldo cocinado a fuego lento',
        description: 'Huevos ajitsuke marinados, chashu tierno y fideos en caldo concentrado.',
        priority: 'medium',
      },
      {
        title: 'Hornear una tarta de queso vasca tipo La Viña súper cremosa',
        description: 'Tostada por fuera, fundente y suave por dentro.',
        priority: 'low',
      },
    ],
  },
];
