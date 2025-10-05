// Famous Earth Geological Features
// Curated list of notable geological formations with coordinates
// Only includes features with significant geological timelines

const EARTH_FEATURES = [
    // === MOUNTAINS ===
    {
        name: 'Mount Everest',
        type: 'Mountain',
        lat: 27.9881,
        lon: 86.9250,
        elevation: 8849, // meters
        region: 'Himalayas, Nepal/China',
        description: 'Highest mountain on Earth, formed by India-Asia collision'
    },
    {
        name: 'K2',
        type: 'Mountain',
        lat: 35.8825,
        lon: 76.5133,
        elevation: 8611,
        region: 'Karakoram, Pakistan/China',
        description: 'Second highest peak, more difficult than Everest'
    },
    {
        name: 'Denali',
        type: 'Mountain',
        lat: 63.0692,
        lon: -151.0063,
        elevation: 6190,
        region: 'Alaska, USA',
        description: 'Highest peak in North America'
    },
    {
        name: 'Mont Blanc',
        type: 'Mountain',
        lat: 45.8326,
        lon: 6.8652,
        elevation: 4808,
        region: 'Alps, France/Italy',
        description: 'Highest peak in the Alps'
    },

    // === VOLCANOES ===
    {
        name: 'Mauna Loa',
        type: 'Volcano',
        lat: 19.4756,
        lon: -155.6054,
        elevation: 4169,
        region: 'Hawaii, USA',
        description: 'Largest active volcano on Earth by volume'
    },
    {
        name: 'Kilauea',
        type: 'Volcano',
        lat: 19.4069,
        lon: -155.2834,
        elevation: 1247,
        region: 'Hawaii, USA',
        description: 'Most active volcano on Earth, continuous eruption 1983-2018'
    },
    {
        name: 'Mount St. Helens',
        type: 'Volcano',
        lat: 46.1914,
        lon: -122.1956,
        elevation: 2549,
        region: 'Washington, USA',
        description: 'Catastrophic 1980 eruption, active monitoring'
    },
    {
        name: 'Mount Vesuvius',
        type: 'Volcano',
        lat: 40.8210,
        lon: 14.4260,
        elevation: 1281,
        region: 'Italy',
        description: 'Destroyed Pompeii in 79 CE, highly dangerous location'
    },
    {
        name: 'Mount Fuji',
        type: 'Volcano',
        lat: 35.3606,
        lon: 138.7278,
        elevation: 3776,
        region: 'Japan',
        description: 'Iconic stratovolcano, last eruption 1707'
    },
    {
        name: 'Eyjafjallajökull',
        type: 'Volcano',
        lat: 63.6314,
        lon: -19.6083,
        elevation: 1651,
        region: 'Iceland',
        description: '2010 eruption disrupted European air travel'
    },
    {
        name: 'Krakatoa',
        type: 'Volcano',
        lat: -6.1022,
        lon: 105.4230,
        elevation: 813,
        region: 'Indonesia',
        description: 'Catastrophic 1883 eruption, heard 4,800 km away'
    },

    // === CALDERAS & VOLCANIC SYSTEMS ===
    {
        name: 'Yellowstone Caldera',
        type: 'Caldera',
        lat: 44.4280,
        lon: -110.5885,
        elevation: 2400,
        region: 'Wyoming, USA',
        description: 'Supervolcano, last major eruption 640,000 years ago'
    },
    {
        name: 'Lake Toba',
        type: 'Caldera',
        lat: 2.6845,
        lon: 98.8756,
        elevation: 904,
        region: 'Sumatra, Indonesia',
        description: 'Largest volcanic lake, massive eruption 74,000 years ago'
    },

    // === CANYONS & VALLEYS ===
    {
        name: 'Grand Canyon',
        type: 'Canyon',
        lat: 36.0544,
        lon: -112.1401,
        depth: 1800, // meters
        region: 'Arizona, USA',
        description: 'Carved by Colorado River, exposing 1.8 billion years of geology'
    },
    {
        name: 'Yarlung Tsangpo Grand Canyon',
        type: 'Canyon',
        lat: 29.7500,
        lon: 95.1667,
        depth: 5000,
        region: 'Tibet, China',
        description: 'Deepest canyon on Earth'
    },
    {
        name: 'Fish River Canyon',
        type: 'Canyon',
        lat: -27.6500,
        lon: 17.7333,
        depth: 550,
        region: 'Namibia',
        description: 'Second largest canyon in Africa'
    },
    {
        name: 'Great Rift Valley',
        type: 'Rift Valley',
        lat: -1.0,
        lon: 36.0,
        length: 6000000, // meters
        region: 'East Africa',
        description: 'Active continental rift, cradle of human evolution'
    },

    // === ISLANDS & ISLAND CHAINS ===
    {
        name: 'Iceland',
        type: 'Volcanic Island',
        lat: 64.9631,
        lon: -19.0208,
        area: 103000, // km²
        region: 'North Atlantic',
        description: 'Mid-Atlantic Ridge above sea level, active volcanism'
    },
    {
        name: 'Galápagos Islands',
        type: 'Volcanic Islands',
        lat: -0.9538,
        lon: -90.9656,
        area: 8010,
        region: 'Ecuador',
        description: 'Hotspot volcanism, unique biodiversity, Darwin\'s finches'
    },
    {
        name: 'Surtsey',
        type: 'Volcanic Island',
        lat: 63.3031,
        lon: -20.6050,
        area: 1.4,
        region: 'Iceland',
        description: 'Formed 1963-1967, youngest island on Earth'
    },

    // === IMPACT CRATERS ===
    {
        name: 'Chicxulub Crater',
        type: 'Impact Crater',
        lat: 21.4,
        lon: -89.5167,
        diameter: 180000, // meters
        region: 'Yucatán, Mexico',
        description: 'Dinosaur-killing asteroid impact, 66 million years ago'
    },
    {
        name: 'Meteor Crater',
        type: 'Impact Crater',
        lat: 35.0274,
        lon: -111.0224,
        diameter: 1200,
        region: 'Arizona, USA',
        description: 'Well-preserved crater, 50,000 years old'
    },
    {
        name: 'Vredefort Crater',
        type: 'Impact Crater',
        lat: -27.0,
        lon: 27.5,
        diameter: 300000,
        region: 'South Africa',
        description: 'Largest verified impact structure, 2 billion years old'
    },

    // === DESERTS & DUNES ===
    {
        name: 'Sahara Desert',
        type: 'Desert',
        lat: 23.0,
        lon: 11.0,
        area: 9000000, // km²
        region: 'North Africa',
        description: 'Largest hot desert, formed by atmospheric circulation'
    },
    {
        name: 'Namib Desert',
        type: 'Desert',
        lat: -24.5,
        lon: 15.5,
        area: 81000,
        region: 'Namibia',
        description: 'Oldest desert on Earth, 55-80 million years old'
    },

    // === GLACIERS & ICE ===
    {
        name: 'Antarctica',
        type: 'Ice Sheet',
        lat: -82.8628,
        lon: 135.0,
        area: 14000000,
        region: 'Antarctic',
        description: 'Largest ice mass on Earth, 90% of world\'s ice'
    },
    {
        name: 'Greenland Ice Sheet',
        type: 'Ice Sheet',
        lat: 72.0,
        lon: -40.0,
        area: 1710000,
        region: 'Greenland',
        description: 'Second largest ice sheet, melting due to climate change'
    },

    // === UNIQUE GEOLOGICAL FORMATIONS ===
    {
        name: 'Giant\'s Causeway',
        type: 'Basalt Columns',
        lat: 55.2408,
        lon: -6.5116,
        region: 'Northern Ireland',
        description: 'Hexagonal basalt columns from ancient volcanic eruption'
    },
    {
        name: 'Uluru (Ayers Rock)',
        type: 'Inselberg',
        lat: -25.3444,
        lon: 131.0369,
        elevation: 348,
        region: 'Australia',
        description: 'Sacred sandstone monolith, 550 million years old'
    },
    {
        name: 'Devils Tower',
        type: 'Volcanic Neck',
        lat: 44.5903,
        lon: -104.7147,
        elevation: 386,
        region: 'Wyoming, USA',
        description: 'Igneous intrusion exposed by erosion'
    },
    {
        name: 'Paricutin',
        type: 'Cinder Cone',
        lat: 19.4931,
        lon: -102.2511,
        elevation: 424,
        region: 'Mexico',
        description: 'Volcano born in cornfield 1943, entire lifecycle observed'
    },

    // === OCEAN FEATURES (underwater) ===
    {
        name: 'Mid-Atlantic Ridge',
        type: 'Oceanic Ridge',
        lat: 0.0,
        lon: -25.0,
        length: 16000000, // meters
        region: 'Atlantic Ocean',
        description: 'Longest mountain range on Earth, seafloor spreading'
    },
    {
        name: 'Mariana Trench',
        type: 'Oceanic Trench',
        lat: 11.3733,
        lon: 142.5917,
        depth: -10994, // meters (Challenger Deep)
        region: 'Pacific Ocean',
        description: 'Deepest point on Earth'
    }
];
