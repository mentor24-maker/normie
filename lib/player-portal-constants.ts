/** Client-safe progression constants shared by portal UI and server reward logic. */

export const PLAYER_POLLS_PER_LEVEL = 10;
/** 10 levels per grade × 10 polls per level = 100 polls to graduate a grade. */
export const PLAYER_LEVELS_PER_GRADE = 10;
export const PLAYER_POLLS_PER_GRADE = PLAYER_POLLS_PER_LEVEL * PLAYER_LEVELS_PER_GRADE;
/** 10 grades per class × 100 polls per grade = 1000 polls to graduate a class. */
export const PLAYER_GRADES_PER_CLASS = 10;
export const PLAYER_POLLS_PER_CLASS = PLAYER_POLLS_PER_GRADE * PLAYER_GRADES_PER_CLASS;

export const PLAYER_PORTAL_LEVEL_COIN_SIZE_PX = 30;
export const PLAYER_PORTAL_GRADE_COIN_SIZE_PX = 60;
export const PLAYER_PORTAL_CLASS_COIN_SIZE_PX = 90;
