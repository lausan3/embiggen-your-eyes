export interface GeographicFeature {
  name: string
  type: string
  description: string
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
}

export const GEOGRAPHIC_FEATURES: Record<string, GeographicFeature[]> = {
  Moon: [
    {
      name: "Mare Imbrium",
      type: "Mare",
      description: "Sea of Rains - large lunar mare",
      bounds: { north: 48.0, south: 19.0, east: 5.0, west: -20.0 },
    },
    {
      name: "Mare Serenitatis",
      type: "Mare",
      description: "Sea of Serenity",
      bounds: { north: 35.0, south: 17.0, east: 25.0, west: 10.0 },
    },
    {
      name: "Mare Tranquillitatis",
      type: "Mare",
      description: "Sea of Tranquility - Apollo 11 landing site region",
      bounds: { north: 14.0, south: 0.0, east: 45.0, west: 23.0 },
    },
    {
      name: "Mare Crisium",
      type: "Mare",
      description: "Sea of Crises",
      bounds: { north: 24.0, south: 10.0, east: 65.0, west: 50.0 },
    },
    {
      name: "Mare Fecunditatis",
      type: "Mare",
      description: "Sea of Fecundity",
      bounds: { north: 0.0, south: -15.0, east: 60.0, west: 40.0 },
    },
    {
      name: "Mare Nectaris",
      type: "Mare",
      description: "Sea of Nectar",
      bounds: { north: -10.0, south: -20.0, east: 40.0, west: 25.0 },
    },
    {
      name: "Oceanus Procellarum",
      type: "Oceanus",
      description: "Ocean of Storms - largest lunar mare",
      bounds: { north: 43.0, south: -23.0, east: -20.0, west: -65.0 },
    },
    {
      name: "Mare Nubium",
      type: "Mare",
      description: "Sea of Clouds",
      bounds: { north: -11.0, south: -30.0, east: -5.0, west: -25.0 },
    },
    {
      name: "Mare Humorum",
      type: "Mare",
      description: "Sea of Moisture",
      bounds: { north: -18.0, south: -32.0, east: -32.0, west: -45.0 },
    },
  ],
  Mars: [
    {
      name: "Olympus Mons",
      type: "Mons",
      description: "Largest volcano in the solar system",
      bounds: { north: 25.0, south: 12.0, east: -127.0, west: -141.0 },
    },
    {
      name: "Valles Marineris",
      type: "Vallis",
      description: "Massive canyon system - 4000 km long",
      bounds: { north: -2.0, south: -18.0, east: -30.0, west: -110.0 },
    },
    {
      name: "Tharsis Bulge",
      type: "Region",
      description: "Volcanic plateau with three major volcanoes",
      bounds: { north: 25.0, south: -15.0, east: -85.0, west: -135.0 },
    },
    {
      name: "Hellas Planitia",
      type: "Planitia",
      description: "Largest visible impact basin on Mars",
      bounds: { north: -30.0, south: -55.0, east: 90.0, west: 50.0 },
    },
    {
      name: "Isidis Planitia",
      type: "Planitia",
      description: "Ancient impact basin",
      bounds: { north: 20.0, south: 5.0, east: 95.0, west: 75.0 },
    },
    {
      name: "Argyre Planitia",
      type: "Planitia",
      description: "Large impact basin in southern highlands",
      bounds: { north: -42.0, south: -57.0, east: -30.0, west: -55.0 },
    },
    {
      name: "Utopia Planitia",
      type: "Planitia",
      description: "Largest recognized impact basin - Viking 2 landing site",
      bounds: { north: 55.0, south: 35.0, east: 130.0, west: 90.0 },
    },
    {
      name: "Chryse Planitia",
      type: "Planitia",
      description: "Smooth circular plain - Viking 1 landing site",
      bounds: { north: 35.0, south: 15.0, east: -25.0, west: -55.0 },
    },
    {
      name: "Elysium Planitia",
      type: "Planitia",
      description: "Second largest volcanic region - InSight landing site",
      bounds: { north: 10.0, south: -5.0, east: 160.0, west: 130.0 },
    },
    {
      name: "Syrtis Major Planum",
      type: "Planum",
      description: "Dark albedo feature visible from Earth",
      bounds: { north: 20.0, south: -5.0, east: 80.0, west: 60.0 },
    },
  ],
  Mercury: [
    {
      name: "Caloris Planitia",
      type: "Planitia",
      description: "Largest impact basin on Mercury - 1550 km diameter",
      bounds: { north: 45.0, south: 15.0, east: -175.0, west: 165.0 },
    },
    {
      name: "Borealis Planitia",
      type: "Planitia",
      description: "Northern smooth plains",
      bounds: { north: 85.0, south: 60.0, east: -60.0, west: -100.0 },
    },
  ],
  Vesta: [
    {
      name: "Rheasilvia",
      type: "Crater",
      description: "Massive impact basin covering southern hemisphere - 505 km diameter",
      bounds: { north: -60.0, south: -90.0, east: 360.0, west: 0.0 },
    },
    {
      name: "Veneneia",
      type: "Crater",
      description: "Large impact basin underlying Rheasilvia - 395 km diameter",
      bounds: { north: -40.0, south: -65.0, east: 350.0, west: 300.0 },
    },
  ],
}
