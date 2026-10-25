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

export const DEFAULT_COLLECTIONS_EN: CollectionItem[] = [
  {
    id: 'collection-halloween',
    title: 'Halloween Night Special',
    description: 'The ultimate list of spooky plans, pumpkins, movies, and mystery to celebrate Halloween in style.',
    category: 'seasonal',
    badge: '🎃 Special',
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
    tags: ['Halloween', 'Autumn', 'Cinema'],
    tasks: [
      {
        title: 'Carve a spooky pumpkin and illuminate it with a candle',
        description: 'Hollow out the pumpkin, design a frightening face, and place it on your window or balcony.',
        priority: 'high',
      },
      {
        title: 'Horror movie marathon with popcorn',
        description: 'Watch classics like Halloween, The Shining, Scream, or A Nightmare on Elm Street.',
        priority: 'medium',
      },
      {
        title: 'Bake cookies or cupcakes with monster decorations',
        description: 'Meringue ghosts, bat-shaped cookies, or witch fingers.',
        priority: 'medium',
      },
      {
        title: 'Visit a haunted house or horror escape room',
        description: 'Experience an immersive adventure filled with scares and adrenaline.',
        priority: 'high',
      },
      {
        title: 'Create and wear an unforgettable themed costume',
        description: 'Make it homemade or find the best accessories to surprise everyone.',
        priority: 'high',
      },
      {
        title: 'Make a smoking cocktail or spiced apple cider punch',
        description: 'Themed drink with cinnamon, cloves, and a touch of mystery.',
        priority: 'low',
      },
      {
        title: 'Night of mystery stories and urban legends in the dark',
        description: 'Gather friends by candlelight to share stories that keep you awake.',
        priority: 'low',
      },
    ],
  },
  {
    id: 'collection-navidad',
    title: 'Christmas Magic',
    description: 'Cozy traditions, twinkling lights, and unforgettable moments to celebrate the most magical time of the year.',
    category: 'seasonal',
    badge: '🎄 Festive',
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
    tags: ['Christmas', 'Winter', 'Family'],
    tasks: [
      {
        title: 'Set up and decorate the Christmas tree with carols playing',
        description: 'Dust off the ornaments, place the star on top, and turn on the lights.',
        priority: 'high',
      },
      {
        title: 'Stroll through a Christmas market and treat yourself to a seasonal snack',
        description: 'Churros with chocolate, roasted chestnuts, or artisanal gingerbread under colorful lights.',
        priority: 'medium',
      },
      {
        title: 'Host a Secret Santa gift exchange with loved ones',
        description: 'Secret draw, fun clues, and gift unwrapping with guaranteed laughs.',
        priority: 'high',
      },
      {
        title: 'Afternoon on the couch with a blanket and classic holiday movies',
        description: 'Home Alone, Love Actually, The Grinch, or The Nightmare Before Christmas.',
        priority: 'medium',
      },
      {
        title: 'Ice skate at an open-air rink',
        description: 'Lace up your skates and test your balance with gloves and a scarf.',
        priority: 'medium',
      },
      {
        title: 'Bake and build a gingerbread house',
        description: 'Snow-white icing, gumdrops, and lots of architectural patience.',
        priority: 'low',
      },
      {
        title: 'Write a letter reflecting on the year and setting goals for the next',
        description: 'Give thanks for experiences lived and write down your biggest wishes for the coming year.',
        priority: 'low',
      },
    ],
  },
  {
    id: 'collection-switch',
    title: 'Nintendo Switch Essentials',
    description: 'The greatest milestones and masterpieces that every Switch owner should experience and complete.',
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
        title: 'Defeat Ganon and save Hyrule in Zelda: Breath of the Wild',
        description: 'Explore thoroughly, complete shrines, and forge the Master Sword.',
        priority: 'high',
      },
      {
        title: 'Collect 500 Power Moons and beat the Darker Side in Mario Odyssey',
        description: 'Master jumps with Cappy and journey across all kingdoms.',
        priority: 'high',
      },
      {
        title: 'Reach a 5-star island rating in Animal Crossing: New Horizons',
        description: 'Decorate, design pathways, and host K.K. Slider for a concert.',
        priority: 'medium',
      },
      {
        title: 'Earn 3 stars in all 150cc cups in Mario Kart 8 Deluxe',
        description: 'Master the best shortcuts and drifts on every circuit.',
        priority: 'medium',
      },
      {
        title: 'Conquer the Pantheon of Hallownest in Hollow Knight',
        description: 'One of the greatest tests of skill and patience in the indie world.',
        priority: 'high',
      },
      {
        title: 'Escape the Underworld and defeat Hades for the first time',
        description: 'Combine divine boons and master each of the Infernal Arms.',
        priority: 'medium',
      },
      {
        title: 'Climb to the summit of Celeste Mountain in Celeste',
        description: 'A poignant story of overcoming obstacles with razor-sharp platforming.',
        priority: 'medium',
      },
    ],
  },
  {
    id: 'collection-viajes',
    title: '10 Countries to Visit in a Lifetime',
    description: 'Breathtaking iconic destinations. Untamed nature, ancient history, and captivating cultures.',
    category: 'travel',
    badge: '✈️ Travel',
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
    tags: ['Travel', 'Adventure', 'World'],
    tasks: [
      {
        title: 'Japan: Wander through Tokyo neon streets and Kyoto temples',
        description: 'Eat authentic ramen, ride the Shinkansen, and gaze at Mount Fuji.',
        priority: 'high',
      },
      {
        title: 'Iceland: Chase towering waterfalls and marvel at the Northern Lights',
        description: 'Soak in geothermal blue lagoons and walk across volcanic lava fields.',
        priority: 'high',
      },
      {
        title: 'Italy: Millennia-old Rome, Venice canals, and the Amalfi Coast',
        description: 'Culture, sublime cuisine, living history, and cliffside seaside towns.',
        priority: 'high',
      },
      {
        title: 'Peru: Watch the sunrise over the sacred citadel of Machu Picchu',
        description: 'Explore the Sacred Valley and savor world-class Lima gastronomy.',
        priority: 'high',
      },
      {
        title: 'Norway: Cruise the fjords and stand at the edge of Preikestolen',
        description: 'Red fishing cabins in Lofoten and the midnight sun.',
        priority: 'medium',
      },
      {
        title: 'Greece: Sunset in Santorini and classic temples of Athens',
        description: 'Vibrant Aegean blue, whitewashed houses with blue domes, and souvlaki.',
        priority: 'medium',
      },
      {
        title: 'Egypt: Sail a felucca on the Nile and behold the Pyramids of Giza',
        description: 'The mystery of the pharaohs in the Valley of the Kings and colossal temples.',
        priority: 'high',
      },
    ],
  },
  {
    id: 'collection-libros',
    title: 'Reading Challenge: 12 Books in a Year',
    description: 'A journey through genres, eras, and worlds to build a steady, month-by-month reading habit.',
    category: 'culture',
    badge: '📚 Reading Challenge',
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
    tags: ['Books', 'Reading', 'Culture'],
    tasks: [
      {
        title: 'Read a timeless classic of world literature',
        description: 'One Hundred Years of Solitude, Pride and Prejudice, 1984, or Crime and Punishment.',
        priority: 'medium',
      },
      {
        title: 'Devour a psychological thriller you cannot put down',
        description: 'Twist after twist until uncovering the shocking end before falling asleep.',
        priority: 'medium',
      },
      {
        title: 'Dive into an epic fantasy or sci-fi saga',
        description: 'Dune, The Name of the Wind, The Stormlight Archive, or Foundation.',
        priority: 'high',
      },
      {
        title: 'Read a non-fiction book that teaches you a valuable skill',
        description: 'Stoic philosophy, the science of habits, or fascinating world history.',
        priority: 'medium',
      },
      {
        title: 'Read a critically acclaimed graphic novel or comic',
        description: 'Maus, The Sandman, Persepolis, or Watchmen.',
        priority: 'low',
      },
      {
        title: 'Read a book written by an author from another continent',
        description: 'Contemporary Japanese, African, or Latin American literature.',
        priority: 'medium',
      },
      {
        title: 'Reread your favorite childhood book with adult eyes',
        description: 'The Little Prince, Harry Potter, or Momo.',
        priority: 'low',
      },
    ],
  },
  {
    id: 'collection-cocina',
    title: 'Culinary Mastery at Home',
    description: 'Essential techniques, iconic dishes, and homemade recipes to elevate your kitchen skills.',
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
    tags: ['Cooking', 'Gastronomy', 'Recipes'],
    tasks: [
      {
        title: 'Make authentic traditional Roman pasta carbonara',
        description: 'Just egg yolks, crispy guanciale, pecorino romano, and freshly ground black pepper.',
        priority: 'high',
      },
      {
        title: 'Knead and bake a Neapolitan pizza with 48h dough fermentation',
        description: 'Airy crust with pronounced leopard spotting, San Marzano tomatoes, and fresh mozzarella.',
        priority: 'high',
      },
      {
        title: 'Bake a loaf of crusty homemade artisan bread',
        description: 'Strong flour, water, salt, and patience for bakery-quality bread.',
        priority: 'medium',
      },
      {
        title: 'Make homemade sushi from scratch: nigiri, maki, and uramaki',
        description: 'Learn to season sushi rice (shari) and slice fresh salmon with precision.',
        priority: 'medium',
      },
      {
        title: 'Cook homemade ramen with slow-simmered rich broth',
        description: 'Marinated ajitsuke eggs, tender chashu pork, and noodles in deeply flavored broth.',
        priority: 'medium',
      },
      {
        title: 'Bake an ultra-creamy Basque burnt cheesecake (La Viña style)',
        description: 'Caramelized on the outside, molten and silky on the inside.',
        priority: 'low',
      },
    ],
  },
];

export function getDefaultCollections(lang: string = 'es'): CollectionItem[] {
  if (lang && lang.toLowerCase().startsWith('en')) {
    return DEFAULT_COLLECTIONS_EN;
  }
  return DEFAULT_COLLECTIONS;
}

