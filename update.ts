type Versions = {
  game: {
    version: `${number}.${number}${`.${number}` | ""}`;
    stable: boolean;
  }[];
  mappings: {
    gameVersion: string;
    seperator: string;
    build: number;
    maven: string;
    version: string;
    stable: boolean;
  }[];
  intermediary: {
    maven: string;
    version: string;
    stable: boolean;
  }[];
  loader: {
    separator: string;
    build: number;
    maven: string;
    version: string;
    stable: boolean;
  }[];
  installer: {
    url: string;
    maven: string;
    version: string;
    stable: boolean;
  };
};

const NO_VERSION = "NO VERSION FOUND";

const overrides: {
  [key: string]: {
    version?: { [game_version: string]: string };
    strip: string[];
  };
} = JSON.parse(Deno.readTextFileSync("override.json"));

async function get_mod_version(
  mod: string,
  game_version: string,
): Promise<string> {
  const response = await fetch(
    `https://api.modrinth.com/v2/project/${mod}/version?game_versions=["${game_version}"]&loaders=["fabric"]`,
  );
  const versions: { version_number: string }[] = await response.json();
  const override = overrides[mod]?.version?.[game_version];
  if (override) return override;
  if (versions.length > 0) {
    let version = versions[0].version_number;
    for (const strip of overrides[mod]?.strip || []) {
      version = version.replace(strip, "");
    }
    return version;
  } else {
    return NO_VERSION;
  }
}

const versions_fetch = await fetch("https://meta.fabricmc.net/v2/versions/");
const versions = await versions_fetch.json() as Versions;
const minimum_game_version = "1.18";
const mods = Deno.readTextFileSync("mods").trim().split("\n");

const loader = versions.loader[0];

const minimum_index = versions.game.findIndex((game) =>
  game.version == minimum_game_version
);

for (const game of versions.game.slice(0, minimum_index + 1)) {
  if (game.stable) {
    const mappings = versions.mappings.findLast((mapping) =>
      mapping.gameVersion == game.version
    );

    const mod_versions = await Promise.all(
      mods.map(async (mod) =>
        `${mod.replace("-", "_")}=${await get_mod_version(
          mod,
          game.version,
        )}`
      ),
    );

    const properties = `minecraft_version=${game.version}
yarn_mappings=${mappings?.version || NO_VERSION}
loader_version=${loader.version}

# Mods
${mod_versions.join("\n")}
`;
    Deno.writeTextFileSync(`${game.version}.properties`, properties);
  }
}
