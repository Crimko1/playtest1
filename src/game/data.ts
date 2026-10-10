import blackroseAsset from "@/assets/entities/blackrose.png.asset.json";
import akamantoAsset from "@/assets/entities/akamanto.gif.asset.json";
import handAsset from "@/assets/entities/hand.png.asset.json";
import mimicAsset from "@/assets/entities/mimic.png.asset.json";
import stalkerAsset from "@/assets/entities/stalker.png.asset.json";
import { DECOR_PRICES, TOOL_PRICES, ALPHA_DECOR_PRICES } from "./rules";
export type ItemDef = {
  id: string;
  name: string;
  value: number; // scrap money value (0 for tools)
  slots: 1 | 2;
  scrap: boolean;
  img: string;
};

const scrapImages = import.meta.glob<string>("../assets/item-icons/*.png", { eager: true, query: "?url", import: "default" });
const S = (id: string, name: string, value: number, slots: 1 | 2): ItemDef => ({
  id, name, value, slots, scrap: true, img: scrapImages[`../assets/item-icons/${id}.png`] ?? `/items/${id}.png`,
});
const T = (id: string, name: string): ItemDef => ({
  id, name, value: 0, slots: 1, scrap: false, img: scrapImages[`../assets/item-icons/${id}.png`] ?? `/items/${id}.png`,
});

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  [
    S("metal", "Metal", 100, 1),
    S("gear", "Gear", 250, 1),
    S("pillow", "Pillow", 230, 1),
    S("cotton", "Cotton", 70, 1),
    S("energyball", "Energy Ball", 500, 2),
    S("beartoy", "Teddy Bear", 280, 1),
    S("phone", "Broken Phone", 580, 1),
    S("suit", "Hazmat Suit", 1200, 2),
    S("book", "Book", 330, 1),
    S("chess", "Chess Board", 450, 1),
    S("crtv", "Broken CRTV", 690, 2),
    S("trumpet", "Trumbet", 420, 1),
    S("stopsign", "Reversed Stop Sign", 300, 2),
    S("generator", "Power Generator", 740, 2),
    S("teeth", "Teeth", 30, 1),
    S("psb", "PSB Console", 530, 1),
    S("bunny", "Bunny Toy", 160, 1),
    S("brokenflash", "Broken Flashlight", 220, 1),
    S("cola", "Boba Cola", 260, 1),
    S("wetmoney", "Wet Money", 140, 1),
    S("toiletpaper", "Toilet Paper", 190, 1),
    S("slender", "Faceless Toy", 730, 1),
    S("toysword", "Toy Sword", 460, 2),
    S("bigicon", "Big Icon", 560, 2),
    S("dvd", "DVD Player", 480, 1),
    S("camera", "Broken Camera", 600, 1),
    S("diamond", "Diamond", 2000, 1),
    S("energybar", "Energy Bar", 130, 1),
    S("almondwater", "Almond Water", 210, 1),
    S("plantpot", "Plant", 380, 2),
    S("bigteddy", "Big Teddy Bear", 940, 2),
    S("guitar", "Guitar", 1520, 2),
    S("skullmask", "Skull Mask", 450, 1),
    S("chicken", "Chicken Toy", 300, 1),
    S("pickaxe", "Miner Pickaxe", 1230, 2),
    S("mp3", "MP3 Player", 290, 1),
    S("huggy", "Blue Monster Toy", 1040, 1),
    S("soccer", "Soccer Ball", 390, 1),
    S("entitypart", "Entity's Part", 7800, 2),
    S("mushroom", "Mushroom", 310, 1),
    S("cards", "Cards", 410, 1),
    S("almondcan", "Almond Water Can", 140, 1),
    S("camcorder", "Camcorder", 490, 1),
    S("lighttube", "Fluorescent Light Tube", 130, 1),
    S("liquidpain", "Liquid Pain Bottle", 340, 1),
    S("crtmonitor", "CRT Monitor", 1400, 2),
    S("glitchcube", "Glitch Cube", 3000, 2),
    S("stapler", "Stapler", 200, 1),
    S("rotaryphone", "Rotary Phone", 320, 1),
    S("classified", "Classified Folder", 710, 1),
    S("cassette", "Cassette Player", 500, 1),
    S("fakeplant", "Fake Office Plant", 290, 2),
    S("spraycan", "Marking Spray Can", 210, 1),
    S("walkietalkie", "Broken Walkie-Talkie", 730, 1),
    S("mannequinhead", "Mannequin Head", 390, 1),
    S("ruler", "Metal Ruler", 120, 1),
    S("keyboard", "Mechanical Keyboard", 440, 1),
    S("whiteboard", "Whiteboard", 910, 2),
    S("slideprojector", "Slide Projector", 1100, 2),
    S("asynccrate", "Async Supply Crate", 1800, 2),
    S("hazardbarrel", "Hazardous Barrel", 4100, 2),
    S("portablegen", "Portable Generator", 1400, 2),
    T("radar", "Danger Radar"),
    T("knife", "Kitchen Knife"),
    T("tear", "Entity's Tear"),
    T("axe", "Axe"),
    T("pistol", "Pistol"),
    T("health", "Health Pack"),
    T("adrenaline", "Adrenaline Filter"),
    T("navigator", "Navigator"),
    T("flashcharge", "Flashlight Charge"),
    T("papermap", "Paper Map"),
    T("pipe", "Pipe"),
  ].map((i) => [i.id, i]),
);

