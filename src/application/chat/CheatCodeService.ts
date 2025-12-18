/**
 * CheatCodeService
 * Detects and handles easter egg cheat codes in messages
 */

// Classic video game cheat codes
const CHEAT_CODES = [
  // Age of Empires II
  'howdoyouturnthison',
  "cheese steak jimmy's",
  'robin hood',
  'rock on',
  'lumberjack',

  // Age of Mythology
  'pandoras box',
  'atm of erebus',
  'trojan horse for sale',
  'junk food night',
  'o canada',

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

export interface CheatCodeResult {
  isCheat: boolean;
  code?: string;
  response?: string;
}

export class CheatCodeService {
  /**
   * Checks if a message contains a cheat code
   */
  static detect(message: string): CheatCodeResult {
    const normalized = message.toLowerCase().replace(/'/g, '');

    for (const cheat of CHEAT_CODES) {
      const normalizedCheat = cheat.toLowerCase().replace(/'/g, '');
      if (normalized.includes(normalizedCheat)) {
        return {
          isCheat: true,
          code: cheat,
          response: this.getCheatResponse(),
        };
      }
    }

    return { isCheat: false };
  }

  /**
   * Returns the response to send when a cheat is activated
   */
  private static getCheatResponse(): string {
    return '> CHEAT_ACTIVATED // STEAM_UNLOCKED\n\n¡Has desbloqueado un secreto! Revisa el Hero... parece que algo nuevo ha aparecido.';
  }

  /**
   * Gets additional data to include in the response
   */
  static getCheatResponseData(): { steamUnlocked: boolean } {
    return { steamUnlocked: true };
  }
}
