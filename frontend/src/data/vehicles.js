// Lista de marcas → modelos (editable). Si querés agregar más, sumalos acá.
export const VEHICLES = {
  Toyota: ["Corolla", "Corolla Cross", "Yaris", "Etios", "Hilux", "SW4", "RAV4", "Camry", "Prius"],
  Volkswagen: ["Gol", "Polo", "Virtus", "Vento", "Nivus", "T-Cross", "Taos", "Amarok", "Tiguan"],
  Fiat: ["Cronos", "Argo", "Mobi", "Uno", "Palio", "Siena", "Strada", "Toro", "500", "Punto"],
  Chevrolet: ["Onix", "Onix Plus", "Prisma", "Aveo", "Corsa", "Cruze", "Tracker", "Spin", "S10"],
  Ford: ["Ka", "Fiesta", "Focus", "Ecosport", "Kuga", "Territory", "Ranger", "Maverick", "Mondeo"],
  Renault: ["Clio", "Sandero", "Stepway", "Logan", "Kangoo", "Duster", "Oroch", "Fluence", "Megane"],
  Peugeot: ["206", "207", "208", "301", "307", "308", "2008", "3008", "Partner"],
  Citroën: ["C3", "C3 Aircross", "C4", "C4 Cactus", "Berlingo"],
  Nissan: ["March", "Versa", "Sentra", "Kicks", "Frontier", "X-Trail"],
  Honda: ["Fit", "City", "Civic", "HR-V", "WR-V"],
  Hyundai: ["HB20", "i10", "i20", "Accent", "Elantra", "Creta", "Tucson", "Santa Fe"],
  Kia: ["Picanto", "Rio", "Cerato", "Seltos", "Sportage", "Sorento"],
  Jeep: ["Renegade", "Compass", "Commander", "Wrangler", "Gladiator"],
  Suzuki: ["Swift", "Baleno", "Vitara", "S-Cross", "Jimny"],
  Chery: ["QQ", "Arrizo", "Tiggo 2", "Tiggo 3", "Tiggo 4", "Tiggo 7"],
  Haval: ["H1", "H2", "H6", "Jolion"],
  GreatWall: ["Wingle 5", "Wingle 7", "Poer"],
  Mitsubishi: ["L200", "Outlander", "ASX"],
  Subaru: ["Impreza", "XV", "Forester", "Outback"],
  BMW: ["Serie 1", "Serie 2", "Serie 3", "Serie 5", "X1", "X3", "X5"],
  MercedesBenz: ["Clase A", "Clase C", "Clase E", "GLA", "GLC", "Sprinter"],
  Audi: ["A1", "A3", "A4", "Q2", "Q3", "Q5"],
  Volvo: ["XC40", "XC60", "XC90"],
  RAM: ["1500", "2500"],
  MINI: ["Cooper", "Countryman", "Clubman"],

  // Si el usuario elige "Otro", mostramos campo libre.
};

export const BRANDS = Object.keys(VEHICLES);
export const OTHER_OPTION = "Otro (especificar)";