export const SCRAP_IDS = Object.values(ITEMS).filter((i) => i.scrap).map((i) => i.id);

export const SHOP_TOOLS = [
  { id: "flashcharge", price: TOOL_PRICES.flashcharge, desc: "Refills your flashlight battery to 100%." },
  { id: "axe", price: TOOL_PRICES.axe, desc: "Melee weapon. Kills minions. Breaks after 100 hits." },
  { id: "pistol", price: TOOL_PRICES.pistol, desc: "12-round magazine, auto reload. Breaks after 50 hits." },
  { id: "health", price: TOOL_PRICES.health, desc: "Restores 30% health." },
  { id: "adrenaline", price: TOOL_PRICES.adrenaline, desc: "30 seconds of unlimited sprint, then used up." },
  { id: "navigator", price: 1300, desc: "Shows your coordinates and current room." },
  { id: "pipe", price: TOOL_PRICES.pipe, desc: "Steel melee pipe. Lasts 20 hits." },
  { id: "knife", price: TOOL_PRICES.knife, desc: "Kitchen knife. Melee weapon, lasts 40 hits." },
  { id: "radar", price: 2450, desc: "Hold Right Click to scan for nearby entities and minions in real time." },
  { id: "tear", price: 2680, desc: "Hold Right Click for 3s: fall through the Backrooms and wake in the Laboratory. One use." },
];

export const DECOR = [
  { id: "bed", name: "Classic Bed", price: DECOR_PRICES.bed, size: [2, 0.6, 1.2] as [number, number, number] },
  { id: "holyicon", name: "Holy Icon", price: DECOR_PRICES.holyicon, size: [0.8, 1.1, 0.1] as [number, number, number] },
  { id: "vcrtv", name: "Vintage CRTV", price: DECOR_PRICES.vcrtv, size: [0.8, 0.7, 0.7] as [number, number, number] },
  { id: "balloon", name: "Balloon", price: DECOR_PRICES.balloon, size: [0.5, 1.8, 0.5] as [number, number, number] },
  { id: "fishtank", name: "Fish Tank", price: DECOR_PRICES.fishtank, size: [1.8, 1.65, .85] as [number, number, number] },
  { id: "painting", name: "Painting", price: DECOR_PRICES.painting, size: [1.3, .95, .12] as [number, number, number] },
  { id: "cross", name: "Cross", price: DECOR_PRICES.cross, size: [.38, .62, .09] as [number, number, number] },
  { id: "storagebox", name: "Storage Box", price: DECOR_PRICES.storagebox, size: [1.2, .72, .7] as [number, number, number] },
  { id: "plant", name: "Plant", price: DECOR_PRICES.plant, size: [.85, 1.85, .85] as [number, number, number] },
  { id: "custompaint", name: "Custom Paint", price: DECOR_PRICES.custompaint, size: [1.4, 1.1, .13] as [number, number, number] },
  { id: "stalkdevice", name: "Stalk Device", price: DECOR_PRICES.stalkdevice, size: [.8, .62, .45] as [number, number, number] },
  { id: "bigbunny", name: "Big Bunny", price: DECOR_PRICES.bigbunny, size: [1.1, 1.3, 1] as [number, number, number] },
  { id: "chessboard", name: "Chess Board", price: DECOR_PRICES.chessboard, size: [.8, .85, .8] as [number, number, number] },
  { id: "wallclock", name: "Wall Clock", price: DECOR_PRICES.wallclock, size: [.7, 1.5, .25] as [number, number, number] },
  { id: "scrapdisplay", name: "Scrap Display", price: DECOR_PRICES.scrapdisplay, size: [.8, 1.4, .8] as [number, number, number] },
  ...Object.entries(ALPHA_DECOR_PRICES).map(([id, price]) => ({ id, price, name: ({lightstand:"Light Stand",booktable:"Book Table",uppercamera:"Upper Camera",walltelephone:"Wall Telephone",jukebox:"Jukebox",candles:"Candles",blueprint:"Blueprint Machine",psbconsole:"PSB Console",projector:"Video Projector"} as Record<string,string>)[id], size: ({lightstand:[.65,1.8,.65],booktable:[1,.7,.7],uppercamera:[.8,.7,.4],walltelephone:[.45,.7,.22],jukebox:[.95,1.7,.6],candles:[.65,.95,.65],blueprint:[1.4,1.6,.9],psbconsole:[1.1,1.2,.7],projector:[.65,1.2,.65]} as Record<string,[number,number,number]>)[id] })),
];
export const WALL_DECOR = new Set(["painting", "cross", "custompaint", "stalkdevice", "wallclock", "walltelephone"]);

