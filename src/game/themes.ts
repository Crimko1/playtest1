import type { Wallpaper, Floor } from "./textures";

export type Layout = "open" | "L" | "T" | "maze" | "chambers" | "winding" | "courtyard" | "pillars";
export type Feature = "none" | "lake" | "pool" | "fountain";
export type ThemeKind =
  | "desk" | "chair" | "cabinet" | "cooler" | "plant" | "shelf" | "crate" | "barrel" | "bed" | "wardrobe"
  | "nightstand" | "pillar" | "bench" | "table" | "sofa" | "tvstand" | "schooldesk" | "pipes" | "boiler"
  | "arcade" | "vending" | "stall" | "sink" | "mattress" | "lockers" | "piano" | "clock" | "mannequin"
  | "tree" | "rock" | "counter" | "lamp" | "bunk" | "servers" | "cart";
export type Theme = { name: string; layout: Layout; props: ThemeKind[]; walls: Wallpaper[]; floors: Floor[]; density: [number, number]; feature: Feature; ceil: [number, number]; dark?: number };

// name | layout | props | walls | floors | density | feature | ceiling | darkness bias
const RAW = `
Office Cubicles|chambers|desk,chair,cabinet,cooler|classic,stripes|carpet|4,8|none|2.7,3.2
Open Plan Office|open|desk,desk,chair,plant,cooler|plain,classic|carpet2|5,9|none|2.8,3.4
Records Archive|maze|shelf,cabinet,cabinet,crate|concrete,plain|linoleum|5,9|none|2.6,3
Storage Depot|winding|shelf,crate,crate,barrel,cart|concrete|concrete|4,9|none|3,4.2
Child Bedroom|L|bed,nightstand,wardrobe,clock|damask,green|wood|3,5|none|2.6,3
Motel Room|L|bed,nightstand,tvstand,sink|red,damask|carpet2|3,5|none|2.5,2.8
Pillar Hall|pillars|pillar|classic,diamond|carpet|5,9|none|4.5,6.5
Poolrooms|courtyard|bench,plant|tile|poolTile|1,3|pool|3.2,4.5
Deep Poolrooms|winding|bench|tile|poolTile|0,2|pool|3,4
Dining Hall|open|table,chair,chair,chair|damask,panel|wood|5,9|none|3,3.6
Diner|L|counter,table,chair,chair,vending|red,tile|checker|4,7|none|2.8,3.2
Lounge|L|sofa,tvstand,table,plant,piano|panel,green|carpet2|3,6|none|2.7,3.2
Classroom|open|schooldesk,schooldesk,schooldesk,chair,lockers|school|linoleum|6,12|none|2.9,3.2
School Corridor|winding|lockers,lockers,bench,cooler|school,tile|linoleum|4,8|none|2.8,3.1
School Gym|open|bench,crate,lockers|wood,concrete|wood|2,4|none|5,6.5
School Library|maze|shelf,shelf,table,chair|panel,wood|carpet|5,9|none|3,3.6
Science Lab|chambers|counter,sink,cabinet,schooldesk|tile,school|tile|4,8|none|2.8,3.1
Music Room|L|piano,chair,chair,shelf|wood,panel|wood|3,6|none|3,3.4
Art Room|open|table,chair,shelf,sink|plain,school|linoleum|4,7|none|2.9,3.2
Cafeteria|open|table,table,bench,vending,counter|tile,school|checker|5,9|none|3,3.5
Principal Office|T|desk,chair,cabinet,clock,plant|panel,wood|carpet2|3,5|none|2.7,3
Empty Hall|open|chair,crate|classic,stripes,diamond|carpet|0,1|none|2.7,3.5
Utility Tunnels|winding|pipes,boiler,crate,barrel|concrete,metal|concrete|3,6|none|2.6,3.2|0.3
Boiler Room|T|boiler,boiler,pipes,barrel|metal,brick|concrete|3,6|none|3.4,4.2|0.3
Arcade|L|arcade,arcade,vending,bench|red,panel|carpet2|4,7|none|2.8,3.2
Restroom|chambers|stall,stall,sink,sink|tile|tile|3,6|none|2.6,2.9
Showroom|open|mannequin,mannequin,wardrobe,clock|plain,damask|wood|3,7|none|3,3.6
Locker Room|maze|lockers,bench,lockers|tile,concrete|tile|3,6|none|2.7,3
Pine Forest|courtyard|tree,tree,tree,rock|hedge|grass|7,12|lake|5,7
Birch Grove|open|tree,tree,rock,bench|hedge|grass|6,10|none|5,7
Forest Lake|open|tree,tree,rock|hedge,rock|dirt|5,9|lake|5,7
Misty Marsh|winding|tree,rock,rock|hedge|dirt|4,7|lake|4,6|0.3
Hedge Maze|maze|plant,bench|hedge|grass|1,3|none|4,6
Garden Atrium|courtyard|plant,plant,bench,tree|plain,hedge|grass|4,7|fountain|5,7
Greenhouse|chambers|plant,plant,counter,tree|metal,plain|dirt|5,9|none|4,5
Rock Cavern|winding|rock,rock,barrel|rock|dirt|4,8|lake|3.5,5|0.4
Beach Cove|open|rock,bench,tree|plain,rock|sand|2,5|lake|5,7
Sand Dunes Hall|open|rock|plain|sand|1,3|none|5,7
Hospital Ward|chambers|bed,nightstand,cabinet,sink|tile,school|linoleum|4,8|none|2.8,3.1
Morgue|maze|counter,cabinet,lamp|tile,metal|tile|3,6|none|2.6,2.9|0.4
Waiting Room|open|chair,chair,chair,plant,cooler|plain,stripes|carpet|6,10|none|2.7,3
Dentist Office|L|chair,counter,sink,cabinet|tile,plain|linoleum|3,6|none|2.6,2.9
Server Farm|maze|servers,servers,servers,cabinet|metal|metal|6,10|none|3,3.4|0.2
Control Room|T|desk,servers,chair,clock|metal,panel|linoleum|4,7|none|2.8,3.2
Parking Garage|pillars|pillar,barrel,cart|concrete|concrete|4,8|none|2.6,3|0.3
Loading Dock|open|crate,crate,cart,barrel|metal,concrete|concrete|4,8|none|4,5.5
Warehouse Aisles|maze|shelf,shelf,crate,cart|metal,concrete|concrete|6,10|none|4.5,6
Supermarket|maze|shelf,shelf,counter,cart,cooler|plain,tile|tile|6,10|none|3.2,4
Shopping Mall|courtyard|bench,plant,mannequin,vending|plain,tile|tile|4,8|fountain|4,6
Food Court|open|table,chair,chair,counter,vending|tile,red|checker|6,10|none|3.5,4.5
Cinema Lobby|L|counter,bench,arcade,vending|red,damask|carpet2|3,6|none|3.2,4
Theatre Stage|T|chair,chair,chair,piano,mannequin|red,panel|wood|6,10|none|4,5.5
Bowling Alley|open|bench,counter,arcade|panel,red|wood|3,5|none|3,3.4
Laundromat|L|cabinet,cabinet,cabinet,bench,sink|tile,plain|checker|5,8|none|2.6,3
Kitchen|chambers|counter,counter,sink,cabinet,table|tile|checker|4,7|none|2.7,3
Bakery|L|counter,shelf,table,chair|brick,plain|tile|3,6|none|2.8,3.2
Wine Cellar|maze|barrel,barrel,shelf,crate|brick|concrete|5,9|none|2.4,2.8|0.4
Attic|winding|crate,mattress,clock,mannequin,wardrobe|wood|wood|4,7|none|2.3,2.7|0.3
Basement|chambers|boiler,crate,shelf,barrel|concrete,brick|concrete|4,7|none|2.4,2.8|0.4
Dormitory|chambers|bunk,bunk,lockers,nightstand|plain,school|linoleum|4,8|none|2.7,3
Hotel Corridor|winding|bench,plant,clock|damask,red|carpet2|2,4|none|2.6,2.9
Hotel Lobby|courtyard|sofa,plant,counter,clock|damask,panel|checker|4,7|fountain|4,5.5
Ballroom|pillars|pillar,table,chair,piano|damask,diamond|wood|4,8|none|5,6.5
Church Nave|pillars|pillar,bench,bench,bench|plain,brick|tile|5,9|none|5,7
Chapel|T|bench,bench,clock,lamp|plain,panel|wood|3,6|none|4,5
Museum Gallery|chambers|mannequin,bench,pillar|plain,diamond|wood|3,6|none|4,5
Toy Store|L|shelf,shelf,crate,arcade|green,red|linoleum|4,7|none|2.8,3.2
Daycare|open|schooldesk,schooldesk,mattress,shelf|green,school|linoleum|4,8|none|2.7,3
Playroom Pit|courtyard|crate,mattress,bench|red,green|carpet2|3,5|pool|2.8,3.2
Bunker|maze|bunk,crate,barrel,cabinet|concrete,metal|concrete|4,8|none|2.4,2.7|0.4
Train Platform|open|bench,bench,pillar,vending|tile,concrete|concrete|3,6|none|3.5,4.5
Subway Tunnel|winding|pipes,barrel,crate|brick,concrete|concrete|2,4|none|3,3.8|0.5
Airport Gate|open|chair,chair,chair,counter,vending|plain,metal|carpet|7,12|none|3.4,4.5
Bus Station|L|bench,vending,clock,cooler|tile,plain|linoleum|3,6|none|3,3.6
Radio Station|chambers|desk,servers,chair,cabinet|panel,wood|carpet|4,7|none|2.7,3
Newsroom|open|desk,desk,chair,chair,cabinet|stripes,plain|carpet2|6,10|none|2.8,3.2
Call Center|maze|desk,chair,desk,chair|classic,plain|carpet|6,12|none|2.7,3
Conference Room|T|table,chair,chair,chair,clock|panel,classic|carpet|5,8|none|2.8,3.1
Furniture Store|maze|sofa,bed,wardrobe,table|plain|wood|4,8|none|3,3.6
Mannequin Gallery|pillars|mannequin,mannequin,mannequin,pillar|plain,red|tile|5,9|none|3,4|0.2
Clock Repair Shop|L|clock,clock,counter,shelf|wood,panel|wood|4,7|none|2.7,3
Piano Hall|pillars|piano,piano,pillar,chair|damask,panel|wood|3,6|none|4,5.5
Sauna Rooms|chambers|bench,bench,barrel|wood|wood|2,4|pool|2.5,2.8
Bathhouse|courtyard|bench,plant,sink|tile|poolTile|2,4|pool|3.5,4.5
Waterpark Slide Hall|open|bench,pillar|tile,school|poolTile|2,4|pool|5,7
Flooded Office|chambers|desk,chair,cabinet|classic,stripes|carpet2|3,6|lake|2.7,3.2|0.3
Flooded Corridor|winding|chair,crate|classic,plain|carpet|1,3|lake|2.6,3|0.3
Abandoned Factory|pillars|pillar,boiler,crate,cart|brick,metal|concrete|4,8|none|5,7|0.3
Assembly Line|T|counter,counter,servers,cart|metal|metal|5,9|none|3.6,4.5
Junkyard Hall|winding|crate,barrel,rock,cart|metal,rock|dirt|5,9|none|4,6|0.3
Fun Zone|courtyard|arcade,bench,crate|red,green|checker|3,6|pool|3,4
Birthday Party Room|open|table,chair,chair,arcade|red,green|carpet2|4,8|none|2.7,3
Escape Room|maze|cabinet,clock,mannequin,crate|panel,brick|wood|3,6|none|2.5,2.8|0.3
Backstage Corridors|winding|mannequin,wardrobe,crate|panel,plain|wood|3,6|none|3,3.6
Endless Stairwell Lobby|T|bench,cooler,lamp|concrete,plain|concrete|2,4|none|4,6|0.2
Red Rooms|L|sofa,lamp,clock|red|carpet2|2,4|none|2.6,2.9|0.3
Green Rooms|chambers|plant,sofa,lamp|green|carpet|2,5|none|2.6,3
Lights Out Wing|maze|chair,crate|plain,classic|carpet|1,3|none|2.6,3|0.9
Midnight Offices|chambers|desk,chair,lamp|classic|carpet|3,6|none|2.7,3|0.8
Candle Cellar|winding|barrel,lamp,crate|brick,rock|dirt|3,5|none|2.4,2.8|0.6
Observatory Dome|courtyard|bench,pillar,lamp|metal,plain|tile|2,4|fountain|6,7.5
Snow Lodge|L|sofa,table,lamp,wardrobe|wood|wood|3,6|none|3,3.6
Level 0 Lobby|maze|cooler|classic,stripes|carpet|0,2|none|2.6,2.9
Level 1 Habitable Zone|pillars|crate,barrel,pillar,lamp|concrete|concrete|4,8|none|3.5,4.5|0.2
Level 2 Pipe Dreams|winding|pipes,pipes,boiler,barrel|concrete,metal|concrete|5,9|none|2.4,2.8|0.4
Level 3 Electrical Station|maze|servers,pipes,boiler,cabinet|metal,brick|metal|4,8|none|2.6,3|0.5
Level 4 Abandoned Office|open|desk,chair,cooler,cabinet|plain,classic|carpet2|4,8|none|2.7,3
Level 5 Terror Hotel|L|bed,nightstand,lamp,wardrobe,piano|damask,red|carpet2|3,6|none|3,3.6|0.3
Level 6 Lights Out|maze|crate|concrete|concrete|0,2|none|2.6,3|1
Level 7 Thalassophobia|courtyard|bench|tile|poolTile|0,1|lake|3.5,5
Level 8 Cave System|winding|rock,rock,rock|rock|dirt|5,10|none|3,5|0.7
Level 9 Suburbs Night|courtyard|tree,lamp,bench|brick,hedge|grass|3,6|none|6,7.5|0.6
Level 10 Field of Wheat|open|tree,rock|hedge|dirt|1,3|none|7,8
Level 11 Endless City|pillars|pillar,bench,lamp,vending|brick,concrete|concrete|3,6|none|6,7.5
Level 37 Sublimity|courtyard|bench,pillar|tile|poolTile|1,2|pool|4,6
Level 94 Motion|open|tree,bench,lamp|green,hedge|grass|2,5|none|5,6.5
Level 188 Courtyard Windows|courtyard|bench,plant,lamp|plain,brick|tile|2,4|fountain|6,7.5
Level 974 Kitty Rooms|L|sofa,bed,table,lamp|red,damask|carpet|3,6|none|2.6,3
Level 52 School Halls|winding|lockers,lockers,schooldesk,bench|school|linoleum|5,9|none|2.8,3.1
Level 283 Library of Babel|maze|shelf,shelf,shelf,table,lamp|wood,panel|wood|7,12|none|3.4,4.5
The Hub|T|bench,vending,cooler,clock|plain,concrete|tile|3,6|none|4,5
The Manila Room|open|clock|plain|carpet|0,1|none|3,3.4
Infinite Hotel Hallway|winding|nightstand,lamp,plant|damask,stripes|carpet2|2,5|none|2.6,2.9
Abandoned Mall Atrium|courtyard|bench,plant,vending,arcade|tile,plain|checker|4,8|fountain|5,6.5
Empty Food Court|open|table,chair,chair,counter,vending|tile,red|checker|6,10|none|3.4,4
Dead Arcade|chambers|arcade,arcade,arcade,vending|red,panel|carpet2|5,9|none|2.8,3.2|0.5
Liminal Laundromat|L|counter,sink,chair,cart|tile,plain|linoleum|4,7|none|2.7,3
Night Supermarket|maze|shelf,shelf,cart,counter,cooler|plain,tile|linoleum|6,11|none|3.4,4
Ballpit Playplace|open|crate,bench,arcade|red,green|checker|3,6|none|3,3.6
Indoor Playground Tunnels|winding|crate,bench|red,stripes|carpet2|3,6|none|2.6,3
Hospital Ward B|chambers|bed,bed,cabinet,cart,sink|tile,school|tile|5,9|none|2.8,3.1|0.3
Morgue Drawers|maze|cabinet,cabinet,cart|metal,tile|tile|4,8|none|2.6,2.9|0.6
Waiting Room Forever|open|chair,chair,chair,plant,clock|plain,classic|linoleum|6,10|none|2.7,3
Airport Terminal Gate|pillars|bench,bench,vending,pillar|plain,metal|tile|5,9|none|4,5.5
Subway Platform|T|bench,pillar,vending,lamp|tile,concrete|concrete|3,6|none|3.5,4.5|0.3
Train Car Corridor|winding|bench,bench|metal,panel|metal|3,6|none|2.4,2.7
Parking Level P3|pillars|pillar,cart,barrel|concrete|concrete|3,6|none|2.6,3|0.5
Cold Storage Freezer|maze|crate,shelf,cart|metal|metal|5,9|none|2.8,3.2|0.3
Server Hall Zero|maze|servers,servers,servers,cabinet|metal,plain|metal|6,10|none|3,3.4|0.4
Boiler Catacombs|winding|boiler,pipes,barrel|brick,concrete|concrete|4,8|none|2.6,3|0.6
Flooded Basement|courtyard|crate,barrel|concrete,brick|concrete|2,4|lake|2.6,3|0.5
Grandma's Living Room|L|sofa,tvstand,clock,lamp,piano|damask,green|carpet2|4,7|none|2.6,2.9
Doll House|chambers|bed,wardrobe,mannequin,table|red,damask|wood|3,6|none|2.5,2.8|0.3
Mannequin Showroom|pillars|mannequin,mannequin,mannequin,pillar|plain,panel|tile|5,9|none|3.4,4|0.3
Theater Seating|open|chair,chair,chair,chair,chair|red,panel|carpet2|8,12|none|5,6.5|0.6
Forgotten Cathedral|pillars|bench,bench,pillar,lamp|brick,rock|wood|5,9|none|6,7.5|0.3
Overgrown Glasshouse|courtyard|plant,plant,tree,bench|hedge,metal|dirt|5,9|none|4,5
Garden Maze|maze|tree,bench|hedge|grass|1,3|fountain|6,7.5
Sandstone Ruins|pillars|pillar,rock,rock|rock,brick|sand|3,6|none|5,6.5
Beach Hotel Lobby|L|plant,sofa,counter,lamp|tile,plain|sand|3,6|pool|3.5,4.5
Bunker Dormitory|chambers|bunk,bunk,lockers,crate|concrete,metal|concrete|5,9|none|2.4,2.7|0.4
Office Stairwell Loop|T|lamp,cooler|concrete,plain|concrete|1,3|none|4,5.5|0.3
Mirror Hallways|winding|lamp,mannequin|plain,metal|tile|1,3|none|2.7,3|0.4
Yellow Void|open|pillar|classic|carpet|0,1|none|8,9
`;

