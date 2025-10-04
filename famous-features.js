// Famous planetary features database - 50+ searchable features per planet
// Each feature can optionally specify a parent region it's located within

const FAMOUS_FEATURES = {
    Moon: [
        // Craters in Oceanus Procellarum
        { name: 'Aristarchus', type: 'Crater', lat: 23.7, lon: -47.4, withinRegion: 'Oceanus Procellarum' },
        { name: 'Kepler', type: 'Crater', lat: 8.1, lon: -38.0, withinRegion: 'Oceanus Procellarum' },
        { name: 'Copernicus', type: 'Crater', lat: 9.7, lon: -20.1, withinRegion: 'Oceanus Procellarum' },
        { name: 'Pytheas', type: 'Crater', lat: 20.5, lon: -20.6, withinRegion: 'Mare Imbrium' },

        // Craters in Mare Imbrium
        { name: 'Archimedes', type: 'Crater', lat: 29.7, lon: -4.0, withinRegion: 'Mare Imbrium' },
        { name: 'Plato', type: 'Crater', lat: 51.6, lon: -9.3, withinRegion: 'Mare Imbrium' },
        { name: 'Timocharis', type: 'Crater', lat: 26.7, lon: -13.1, withinRegion: 'Mare Imbrium' },

        // Craters in Mare Serenitatis
        { name: 'Bessel', type: 'Crater', lat: 21.8, lon: 17.9, withinRegion: 'Mare Serenitatis' },
        { name: 'Plinius', type: 'Crater', lat: 15.4, lon: 23.7, withinRegion: 'Mare Serenitatis' },

        // Craters in Mare Tranquillitatis
        { name: 'Maskelyne', type: 'Crater', lat: 2.2, lon: 30.9, withinRegion: 'Mare Tranquillitatis' },
        { name: 'Moltke', type: 'Crater', lat: -0.6, lon: 24.2, withinRegion: 'Mare Tranquillitatis' },

        // Craters in Mare Nectaris
        { name: 'Theophilus', type: 'Crater', lat: -11.4, lon: 26.4, withinRegion: 'Mare Nectaris' },
        { name: 'Rosse', type: 'Crater', lat: -17.9, lon: 35.0, withinRegion: 'Mare Nectaris' },

        // Craters in Mare Crisium
        { name: 'Picard', type: 'Crater', lat: 14.6, lon: 54.7, withinRegion: 'Mare Crisium' },
        { name: 'Peirce', type: 'Crater', lat: 18.3, lon: 53.5, withinRegion: 'Mare Crisium' },

        // Craters in Mare Fecunditatis
        { name: 'Langrenus', type: 'Crater', lat: -8.9, lon: 61.1, withinRegion: 'Mare Fecunditatis' },
        { name: 'Petavius', type: 'Crater', lat: -25.3, lon: 60.4, withinRegion: 'Mare Fecunditatis' },

        // Large standalone craters
        { name: 'Tycho', type: 'Crater', lat: -43.3, lon: -11.4 },
        { name: 'Clavius', type: 'Crater', lat: -58.8, lon: -14.4 },
        { name: 'Schickard', type: 'Crater', lat: -44.3, lon: -55.3 },
        { name: 'Grimaldi', type: 'Crater', lat: -5.5, lon: -68.6 },
        { name: 'Ptolemaeus', type: 'Crater', lat: -9.3, lon: -1.8 },
        { name: 'Alphonsus', type: 'Crater', lat: -13.4, lon: -2.8 },
        { name: 'Arzachel', type: 'Crater', lat: -18.2, lon: -1.9 },
        { name: 'Eratosthenes', type: 'Crater', lat: 14.5, lon: -11.3 },
        { name: 'Aristoteles', type: 'Crater', lat: 50.2, lon: 17.4 },
        { name: 'Eudoxus', type: 'Crater', lat: 44.3, lon: 16.3 },
        { name: 'Posidonius', type: 'Crater', lat: 31.8, lon: 29.9 },
        { name: 'Atlas', type: 'Crater', lat: 46.7, lon: 44.4 },
        { name: 'Hercules', type: 'Crater', lat: 46.7, lon: 39.1 },
        { name: 'Endymion', type: 'Crater', lat: 53.6, lon: 56.5 },
        { name: 'Gassendi', type: 'Crater', lat: -17.5, lon: -40.1, withinRegion: 'Mare Humorum' },
        { name: 'Bullialdus', type: 'Crater', lat: -20.7, lon: -22.2, withinRegion: 'Mare Nubium' },
        { name: 'Flamsteed', type: 'Crater', lat: -4.5, lon: -44.3, withinRegion: 'Oceanus Procellarum' },

        // Maria (Seas) - center points
        { name: 'Mare Imbrium', type: 'Mare', lat: 32.8, lon: -15.6 },
        { name: 'Mare Serenitatis', type: 'Mare', lat: 28.0, lon: 17.5 },
        { name: 'Mare Tranquillitatis', type: 'Mare', lat: 8.5, lon: 31.4 },
        { name: 'Mare Crisium', type: 'Mare', lat: 17.0, lon: 59.1 },
        { name: 'Mare Fecunditatis', type: 'Mare', lat: -7.8, lon: 51.3 },
        { name: 'Mare Nectaris', type: 'Mare', lat: -15.2, lon: 35.5 },
        { name: 'Oceanus Procellarum', type: 'Oceanus', lat: 18.4, lon: -57.4 },
        { name: 'Mare Nubium', type: 'Mare', lat: -21.3, lon: -16.6 },
        { name: 'Mare Humorum', type: 'Mare', lat: -24.4, lon: -38.6 },
        { name: 'Mare Frigoris', type: 'Mare', lat: 56.0, lon: 1.4 },
        { name: 'Mare Vaporum', type: 'Mare', lat: 13.3, lon: 3.6 },
        { name: 'Sinus Iridum', type: 'Sinus', lat: 44.1, lon: -31.5, withinRegion: 'Mare Imbrium' },
        { name: 'Sinus Medii', type: 'Sinus', lat: 2.4, lon: 1.7 },
        { name: 'Lacus Somniorum', type: 'Lacus', lat: 38.0, lon: 29.2 },
        { name: 'Palus Putredinis', type: 'Palus', lat: 26.5, lon: 0.4, withinRegion: 'Mare Imbrium' }
    ],

    Mars: [
        // Features in Tharsis region
        { name: 'Olympus Mons', type: 'Mons', lat: 18.65, lon: -133.8, withinRegion: 'Tharsis Bulge' },
        { name: 'Ascraeus Mons', type: 'Mons', lat: 11.9, lon: -104.5, withinRegion: 'Tharsis Bulge' },
        { name: 'Pavonis Mons', type: 'Mons', lat: 1.5, lon: -112.8, withinRegion: 'Tharsis Bulge' },
        { name: 'Arsia Mons', type: 'Mons', lat: -8.4, lon: -120.1, withinRegion: 'Tharsis Bulge' },
        { name: 'Alba Mons', type: 'Mons', lat: 40.5, lon: -109.9 },

        // Elysium region
        { name: 'Elysium Mons', type: 'Mons', lat: 25.0, lon: 147.2 },
        { name: 'Hecates Tholus', type: 'Tholus', lat: 32.4, lon: 150.2 },
        { name: 'Albor Tholus', type: 'Tholus', lat: 19.0, lon: 150.5 },

        // Valles Marineris system
        { name: 'Valles Marineris', type: 'Vallis', lat: -13.9, lon: -59.2 },
        { name: 'Ius Chasma', type: 'Chasma', lat: -7.2, lon: -85.8, withinRegion: 'Valles Marineris' },
        { name: 'Melas Chasma', type: 'Chasma', lat: -10.4, lon: -72.0, withinRegion: 'Valles Marineris' },
        { name: 'Coprates Chasma', type: 'Chasma', lat: -13.9, lon: -61.3, withinRegion: 'Valles Marineris' },
        { name: 'Candor Chasma', type: 'Chasma', lat: -6.4, lon: -71.0, withinRegion: 'Valles Marineris' },

        // Major plains
        { name: 'Hellas Planitia', type: 'Planitia', lat: -42.4, lon: 70.5 },
        { name: 'Isidis Planitia', type: 'Planitia', lat: 12.9, lon: 87.0 },
        { name: 'Argyre Planitia', type: 'Planitia', lat: -49.7, lon: -43.4 },
        { name: 'Utopia Planitia', type: 'Planitia', lat: 46.7, lon: 117.5 },
        { name: 'Chryse Planitia', type: 'Planitia', lat: 28.4, lon: -40.0 },
        { name: 'Amazonis Planitia', type: 'Planitia', lat: 24.8, lon: -158.0 },
        { name: 'Elysium Planitia', type: 'Planitia', lat: 3.0, lon: 154.7 },
        { name: 'Acidalia Planitia', type: 'Planitia', lat: 46.7, lon: -22.0 },

        // Plateaus
        { name: 'Syrtis Major Planum', type: 'Planum', lat: 8.4, lon: 69.5 },
        { name: 'Meridiani Planum', type: 'Planum', lat: -1.9, lon: -5.5 },
        { name: 'Lunae Planum', type: 'Planum', lat: 10.5, lon: -68.0 },
        { name: 'Hesperia Planum', type: 'Planum', lat: -19.4, lon: 110.0 },

        // Famous craters
        { name: 'Gale', type: 'Crater', lat: -5.4, lon: 137.8 },
        { name: 'Jezero', type: 'Crater', lat: 18.4, lon: 77.7 },
        { name: 'Huygens', type: 'Crater', lat: -14.0, lon: 304.4 },
        { name: 'Schiaparelli', type: 'Crater', lat: -2.7, lon: 343.4 },
        { name: 'Herschel', type: 'Crater', lat: -14.9, lon: 230.3 },
        { name: 'Lowell', type: 'Crater', lat: -52.3, lon: 278.8 },
        { name: 'Holden', type: 'Crater', lat: -26.4, lon: 325.3 },
        { name: 'Eberswalde', type: 'Crater', lat: -23.9, lon: 326.7 },
        { name: 'Endeavour', type: 'Crater', lat: -2.3, lon: 354.5 },
        { name: 'Victoria', type: 'Crater', lat: -2.1, lon: 354.5, withinRegion: 'Meridiani Planum' },
        { name: 'Gusev', type: 'Crater', lat: -14.6, lon: 175.4 },

        // Valleys and channels
        { name: 'Kasei Valles', type: 'Vallis', lat: 24.6, lon: -65.0 },
        { name: 'Ma\'adim Vallis', type: 'Vallis', lat: -20.6, lon: 182.1 },
        { name: 'Ares Vallis', type: 'Vallis', lat: 10.3, lon: -25.8 },
        { name: 'Tiu Valles', type: 'Vallis', lat: 15.0, lon: -36.0 },

        // Polar regions
        { name: 'Planum Boreum', type: 'Planum', lat: 85.0, lon: 0.0 },
        { name: 'Planum Australe', type: 'Planum', lat: -85.0, lon: 0.0 },

        // Terra (highlands)
        { name: 'Terra Sabaea', type: 'Terra', lat: 2.0, lon: 42.0 },
        { name: 'Terra Sirenum', type: 'Terra', lat: -39.7, lon: -150.0 },
        { name: 'Terra Cimmeria', type: 'Terra', lat: -34.7, lon: 145.0 },
        { name: 'Noachis Terra', type: 'Terra', lat: -45.0, lon: 350.0 },

        // Other features
        { name: 'Noctis Labyrinthus', type: 'Labyrinthus', lat: -7.0, lon: -100.0, withinRegion: 'Tharsis Bulge' },
        { name: 'Cerberus Fossae', type: 'Fossae', lat: 11.3, lon: 166.37 }
    ],

    Mercury: [
        { name: 'Caloris Planitia', type: 'Planitia', lat: 30.5, lon: -189.8 },
        { name: 'Borealis Planitia', type: 'Planitia', lat: 73.4, lon: -79.5 },
        { name: 'Beethoven', type: 'Crater', lat: -20.3, lon: -123.6 },
        { name: 'Tolstoj', type: 'Crater', lat: -16.3, lon: -164.5 },
        { name: 'Rembrandt', type: 'Crater', lat: -32.8, lon: -88.3 },
        { name: 'Rachmaninoff', type: 'Crater', lat: 27.6, lon: -57.6 },
        { name: 'Raditladi', type: 'Crater', lat: 27.0, lon: -119.4, withinRegion: 'Caloris Planitia' },
        { name: 'Homer', type: 'Crater', lat: -1.4, lon: -36.2 },
        { name: 'Goethe', type: 'Crater', lat: 79.6, lon: -54.3 },
        { name: 'Raphael', type: 'Crater', lat: -20.0, lon: -76.0 },
        { name: 'Praxiteles', type: 'Crater', lat: 27.2, lon: -59.6 },
        { name: 'Schubert', type: 'Crater', lat: -43.3, lon: -54.3 },
        { name: 'Brahms', type: 'Crater', lat: 58.5, lon: -176.5 },
        { name: 'Vivaldi', type: 'Crater', lat: 13.7, lon: -86.1 },
        { name: 'Bach', type: 'Crater', lat: -69.2, lon: -103.7 },
        { name: 'Mozart', type: 'Crater', lat: 8.1, lon: -190.5 },
        { name: 'Dickens', type: 'Crater', lat: -72.9, lon: -153.3 },
        { name: 'Michelangelo', type: 'Crater', lat: -45.0, lon: -109.1 },
        { name: 'Verdi', type: 'Crater', lat: -64.7, lon: -168.6 },
        { name: 'Kuiper', type: 'Crater', lat: -11.3, lon: -31.3 },
        { name: 'Degas', type: 'Crater', lat: 37.5, lon: -126.4 },
        { name: 'Hokusai', type: 'Crater', lat: 57.7, lon: -16.8 },
        { name: 'Kertész', type: 'Crater', lat: 27.5, lon: -146.0 },
        { name: 'Matisse', type: 'Crater', lat: 24.1, lon: -90.1 },
        { name: 'Picasso', type: 'Crater', lat: -4.7, lon: -47.0 },
        { name: 'Renoir', type: 'Crater', lat: -18.9, lon: -51.9 },
        { name: 'Shakespeare', type: 'Crater', lat: 49.7, lon: -151.0 },
        { name: 'Stravinsky', type: 'Crater', lat: 50.5, lon: -73.7 },
        { name: 'Vyasa', type: 'Crater', lat: 48.3, lon: -81.1 },
        { name: 'Wagner', type: 'Crater', lat: 67.6, lon: -114.0 },
        { name: 'Zeami', type: 'Crater', lat: 3.5, lon: -147.2 },
        { name: 'Mansur', type: 'Crater', lat: 47.6, lon: -162.5 },
        { name: 'Neruda', type: 'Crater', lat: -43.4, lon: -179.0 },
        { name: 'Petrarch', type: 'Crater', lat: 30.5, lon: -26.2 },
        { name: 'Discovery Rupes', type: 'Rupes', lat: -56.0, lon: -38.0 },
        { name: 'Adventure Rupes', type: 'Rupes', lat: -65.0, lon: -63.5 },
        { name: 'Victoria Rupes', type: 'Rupes', lat: -50.9, lon: -31.1 },
        { name: 'Pantheon Fossae', type: 'Fossae', lat: 30.6, lon: -197.0, withinRegion: 'Caloris Planitia' },
        { name: 'Apollodorus', type: 'Crater', lat: 30.9, lon: -197.0, withinRegion: 'Caloris Planitia' },
        { name: 'Odin Planitia', type: 'Planitia', lat: 23.3, lon: -171.6 },
        { name: 'Suisei Planitia', type: 'Planitia', lat: 59.2, lon: -151.3 },
        { name: 'Tir Planitia', type: 'Planitia', lat: 0.8, lon: -176.1 },
        { name: 'Budh Planitia', type: 'Planitia', lat: 22.0, lon: -151.0 }
    ],

    Vesta: [
        { name: 'Rheasilvia', type: 'Crater', lat: -75.0, lon: 301.0 },
        { name: 'Veneneia', type: 'Crater', lat: -52.0, lon: 325.0 },
        { name: 'Marcia', type: 'Crater', lat: -10.0, lon: 190.0 },
        { name: 'Calpurnia', type: 'Crater', lat: -32.0, lon: 170.0 },
        { name: 'Minucia', type: 'Crater', lat: -24.0, lon: 145.0 },
        { name: 'Cornelia', type: 'Crater', lat: -9.0, lon: 225.0 },
        { name: 'Numisia', type: 'Crater', lat: -8.0, lon: 246.0 },
        { name: 'Postumia', type: 'Crater', lat: -25.0, lon: 220.0 },
        { name: 'Vibidia', type: 'Crater', lat: -26.0, lon: 140.0 },
        { name: 'Claudia', type: 'Crater', lat: 12.0, lon: 215.0 },
        { name: 'Domitia', type: 'Crater', lat: -35.0, lon: 178.0 },
        { name: 'Antonia', type: 'Crater', lat: -19.0, lon: 75.0 },
        { name: 'Licinia', type: 'Crater', lat: 4.0, lon: 140.0 },
        { name: 'Tuccia', type: 'Crater', lat: -4.0, lon: 210.0 },
        { name: 'Arruntia', type: 'Crater', lat: -23.0, lon: 240.0 },
        { name: 'Oppia', type: 'Crater', lat: -8.0, lon: 307.0 },
        { name: 'Gegania', type: 'Crater', lat: -51.0, lon: 198.0 },
        { name: 'Fabia', type: 'Crater', lat: -16.0, lon: 199.0 },
        { name: 'Pomponia', type: 'Crater', lat: 15.0, lon: 290.0 },
        { name: 'Vestalia Terra', type: 'Terra', lat: -20.0, lon: 270.0 }
    ]
};