export const OUTFITS = [
  {id:"classic",name:"Classic Hazard Suit",price:0,color:"#c9a227"},
  {id:"olive",name:"Olive Camouflage",price:1500,color:"#56653a"},
  {id:"pinkcat",name:"Pink Cat",price:1500,color:"#e28da8"},
  {id:"ash",name:"Grey Knight",price:1500,color:"#7f8588"},
  {id:"white",name:"White Angel",price:1500,color:"#ebe9db"},
  {id:"diver",name:"Poolroom Suit",price:1500,color:"#59a7ac"},
  {id:"office",name:"Office Suit",price:1500,color:"#636372"},
  {id:"agent0",name:"Agent 0",price:1500,color:"#202933"},
  {id:"gears",name:"Robotic Gears",price:1500,color:"#899797"},
  {id:"security",name:"Pink Security",price:1500,color:"#bb647f"},
  {id:"firefighter",name:"Red Firefighter",price:1500,color:"#ba302a"},
  {id:"blackbunny",name:"Black Bunny",price:1500,color:"#29262e"},
  {id:"blocky",name:"Cube Miner",price:1500,color:"#39a6a1"},
  {id:"flesh",name:"Entitie's Flesh",price:1500,color:"#914a4c"},
  {id:"olympus",name:"Olympus Destroyer",price:1500,color:"#c9b5a4"},
  {id:"king",name:"Black Chess King",price:1500,color:"#34333c"},
  {id:"queen",name:"White Chess Queen",price:1500,color:"#e1ded0"},
  {id:"bathroom",name:"After Bathroom",price:1500,color:"#bacaca"},
  {id:"void",name:"Void",price:1500,color:"#222536"},
  {id:"animatronic",name:"Orange Animatronic",price:1500,color:"#c57734"},
  {id:"playtime",name:"Playtime",price:1500,color:"#dbb434"},
];

export type TreeId = "survivor" | "scavenger" | "carrier";
export const TREES: Record<TreeId, { name: string; blurb: string; stats: [string, number][]; skills: string[] }> = {
  survivor: {
    name: "Survivor",
    blurb: "Stay alive longer. Built for outrunning entities and tanking minions.",
    stats: [["Health", 90], ["Stamina", 80], ["Carry", 30], ["Loot sense", 30]],
    skills: [
      "+10 Max Health", "+10% Stamina", "-10% Minion damage", "+10 Max Health", "+15% Stamina regen",
      "+5% Sprint speed", "-15% Minion damage", "+20 Max Health", "+10% Sprint speed", "Second Wind: survive one lethal minion hit / run",
    ],
  },
  scavenger: {
    name: "Scavenger",
    blurb: "Find more, earn more. Scrap pings and better extractor payouts.",
    stats: [["Health", 40], ["Stamina", 50], ["Carry", 40], ["Loot sense", 95]],
    skills: [
      "Scrap glows within 6m", "+5% Extractor payout", "Scrap glows within 10m", "+5% Extractor payout", "+20% Flashlight battery",
      "+10% Extractor payout", "Scrap glows within 15m", "+30% Flashlight battery", "+10% Extractor payout", "Sixth Sense: hear entities through walls",
    ],
  },
  carrier: {
    name: "Carrier",
    blurb: "Haul everything. No slowdown from heavy scrap, bigger hands.",
    stats: [["Health", 60], ["Stamina", 60], ["Carry", 95], ["Loot sense", 40]],
    skills: [
      "-10% Heavy slowdown", "+5% Walk speed", "-20% Heavy slowdown", "+10% Stamina", "-30% Heavy slowdown",
      "+5% Walk speed", "+1 inventory slot", "No heavy slowdown", "+10% Walk speed", "Pack Mule: +1 inventory slot",
    ],
  },
};

