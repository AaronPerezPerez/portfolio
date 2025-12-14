export const cheatCodes = [
  // Age of Empires II
  'howdoyouturnthison',
  'cheese steak jimmy\'s',
  'robin hood',
  'rock on',
  'lumberjack',

  // Age of Mythology
  'PANDORAS BOX',
  'ATM OF EREBUS',
  'TROJAN HORSE FOR SALE',
  'JUNK FOOD NIGHT',
  'O CANADA',

  // Rise of Nations
  'cheat keys on',
  'cheat add 1000',
  'cheat resource all',
  'cheat die',
  'cheat reveal',
  'cheat nuke',

  // Los Sims 1
  'rosebud',
  'klapaucius',
  'move_objects on',

  // Los Sims 2
  'motherlode',
  'kaching',
  'boolprop testingcheatsenabled true',
  'moveobjects on',
  'aging off',

  // Los Sims 3
  'testingcheatsenabled true',
  'freerealestate on',
  'resetSim [nombre]',

  // Los Sims 4
  'testingcheats true',
  'bb.moveobjects on',
  'cas.fulleditmode',

  // GTA San Andreas
  'hesoyam',
  'baguvix',
  'fullclip',
  'uzumymw',
  'aezakmi',
  'jumpjet',

  // StarCraft
  'power overwhelming',
  'show me the money',
  'black sheep wall',
  'operation cwal',

  // Warcraft III
  'greedisgood',
  'whosyourdaddy',
  'thereisnospoon',
  'iseedeadpeople',

  // SimCity 2000/3000/4
  'funds',
  'call cousin vinnie',
  'nerdz rool',
] as const;

/**
 * Detecta si un mensaje contiene algún cheat code conocido
 */
export function isCheatCode(message: string): boolean {
  const normalized = message.toLowerCase().replace(/'/g, '');
  return cheatCodes.some(cheat =>
    normalized.includes(cheat.toLowerCase().replace(/'/g, ''))
  );
}
