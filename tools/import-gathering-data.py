"""Build the checked-in MH3 gathering snapshot from the cited community tables.

The app consumes src/gathering-catalog.json offline. This maintainer utility
downloads the source pages only when explicitly run; normal app builds never
need network access.
"""

from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src" / "gathering-catalog.json"

MAPS = [
    ("moga-woods", "Bosque de Moga", "Moga Woods", "74", "free-roam"),
    ("deserted-island", "Isla Desierta", "Deserted Island", "92", "quest-map"),
    ("sandy-plains", "Llanos Arenosos", "Sandy Plains", "93", "quest-map"),
    ("flooded-forest", "Bosque Inundado", "Flooded Forest", "94", "quest-map"),
    ("volcano", "Volcán", "Volcano", "95", "quest-map"),
    ("tundra", "Tundra", "Tundra", "96", "quest-map"),
]

ITEM_NAMES = {
    "いにしえの龍骨": "Dragonbone Relic", "げどく草": "Antidote Herb", "さびた塊": "Rustshard",
    "なぞのお守り": "Mystery Charm", "なぞの頭骨": "Unknown Skull", "なぞの骨": "Mystery Bone",
    "にが虫": "Bitterbug", "のりこねバッタ": "Gluehopper", "はじけイワシ": "Popfish",
    "アオキノコ": "Blue Mushroom", "イキツギ藻": "Airweed", "カクサンの実": "Bomberry",
    "カクサンデメキン": "Scatterfish", "カブレライト鉱石": "Carbalite Ore", "カラの実": "Huskberry",
    "カラ骨【大】": "Bone Husk L", "カラ骨【小】": "Bone Husk S", "キラビートル": "Killer Beetle",
    "キレアジ": "Whetfish", "クモの巣": "Spider Web", "サシミウオ": "Sushifish",
    "サボテンの花": "Cactus Flower", "シーブライト鉱石": "Pelagicite Ore", "ツタの葉": "Ivy",
    "デプスライト鉱石": "Bathycite Ore", "ドスヘラクレス": "Hercudrome", "ドラグライト鉱石": "Dragonite Ore",
    "ニトロダケ": "Nitroshroom", "ネンチャク草": "Sap Plant", "ハリの実": "Needleberry",
    "ハリマグロ": "Pin Tuna", "ハレツアロワナ": "Burst Arowana", "バクレツアロワナ": "Bomb Arowana",
    "ベニサンゴ石": "Red Coral Stone", "ペイントの実": "Paintberry", "マカライト鉱石": "Machalite Ore",
    "マタタビ": "Felvine", "マレコガネ": "Rare Scarab", "ロイヤルカブト": "Royal Rhino",
    "上鎧玉": "Armor Sphere+", "不死虫": "Godbug", "修羅原珠": "Bloodrun Jewel",
    "光るお守り": "Shining Charm", "光蟲": "Flashbug", "厳選キノコ": "Choice Mushroom",
    "古びたお守り": "Timeworn Charm", "堅鎧玉": "Hrd Armor Sphere", "大地の結晶": "Earth Crystal",
    "大食いマグロ": "Glutton Tuna", "太古の塊": "Ancient Shard", "小金魚": "Small Goldenfish",
    "尖鎧玉": "Adv Armor Sphere", "忍耐の種": "Adamant Seed", "怪力の種": "Might Seed",
    "怪力藻": "Mightweed", "棍棒の骨": "Club Bone", "棒状のほね": "Bone", "棒状の骨": "Bone",
    "欠けた貝殻": "Broken Shell", "水光原珠": "Aquaglow Jewel", "水守の種": "Waterblock Seed",
    "氷結晶": "Ice Crystal", "火消しの実": "Firedouse Berry", "火薬草": "Fire Herb",
    "特産キノコ": "Unique Mushroom", "特選キノコ": "Special Mushroom", "獄炎石": "Firecell Stone",
    "眠魚": "Sleepyfish", "石ころ": "Stone", "砥石": "Whetstone", "竜骨【中】": "Monster Bone M",
    "竜骨【小】": "Monster Bone S", "竜骨結晶": "Crystal Bone", "紅蓮石": "Firestone",
    "薬草": "Herb", "虫の屍骸": "Insect Husk", "虫の死骸": "Insect Husk", "釣りカエル": "Frog",
    "釣りバッタ": "Cricket", "釣りホタル": "Firefly", "釣りミミズ": "Worm", "鉄鉱石": "Iron Ore",
    "錆びた塊": "Rustshard", "鎧玉": "Armor Sphere", "陽翔原珠": "Sunspire Jewel",
    "雷光虫": "Thunderbug", "雷静の種": "Stormsender Seed", "黄金骨": "Golden Bone",
    "龍殺しの実": "Dragonfell Berry", "たいまつ": "Torch", "ハチミツ": "Honey",
    "ツチハチノコ": "Snakebee Larva", "珍味・甲冑魚": "Armorfish Morsel", "ドキドキノコ": "Exciteshroom",
    "モンスターのフン": "Dung", "龍骨のかたまり": "Dragonbone Piece", "化石のかたまり": "Fossil Piece",
    "奇妙な卵": "Odd Egg", "アワビのかたまり": "Abalone Piece", "大幻魚イッカク": "Mystic Narwhal",
}