export type EntityId = "uncanny" | "thirsty" | "not" | "unknown" | "maka" | "blackrose" | "akamanto" | "hand" | "mimic" | "stalker";
export const ENTITIES: Record<EntityId, { name: string; danger: 1 | 2 | 3; img: string; appearance: string; behaviour: string; details: string }> = {
  stalker: { name: "Stalker", danger: 1, img: stalkerAsset.url, appearance: "A tall, silent shadow watching distant dark doorways.", behaviour: "Stares silently. Watching it continuously for more than four seconds makes it rush through you.", details: "It cannot hurt you, but terror darkens your vision and slows you for five seconds. Ignore it and it disappears after 10–20 seconds." },
  uncanny: {
    name: "Uncanny", danger: 3, img: "/img/uncanny.png",
    appearance: "A tall, pale face with a stretched, too-wide grin and black unblinking eyes that slides across the floor.",
    behaviour: "Patrols room to room through the corridors. If you are in front of it and it sees you, it chases you for 10 seconds.",
    details: "Survive the chase and it fades away, only to appear somewhere else.",
  },
  thirsty: {
    name: "Thirsty", danger: 2, img: "/img/thirsty.png",
    appearance: "A charred, burning face with hollow sunken eyes and a cracked, gaping dry mouth.",
    behaviour: "Patrols only between dark rooms, reappearing in another dark room after each patrol. Sees you in the dark and chases for 10 seconds — but never into a lit room.",
    details: "Break line of sight or outlast it and it relocates.",
  },
  not: {
    name: "Not", danger: 3, img: "/img/not.png",
    appearance: "A pale shape that only exists in the dark.",
    behaviour: "Sometimes appears right in front of your face in dark rooms. Keep your flashlight on its face for 4 seconds within 10 seconds, or it rushes you extremely fast.",
    details: "Its rush kills instantly. Light is the only defence.",
  },
  unknown: {
    name: "Unknown Man", danger: 2, img: "/img/unknown.png",
    appearance: "A face peeking from behind a wall corner.",
    behaviour: "Harmless but stubborn. He appears in a doorway of your room and blocks your path for a while.",
    details: "He can't hurt you. Find another way around or wait for him to leave.",
  },
  maka: {
    name: "Maka", danger: 3, img: "/img/maka.png",
    appearance: "A tall, thin woman with a porcelain painted face, long black hair and a fixed red-lipped smile.",
    behaviour: "Walks the halls. When she sees you, every light in the Backrooms dies and she chases you for 12 seconds.",
    details: "Survive 12 seconds and she disappears. Each extinguished room relights after 60 seconds.",
  },
  blackrose: { name: "Black Rose", danger: 3, img: blackroseAsset.url, appearance: "A hollow-eyed monochrome face with an open mouth.", behaviour: "Has a 30% chance to appear when battery is below 30%. Turn your back and run for 15 seconds.", details: "She flickers your flashlight dark blue and may appear ahead at a distance. Reverse direction immediately. The light recovers when she disappears." },
  akamanto: { name: "Akamanto", danger: 3, img: akamantoAsset.url, appearance: "A red-robed figure with a pale, animated face.", behaviour: "Patrols the corridors and charges when she sees you. Escape through five different rooms.", details: "After losing you, she resumes patrol and cannot chase for 10 seconds." },
  hand: { name: "Some Hand", danger: 1, img: handAsset.url, appearance: "A grey hand reaching through the corridors.", behaviour: "Patrols slowly and speeds up when it sees you. Break its line of sight to escape.", details: "It does not hurt you. It steals one item, runs away and drops it in a distant room." },
  mimic: { name: "Mimic", danger: 3, img: mimicAsset.url, appearance: "A wandering player whose identity and outfit change hourly.", behaviour: "Approach too closely and it reveals its true face, chasing for 13 seconds.", details: "When its chase ends it resumes its disguise. Its name, face and level 2–5 are fabricated." },
};

export const VERSION = "Alpha 0.2";
