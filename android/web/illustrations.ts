// Original curriculum concepts rendered with the device's bundled emoji artwork.
// Pinyin itself is a generated PNG, never an emoji or vector substitute.
export const wordArt: Record<string,string[]> = {
 greetings: ['👋','💝','🚪','🙋','🫵','👩‍🏫'],
 numbers: ['☝️','✌️','🔺','🍀','🖐️','🎲'],
 family: ['👩','👨','👦','👧','🤝','🏡'],
 food: ['💧','🍵','🍚','🍜','🍎','🍽️'],
 time: ['📅','🌅','⏱️','🕒','🌞','🌙'],
 shopping: ['🛍️','💰','❔','🫵','💎','🏷️'],
 directions: ['👈','👉','🗺️','🏫','🏦','🚶'],
 routines: ['🌅','📖','💼','🛏️','📅','📚'],
 hobbies: ['💙','🎵','🏊','🎬','🏃','⚽'],
 conversations: ['📛','🙋','🎒','💬','🌟','🗣️'],
};
export function illustration(id:string){const [topic,index]=id.split('-');return wordArt[topic]?.[Number(index)-1]??'💬';}
