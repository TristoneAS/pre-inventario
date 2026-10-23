export const AREAS = [
  {
    id: "terminado",
    name: "Terminado",
    location: "terminado",
    special: false,
    color: "rgba(76, 175, 80, 0.55)",
    hover: "rgba(76, 175, 80, 0.4)",
  },
  {
    id: "vulcanizado",
    name: "Vulcanizado",
    location: "vulcanizado",
    special: true,
    color: "rgba(25, 118, 210, 0.55)",
    hover: "rgba(25, 118, 210, 0.4)",
  },
  {
    id: "materia-prima",
    name: "Materia Prima",
    location: "mp",
    special: false,
    color: "rgba(255, 152, 0, 0.55)",
    hover: "rgba(255, 152, 0, 0.4)",
  },
  {
    id: "extrusion",
    name: "Extrusión",
    location: "green",
    special: true,
    color: "rgba(156, 39, 176, 0.55)",
    hover: "rgba(156, 39, 176, 0.4)",
  },
  {
    id: "subensamble",
    name: "Subensamble",
    location: "subensamble",
    special: true,
    color: "rgba(0, 188, 212, 0.55)",
    hover: "rgba(0, 188, 212, 0.4)",
  },
];

export const PLANTA_COLORS = {
  DEL: { color: "#81c784", hover: "#66bb6a" },
  DELX: { color: "#64b5f6", hover: "#42a5f5" },
  FEDERAL: { color: "#ffb74d", hover: "#ffa726" },
};

export function areaById(id) {
  return AREAS.find((area) => area.id === id) || null;
}

export function areasForPlanta(planta) {
  if (String(planta).toUpperCase() === "FEDERAL") {
    return AREAS.filter((area) => area.id === "materia-prima");
  }
  return AREAS;
}