MAIN_TYPES = {
    "草・実": "Plantas y bayas", "草": "Plantas y bayas", "キノコ": "Hongos", "鉱石": "Minería",
    "採掘": "Minería", "虫": "Insectos", "釣り": "Pesca", "骨": "Huesos", "白い土": "Suelo especial",
}
MOGA_TYPES = {"採取": "Recolección", "採掘": "Minería", "虫あみ": "Red para insectos", "釣り": "Pesca"}


class PageParser(HTMLParser):
    """Capture table rows while retaining lower/upper-rank section context."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables = []
        self.table = None
        self.row = None
        self.cell = None
        self.heading = ""
        self.in_h3 = False
        self.rank = "Low"

    def handle_starttag(self, tag, attrs):
        if tag == "h3":
            self.in_h3 = True
            self.heading = ""
        elif tag == "table":
            self.table = {"rank": self.rank, "rows": []}
            self.tables.append(self.table)
        elif tag == "tr" and self.table is not None:
            self.row = []
            self.table["rows"].append(self.row)
        elif tag in ("td", "th") and self.row is not None:
            self.cell = []
            self.row.append(self.cell)
        elif tag == "br" and self.cell is not None:
            self.cell.append(" ")

    def handle_endtag(self, tag):
        if tag == "h3":
            self.in_h3 = False
            if "上位" in self.heading:
                self.rank = "High"
            elif "下位" in self.heading:
                self.rank = "Low"
        elif tag in ("td", "th"):
            self.cell = None
        elif tag == "tr":
            self.row = None
        elif tag == "table":
            self.table = None

    def handle_data(self, data):
        if self.in_h3:
            self.heading += data
        if self.cell is not None:
            self.cell.append(data)


def fetch_page(page):
    url = f"https://game.daihouko.com/mh/3/{page}.html"
    request = Request(url, headers={"User-Agent": "MH3-Progress-Analyzer data catalog/0.6"})
    with urlopen(request, timeout=20) as response:
        return response.read().decode("utf-8")


def normalized_cells(row):
    return [" ".join(parts).strip() for parts in row]


def split_items(raw):
    notes = []
    def strip_note(match):
        notes.append(match.group(0).strip("()（） "))
        return " "
    raw = re.sub(r"（[^）]*）|\([^)]*\)", strip_note, raw)
    if "砥石上位" in raw:
        notes.append("La guía resume los resultados de rango alto/zona secreta sin enumerarlos.")
        return ["砥石", "太古の塊"], notes
    return [token for token in re.split(r"[、,，\s]+", raw) if token], notes


def item_record(source_name, item_ids):
    name = ITEM_NAMES.get(source_name, source_name)
    result = {"name": name}
    item_id = item_ids.get(name.casefold())
    if item_id is not None:
        result["itemId"] = item_id
    if name == source_name:
        result["sourceName"] = source_name
    return result


def area_name(raw):
    raw = raw.strip()
    if raw in ("ｷｬﾝﾌﾟ", "キャンプ", "ベースキャンプ"):
        return "Campamento"
    number = re.search(r"\d+", raw)
    return f"Área {number.group(0)}" if number else raw


def parse_quest_map(page, map_id, label, source_name, item_ids):
    parser = PageParser()
    parser.feed(fetch_page(page))
    nodes = []
    area = ""
    for table in parser.tables:
        for row in table["rows"]:
            cells = normalized_cells(row)
            if len(cells) < 3 or cells[0] == "エリア" or cells[1] == "種別":
                continue
            if cells[0]:
                area = cells[0]
            source_type = cells[1]
            base_type = re.sub(r"\*\d+$", "", source_type).strip()
            node_type = MAIN_TYPES.get(base_type)
            if not node_type:
                continue
            source_items, notes = split_items(cells[2])
            nodes.append({
                "area": area_name(area),
                "rank": table["rank"],
                "type": node_type,
                "sourceType": source_type,
                "pointCount": int(re.search(r"\*(\d+)$", source_type).group(1)) if re.search(r"\*(\d+)$", source_type) else 1,
                "items": [item_record(source, item_ids) for source in source_items],
                **({"note": " · ".join(notes)} if notes else {}),
            })
    if not nodes:
        raise RuntimeError(f"No se reconocieron nodos de recolección en la página {page}.")
    return {"id": map_id, "name": label, "sourceName": source_name, "kind": "quest-map",
            "sourceUrl": f"https://game.daihouko.com/mh/3/{page}.html", "nodes": nodes}


def parse_moga(page, item_ids):
    parser = PageParser()
    parser.feed(fetch_page(page))
    nodes = []
    area = ""
    for table in parser.tables:
        for row in table["rows"]:
            cells = normalized_cells(row)
            if len(cells) < 3 or cells[0] == "エリア":
                continue
            if len(cells) >= 4:
                area = cells[0] or area
                source_type, raw_items, amount = cells[1:4]
            else:
                source_type, raw_items, amount = cells[0:3]
            node_type = MOGA_TYPES.get(source_type)
            if not node_type:
                continue
            source_items, notes = split_items(raw_items)
            range_match = re.fullmatch(r"(\d+)～(\d+)", amount)
            fixed_match = re.fullmatch(r"\d+", amount)
            quantity = ({"min": int(range_match.group(1)), "max": int(range_match.group(2))} if range_match
                        else {"min": int(fixed_match.group(0)), "max": int(fixed_match.group(0))} if fixed_match
                        else {"infinite": True} if amount == "∞" else {})
            nodes.append({
                "area": area_name(area), "rank": "Free roam", "type": node_type, "sourceType": source_type,
                "pointCount": 1, "quantity": quantity,
                "items": [item_record(source, item_ids) for source in source_items],
                **({"note": " · ".join(notes)} if notes else {}),
            })
    if not nodes:
        raise RuntimeError("No se reconocieron nodos de recolección del Bosque de Moga.")
    return {"id": "moga-woods", "name": "Bosque de Moga", "sourceName": "Moga Woods", "kind": "free-roam",
            "sourceUrl": f"https://game.daihouko.com/mh/3/{page}.html", "nodes": nodes}


def main():
    catalog = json.loads((ROOT / "src" / "data-catalog.json").read_text(encoding="utf-8"))
    item_ids = {item["name"].casefold(): item["id"] for item in catalog["items"]}
    maps = [parse_moga(*MAPS[0][3:4], item_ids)]
    for map_id, label, source_name, page, _kind in MAPS[1:]:
        maps.append(parse_quest_map(page, map_id, label, source_name, item_ids))
    output = {
        "sources": [
            {"name": "GAME大宝庫 · guía MH3 (tablas de puntos y áreas)", "url": "https://game.daihouko.com/mh/3/",
             "note": "Tablas comunitarias para Monster Hunter 3 (Wii); áreas, tipos de punto y materiales."},
            {"name": "Monster Hunter Wiki · MH3 Item List (nombres en inglés)",
             "url": "https://monsterhunter.fandom.com/wiki/MH3:_Item_List",
             "note": "Referencia para asociar nombres japoneses con nombres ingleses del juego."},
        ],
        "limitations": [
            "El catálogo muestra materiales posibles por punto, no porcentajes de obtención.",
            "La fuente identifica el área y tipo de punto, pero no coordenadas dentro del área.",
            "Las zonas de misiones se separan por rango bajo y alto; el Bosque de Moga usa su tabla de modo libre.",
            "Los resultados proceden de una guía comunitaria y pueden contener omisiones o errores.",
        ],
        "maps": maps,
    }
    item_count = sum(len(node["items"]) for map_entry in maps for node in map_entry["nodes"])
    if item_count == 0:
        raise RuntimeError("El importador no obtuvo resultados de objetos; se cancela la escritura.")
    expected_nodes = {"moga-woods": 63, "deserted-island": 27, "sandy-plains": 22, "flooded-forest": 23, "volcano": 21, "tundra": 15}
    minimum_results = {"moga-woods": 200, "deserted-island": 45, "sandy-plains": 42,
                       "flooded-forest": 45, "volcano": 65, "tundra": 38}
    for map_entry in maps:
        expected = expected_nodes.get(map_entry["id"])
        if expected is not None and len(map_entry["nodes"]) != expected:
            raise RuntimeError(f"Cobertura incompleta en {map_entry['name']}: {len(map_entry['nodes'])}/{expected} puntos; no se sobrescribió el catálogo.")
        minimum = minimum_results.get(map_entry["id"], 0)
        results = sum(len(node["items"]) for node in map_entry["nodes"])
        if results < minimum:
            raise RuntimeError(f"Resultados incompletos en {map_entry['name']}: {results}/{minimum} mínimo; no se sobrescribió el catálogo.")
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    unknown = sorted({entry["sourceName"] for map_entry in maps for node in map_entry["nodes"]
                      for entry in node["items"] if "sourceName" in entry})
    print(f"Catálogo de recolección generado: {len(maps)} mapas, "
          f"{sum(len(entry['nodes']) for entry in maps)} puntos y {item_count} resultados.")
    if unknown:
        print("Nombres sin cruce al catálogo base (se muestran como referencia): " + ", ".join(unknown))


if __name__ == "__main__":
    main()
