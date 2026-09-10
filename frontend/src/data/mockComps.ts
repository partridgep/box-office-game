export type MovieComp = {
  title: string;
  domesticOpening: number;
  genre: string;
  poster?: string;
  reason: string;
};

export function getMockComps(genre: string): MovieComp[] {
  const genreLower = genre.toLowerCase();

  const allComps: MovieComp[] = [
    {
      title: "Dune: Part Two",
      domesticOpening: 82.5,
      genre: "Sci-Fi",
      reason: "Event sci-fi sequel with strong pre-release buzz",
    },
    {
      title: "Inside Out 2",
      domesticOpening: 154.2,
      genre: "Animation",
      reason: "Family animation sequel with broad appeal",
    },
    {
      title: "Deadpool & Wolverine",
      domesticOpening: 211.4,
      genre: "Action",
      reason: "Marvel franchise entry with R-rated edge",
    },
    {
      title: "Twisters",
      domesticOpening: 81.2,
      genre: "Action",
      reason: "Mid-budget disaster spectacle reboot",
    },
    {
      title: "Wicked",
      domesticOpening: 112.5,
      genre: "Musical",
      reason: "Broadway adaptation with holiday release",
    },
    {
      title: "Moana 2",
      domesticOpening: 139.8,
      genre: "Animation",
      reason: "Disney animation sequel",
    },
  ];

  const matched = allComps.filter(
    (c) =>
      genreLower.includes(c.genre.toLowerCase()) ||
      c.genre.toLowerCase().includes(genreLower.split(",")[0]?.trim() ?? "")
  );

  return (matched.length >= 2 ? matched : allComps).slice(0, 4);
}

export function compsToMarkers(comps: MovieComp[]) {
  return comps.map((c) => ({
    label: c.title.split(":")[0].split(" ")[0],
    value: c.domesticOpening,
  }));
}