export const THEMES: Theme[] = RAW.trim().split("\n").map((line) => {
  const [name, layout, props, walls, floors, density, feature, ceil, dark] = line.split("|");
  const [d0, d1] = density.split(",").map(Number); const [c0, c1] = ceil.split(",").map(Number);
  return {
    name, layout: layout as Layout, props: props.split(",") as ThemeKind[], walls: walls.split(",") as Wallpaper[],
    floors: floors.split(",") as Floor[], density: [d0, d1], feature: feature as Feature, ceil: [c0, c1], dark: dark ? Number(dark) : 0,
  };
});

/** Personal room palettes: clear floor space is preserved for player decorations. */
export const PERSONAL_THEMES: { name: string; wall: Wallpaper; floor: Floor }[] = [
 {name:"Classic",wall:"classic",floor:"carpet"},{name:"Victorian",wall:"damask",floor:"wood"},
 {name:"Crimson Lounge",wall:"red",floor:"carpet2"},{name:"Garden",wall:"green",floor:"grass"},
 {name:"Industrial",wall:"metal",floor:"metal"},{name:"Bathhouse",wall:"tile",floor:"poolTile"},
 {name:"Brick Loft",wall:"brick",floor:"wood"},{name:"Archive",wall:"panel",floor:"carpet2"},
 {name:"Diamond Hall",wall:"diamond",floor:"tile"},{name:"School",wall:"school",floor:"linoleum"},
 {name:"Concrete Bunker",wall:"concrete",floor:"concrete"},{name:"Woodland",wall:"wood",floor:"wood"},
 {name:"Cavern",wall:"rock",floor:"dirt"},{name:"Striped Suite",wall:"stripes",floor:"checker"},
];
