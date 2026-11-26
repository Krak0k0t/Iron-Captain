import type { LanguageCode } from './types';

export interface LanguageMeta {
  code: LanguageCode;
  nativeName: string;
  rtl?: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'uk', nativeName: 'Українська' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'es', nativeName: 'Español' },
  { code: 'pt', nativeName: 'Português' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'pl', nativeName: 'Polski' },
  { code: 'zh', nativeName: '中文' },
  { code: 'ja', nativeName: '日本語' },
  { code: 'vi', nativeName: 'Tiếng Việt' },
  { code: 'ar', nativeName: 'العربية', rtl: true },
  { code: 'fa', nativeName: 'فارسی', rtl: true },
  { code: 'elv', nativeName: 'Quenya (Elvish)' },
  { code: 'orc', nativeName: 'Orkish (Black Speech)' },
];

export interface UiStrings {
  gameTitle: string;
  gameSubtitle: string;
  startGame: string;
  continueGame: string;
  newGame: string;
  chapterSelect: string;
  settings: string;
  language: string;
  fullscreen: string;
  exitFullscreen: string;
  resume: string;
  restartChapter: string;
  returnToMenu: string;
  commandDeck: string;
  close: string;
  confirmChapterLeave: string;
  confirmYes: string;
  confirmNo: string;
  statusCompleted: string;
  statusAvailable: string;
  statusLocked: string;
  lockedTitle: string;
  difficultyLabel: string;
  diffStory: string;
  diffCaptain: string;
  diffHardcore: string;
  graphicsLabel: string;
  gfxLow: string;
  gfxBalanced: string;
  gfxHigh: string;
  gfxCinematic: string;
  audioLabel: string;
  musicVol: string;
  sfxVol: string;
  ambientVol: string;
  keybindsLabel: string;
  pressAnyKey: string;
  resetDefaults: string;
  rmbJumpHint: string;
  windowLabel: string;
  stakeLabel: string;
  capitalLabel: string;
  surgeryGoalLabel: string;
  monthsShort: string;
  weeksShort: string;
  hpLabel: string;
  energyLabel: string;
  objectivesLabel: string;
  enemiesLabel: string;
  skillCrane: string;
  skillCraneDesc: string;
  skillGrapple: string;
  skillGrappleDesc: string;
  skillSlam: string;
  skillSlamDesc: string;
  skillInteract: string;
  skillInteractDesc: string;
  skillJump: string;
  skillJumpDesc: string;
  controlsHint: string;
  partyTab: string;
  almanacTab: string;
  marketTab: string;
  approvalLabel: string;
  councilHealthy: string;
  councilMutiny: string;
  profitGateway: string;
  lockFundsBtn: string;
  reinvestBtn: string;
  buySellBtn: string;
  gatewayFrozenMsg: string;
  victoryTitle: string;
  defeatTitle: string;
  playAgain: string;
  nextChapter: string;
  rewardLabel: string;
  actLabel: string;
  prologLabel: string;
  realWorldTag: string;
  hydrogenTag: string;
  interactPrompt: string;
  touchInteractPrompt: string;
  crtLabel: string;
  crtHint: string;
  relicsTab: string;
  relicBuffsLabel: string;
  bypassReadyTag: string;
  touchControlsHint: string;
  obstacleWarningLabel: string;
  skillAttack: string;
  skillAttackDesc: string;
  skillDash: string;
  skillDashDesc: string;
  overchargeLabel: string;
  comboLabel: string;
  loreTab: string;
  loreUnlockedTag: string;
  loreEmptyHint: string;
  subQuestLabel: string;
  hospTitle: string;
  hospQueueLabel: string;
  hospTicketNow: string;
  hospTicketYours: string;
  hospPhoneTitle: string;
  hospPhoneHint: string;
  hospTestHoistBtn: string;
  hospBalanceLabel: string;
  hospDoctorAlertTitle: string;
  hospDoctorAlertBody: string;
  hospEnterHydrogenBtn: string;
  hospChoiceLine: string;
  realPhoneTag: string;
  tickerLabel: string;
  rigBalanceTitle: string;
  rigBalanceDesc: string;
}

const EN: UiStrings = {
  gameTitle: 'IRON CAPTAIN',
  gameSubtitle: 'Sector Twin-4 · VRMMO Hydrogen',
  startGame: 'Launch Shift',
  continueGame: 'Continue Campaign',
  newGame: 'New Game',
  chapterSelect: 'Chapter Select',
  settings: 'Settings',
  language: 'Language',
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit Fullscreen',
  resume: 'Resume',
  restartChapter: 'Restart Chapter',
  returnToMenu: 'Main Menu',
  commandDeck: 'Polina L. Deck',
  close: 'Close',
  confirmChapterLeave: 'Current progress in this chapter will be lost. Open Chapter Select?',
  confirmYes: 'Proceed',
  confirmNo: 'Stay Here',
  statusCompleted: 'Completed',
  statusAvailable: 'Available',
  statusLocked: 'Locked',
  lockedTitle: 'Encrypted Sector',
  difficultyLabel: 'Difficulty',
  diffStory: 'Soft Calculation',
  diffCaptain: 'Captain',
  diffHardcore: 'All-In Iron',
  graphicsLabel: 'Graphics Preset',
  gfxLow: 'Low',
  gfxBalanced: 'Balanced',
  gfxHigh: 'High',
  gfxCinematic: 'Cinematic',
  audioLabel: 'Audio Mix',
  musicVol: 'Music',
  sfxVol: 'Interface & SFX',
  ambientVol: 'Harbor Ambient',
  keybindsLabel: 'Controls & Keybinds',
  pressAnyKey: 'Press key...',
  resetDefaults: 'Reset Defaults',
  rmbJumpHint: 'Quick Right-Click Jump (Hold RMB = Steer)',
  windowLabel: 'Window',
  stakeLabel: 'Stake',
  capitalLabel: 'Capital',
  surgeryGoalLabel: 'Surgery Fund',
  monthsShort: 'mo',
  weeksShort: 'wk',
  hpLabel: 'INTEGRITY',
  energyLabel: 'HYDRAULICS',
  objectivesLabel: 'Contracts',
  enemiesLabel: 'Hostiles',
  skillCrane: 'Crane Moment',
  skillCraneDesc: 'Drop a 40-ton gantry girder onto enemies in front of you. Massive stagger & AoE damage.',
  skillGrapple: 'Cargo Sling',
  skillGrappleDesc: 'Fire magnetic grapple cables to yank targets, stun drones, and shred armor.',
  skillSlam: 'Counterweight',
  skillSlamDesc: 'Discharge hydraulic shockwave around Artem, knocking back close threats.',
  skillInteract: 'Interact / Hack',
  skillInteractDesc: 'Trigger harbor cranes, salvage hydrogen buoys, or crack Twin-4 terminals.',
  skillJump: 'Jump',
  skillJumpDesc: 'Vault over cargo stacks and dodge heavy ground telegraphs.',
  controlsHint: 'LMB Strike/Orbit · RMB Steer/Jump · WASD Move · Shift Dash · 1-3 Skills · F Strike · E Interact · Esc Pause',
  partyTab: 'Crew Council',
  almanacTab: 'Vulnerability Almanac',
  marketTab: 'Exchange & Gateway',
  approvalLabel: 'Approval',
  councilHealthy: 'Crew Ready for Raid',
  councilMutiny: 'Council Unrest (<30)',
  profitGateway: 'Profit-Gateway (15% Fee)',
  lockFundsBtn: 'Lock 200,000 AK to Real',
  reinvestBtn: 'Reinvest 200,000 AK in Fleet',
  buySellBtn: 'Execute Trade',
  gatewayFrozenMsg: 'Profit-Gateway Frozen by Atlas Audit!',
  victoryTitle: 'SHIFT CLEARED',
  defeatTitle: 'SIGNAL LOST',
  playAgain: 'Try Again',
  nextChapter: 'Next Chapter',
  rewardLabel: 'Catalogued Relic',
  actLabel: 'Act',
  prologLabel: 'Prologue',
  realWorldTag: 'Real World · 2031',
  hydrogenTag: 'Hydrogen · Twin-4',
  interactPrompt: 'Press [E] / Tap to Interact',
  touchInteractPrompt: 'Tap Interact',
  crtLabel: 'CRT Scanlines (Dendy Filter)',
  crtHint: 'Subtle retro scanline grille over the harbor',
  relicsTab: 'Catalogued Relics',
  relicBuffsLabel: 'Active Relic Enhancements',
  bypassReadyTag: 'RELIC BYPASS (+2)',
  touchControlsHint: 'Left Stick Move · Drag Right Camera · Right Buttons Strike, Dash, Jump, Interact & Skills',
  obstacleWarningLabel: 'Hazard',
  skillAttack: 'Iron Gauntlet',
  skillAttackDesc: '3-hit hydraulic combo strike (LMB tap / F). Restores +10 Hydraulics & interrupts enemy windups.',
  skillDash: 'Hydraulic Dash',
  skillDashDesc: 'Surge forward with brief invulnerability (Shift). Costs 30 Hydraulics.',
  overchargeLabel: 'OVERCHARGE',
  comboLabel: 'COMBO',
  loreTab: 'Black Box Lore',
  loreUnlockedTag: 'BLACK BOX DECODED',
  loreEmptyHint: 'Scan violet Black-Box terminals during dock shifts to decrypt hidden Atlas & Polina L. logs.',
  subQuestLabel: 'TACTICAL',
  hospTitle: 'CITY HOSPITAL #4 · CORRIDOR B',
  hospQueueLabel: 'SPINAL SURGERY QUOTA BOARD',
  hospTicketNow: 'SERVING',
  hospTicketYours: 'YOUR TICKET',
  hospPhoneTitle: 'HYDROGEN MOBILE TERMINAL (TRIAL: 50 DAYS FREE)',
  hospPhoneHint: 'Killing time in the queue — stabilize the test counterweight rig on your cracked phone.',
  hospTestHoistBtn: 'LOCK RIG AT SWEET SPOT',
  hospBalanceLabel: 'SLING TENSION BALANCE',
  hospDoctorAlertTitle: 'SMS // DR. KRAVTSOV · QUOTA DESK',
  hospDoctorAlertBody: 'Garin, A. — L4-L5 municipal quota DENIED. Paid neuro-surgery: 2,300,000 AK equivalent. Progression window: 10 months.',
  hospEnterHydrogenBtn: 'JACK INTO HYDROGEN · START SHIFT',
  hospChoiceLine: '"Nine hundred a month to enter a world where my spine doesn’t snap. Fine. Give me the crane."',
  realPhoneTag: 'REAL LIFE · PHONE',
  tickerLabel: 'TWIN-4',
  rigBalanceTitle: 'HOIST BALANCE RIG',
  rigBalanceDesc: 'Hold balance in the green zone [E] or drop [1] cleanly',
};

const RU: UiStrings = {
  ...EN,
  gameTitle: 'МЕТАЛЛИЧЕСКИЙ КАПИТАН',
  gameSubtitle: 'Сектор Близнец-4 · VRMMO Водород',
  startGame: 'Начать смену',
  continueGame: 'Продолжить',
  newGame: 'Новая игра',
  chapterSelect: 'Выбор главы',
  settings: 'Настройки',
  language: 'Язык',
  fullscreen: 'Полный экран',
  exitFullscreen: 'Выйти из полного экрана',
  resume: 'Продолжить',
  restartChapter: 'Перезапустить главу',
  returnToMenu: 'Главное меню',
  commandDeck: 'Палуба «Полины Л.»',
  close: 'Закрыть',
  confirmChapterLeave: 'Текущий прогресс в этой главе будет потерян. Перейти к выбору главы?',
  confirmYes: 'Перейти',
  confirmNo: 'Остаться',
  statusCompleted: 'Пройдено',
  statusAvailable: 'Доступно',
  statusLocked: 'Закрыто',
  lockedTitle: 'Сектор зашифрован',
  difficultyLabel: 'Сложность игры',
  diffStory: 'Мягкий расчёт',
  diffCaptain: 'Капитан',
  diffHardcore: 'Ва-банк',
  graphicsLabel: 'Уровень графики',
  gfxLow: 'Низкий',
  gfxBalanced: 'Баланс',
  gfxHigh: 'Высокий',
  gfxCinematic: 'Кинематограф',
  audioLabel: 'Звук и музыка',
  musicVol: 'Музыка',
  sfxVol: 'Эффекты и UI',
  ambientVol: 'Шум порта',
  keybindsLabel: 'Клавиатура и мышь',
  pressAnyKey: 'Нажмите клавишу...',
  resetDefaults: 'Сбросить',
  rmbJumpHint: 'Быстрый ПКМ — прыжок (удержание ПКМ — руление)',
  windowLabel: 'Окно',
  stakeLabel: 'Ставка',
  capitalLabel: 'Капитал',
  surgeryGoalLabel: 'На операцию',
  monthsShort: 'мес.',
  weeksShort: 'нед.',
  hpLabel: 'ЦЕЛОСТНОСТЬ',
  energyLabel: 'ГИДРАВЛИКА',
  objectivesLabel: 'Контракты',
  enemiesLabel: 'Враги',
  skillCrane: 'Кран-момент',
  skillCraneDesc: 'Обрушить 40-тонную кран-балку на врагов впереди. Огромный урон и оглушение.',
  skillGrapple: 'Стропа',
  skillGrappleDesc: 'Магнитный захват: притягивает цель, сбивает дронов и пробивает броню.',
  skillSlam: 'Противовес',
  skillSlamDesc: 'Гидравлическая ударная волна вокруг Артёма, отбрасывающая врагов.',
  skillInteract: 'Действие / Взлом',
  skillInteractDesc: 'Активировать краны, водородные буи и терминалы сектора Близнец-4.',
  skillJump: 'Прыжок',
  skillJumpDesc: 'Прыжок через контейнеры и уход от атак.',
  controlsHint: 'ЛКМ Удар/Обзор · ПКМ Руль/Прыжок · WASD Бег · Shift Рывок · 1-3 Скиллы · F Удар · E Действие · Esc Пауза',
  partyTab: 'Совет пати',
  almanacTab: 'Альманах уязвимостей',
  marketTab: 'Биржа и Профит-шлюз',
  approvalLabel: 'Одобрение',
  councilHealthy: 'Команда готова к рейду',
  councilMutiny: 'Бунт в совете (<30)',
  profitGateway: 'Профит-шлюз (комиссия 15%)',
  lockFundsBtn: 'Зафиксировать 200 000 АК в реал',
  reinvestBtn: 'Реинвестировать 200 000 АК во флот',
  buySellBtn: 'Сделка',
  gatewayFrozenMsg: 'Профит-шлюз заморожен аудитом Атласа!',
  victoryTitle: 'СМЕНА ЗАКРЫТА',
  defeatTitle: 'СИГНАЛ ПОТЕРЯН',
  playAgain: 'Повторить',
  nextChapter: 'Следующая глава',
  rewardLabel: 'Трофей каталога',
  actLabel: 'Акт',
  prologLabel: 'Пролог',
  realWorldTag: 'Реал · 2031',
  hydrogenTag: 'Водород · Близнец-4',
  interactPrompt: 'Нажмите [E] для взаимодействия',
  touchInteractPrompt: 'Нажмите Взаимодействие',
  crtLabel: 'CRT-сканлайны (фильтр Денди)',
  crtHint: 'Лёгкая строчная ретро-сетка поверх кадра',
  relicsTab: 'Реликвии каталога',
  relicBuffsLabel: 'Бонусы собранных реликвий',
  bypassReadyTag: 'ОБХОД РЕЛИКВИЕЙ (+2)',
  touchControlsHint: 'Стик слева Бег · Свайп справа Камера · Кнопки справа Удар, Рывок, Прыжок, Действие и Скиллы',
  obstacleWarningLabel: 'Угроза',
  skillAttack: 'Железный кулак',
  skillAttackDesc: 'Серия из 3 ударов (клик ЛКМ / F). Восстанавливает +10 Гидравлики и сбивает замах врагов.',
  skillDash: 'Гидро-рывок',
  skillDashDesc: 'Быстрый уклон с краткой неуязвимостью (Shift). Тратит 30 Гидравлики.',
  overchargeLabel: 'ПЕРЕГРУЗКА',
  comboLabel: 'КОМБО',
  loreTab: 'Чёрный ящик Лора',
  loreUnlockedTag: 'ЧЁРНЫЙ ЯЩИК РАСШИФРОВАН',
  loreEmptyHint: 'Сканируй фиолетовые терминалы Чёрного ящика на сменах, чтобы открыть скрытые логи Атласа и «Полины Л.».',
  subQuestLabel: 'ТАКТИКА',
  hospTitle: 'ГОРОДСКАЯ БОЛЬНИЦА №4 · КОРИДОР Б',
  hospQueueLabel: 'ТАБЛО ОЧЕРЕДИ НА КВОТУ',
  hospTicketNow: 'СЕЙЧАС',
  hospTicketYours: 'ВАШ ТАЛОН',
  hospPhoneTitle: 'МОБИЛЬНЫЙ КЛИЕНТ «ВОДОРОД» (50 ДНЕЙ БЕСПЛАТНО)',
  hospPhoneHint: 'Чтобы скоротать очередь — выровняй тестовый противовес крана на треснутом экране телефона.',
  hospTestHoistBtn: 'ЗАФИКСИРОВАТЬ ГРУЗ',
  hospBalanceLabel: 'БАЛАНС СТРОПЫ',
  hospDoctorAlertTitle: 'СМС // Д-Р КРАВЦОВ · ОТДЕЛ КВОТ',
  hospDoctorAlertBody: 'Гарин А. — в госквоте L4–L5 ОТКАЗАНО. Платная операция: экв. 2 300 000 АК. Окно до необратимости: 10 мес.',
  hospEnterHydrogenBtn: 'ВОЙТИ В «ВОДОРОД» · НАЧАТЬ СМЕНУ',
  hospChoiceLine: '«Девятьсот в месяц за доступ в мир, где спина не сломается. Ладно. Дайте мне кран.»',
  realPhoneTag: 'РЕАЛ · ТЕЛЕФОН',
  tickerLabel: 'БЛИЗНЕЦ-4',
  rigBalanceTitle: 'БАЛАНС КРАНА',
  rigBalanceDesc: 'Держи груз в зелёной зоне [E] и сбрасывай [1] без перекоса',
};

const OVERRIDES: Partial<Record<LanguageCode, Partial<UiStrings>>> = {
  en: EN,
  ru: RU,
  uk: {
    gameTitle: 'МЕТАЛЕВИЙ КАПІТАН',
    startGame: 'Почати зміну',
    continueGame: 'Продовжити',
    newGame: 'Нова гра',
    chapterSelect: 'Вибір глави',
    settings: 'Налаштування',
    language: 'Мова',
    fullscreen: 'Повний екран',
    exitFullscreen: 'Вийти з повного екрана',
    resume: 'Продовжити',
    returnToMenu: 'Головне меню',
    commandDeck: 'Палуба «Поліни Л.»',
    statusCompleted: 'Пройдено',
    statusAvailable: 'Доступно',
    statusLocked: 'Закрито',
    difficultyLabel: 'Складність',
    graphicsLabel: 'Графіка',
    windowLabel: 'Вікно',
    stakeLabel: 'Ставка',
    capitalLabel: 'Капітал',
    skillCrane: 'Кран-момент',
    skillGrapple: 'Стропа',
    skillSlam: 'Противага',
    skillInteract: 'Взаємодія',
    skillJump: 'Стрибок',
  },
  fr: {
    gameTitle: 'CAPITAINE DE FER',
    startGame: 'Lancer la session',
    continueGame: 'Continuer',
    newGame: 'Nouvelle partie',
    chapterSelect: 'Choix du chapitre',
    settings: 'Paramètres',
    language: 'Langue',
    fullscreen: 'Plein écran',
    exitFullscreen: 'Quitter plein écran',
    resume: 'Reprendre',
    returnToMenu: 'Menu principal',
    statusCompleted: 'Terminé',
    statusAvailable: 'Disponible',
    statusLocked: 'Verrouillé',
    difficultyLabel: 'Difficulté',
    graphicsLabel: 'Qualité graphique',
    windowLabel: 'Fenêtre',
    stakeLabel: 'Mise',
    capitalLabel: 'Capital',
  },
  de: {
    gameTitle: 'EISENKAPITÄN',
    startGame: 'Schicht starten',
    continueGame: 'Fortsetzen',
    newGame: 'Neues Spiel',
    chapterSelect: 'Kapitelauswahl',
    settings: 'Einstellungen',
    language: 'Sprache',
    fullscreen: 'Vollbild',
    exitFullscreen: 'Vollbild beenden',
    resume: 'Fortfahren',
    returnToMenu: 'Hauptmenü',
    statusCompleted: 'Abgeschlossen',
    statusAvailable: 'Verfügbar',
    statusLocked: 'Gesperrt',
    difficultyLabel: 'Schwierigkeit',
    graphicsLabel: 'Grafikstufe',
    windowLabel: 'Zeitfenster',
    stakeLabel: 'Einsatz',
    capitalLabel: 'Kapital',
  },
  es: {
    gameTitle: 'CAPITÁN DE HIERRO',
    startGame: 'Iniciar turno',
    continueGame: 'Continuar',
    newGame: 'Nueva partida',
    chapterSelect: 'Selección de capítulo',
    settings: 'Ajustes',
    language: 'Idioma',
    fullscreen: 'Pantalla completa',
    exitFullscreen: 'Salir de pantalla completa',
    resume: 'Reanudar',
    returnToMenu: 'Menú principal',
    statusCompleted: 'Completado',
    statusAvailable: 'Disponible',
    statusLocked: 'Bloqueado',
    difficultyLabel: 'Dificultad',
    graphicsLabel: 'Gráficos',
    windowLabel: 'Ventana',
    stakeLabel: 'Apuesta',
    capitalLabel: 'Capital',
  },
  pt: {
    gameTitle: 'CAPITÃO DE FERRO',
    startGame: 'Iniciar turno',
    continueGame: 'Continuar',
    newGame: 'Novo jogo',
    chapterSelect: 'Selecionar capítulo',
    settings: 'Configurações',
    language: 'Idioma',
    fullscreen: 'Tela cheia',
    exitFullscreen: 'Sair da tela cheia',
    resume: 'Retomar',
    returnToMenu: 'Menu principal',
    statusCompleted: 'Concluído',
    statusAvailable: 'Disponível',
    statusLocked: 'Bloqueado',
    difficultyLabel: 'Dificuldade',
    graphicsLabel: 'Gráficos',
  },
  it: {
    gameTitle: 'CAPITANO DI FERRO',
    startGame: 'Inizia turno',
    continueGame: 'Continua',
    newGame: 'Nuova partita',
    chapterSelect: 'Selezione capitolo',
    settings: 'Impostazioni',
    language: 'Lingua',
    fullscreen: 'Schermo intero',
    exitFullscreen: 'Esci da schermo intero',
    resume: 'Riprendi',
    returnToMenu: 'Menu principale',
    statusCompleted: 'Completato',
    statusAvailable: 'Disponibile',
    statusLocked: 'Bloccato',
    difficultyLabel: 'Difficoltà',
    graphicsLabel: 'Grafica',
  },
  pl: {
    gameTitle: 'ŻELAZNY KAPITAN',
    startGame: 'Rozpocznij zmianę',
    continueGame: 'Kontynuuj',
    newGame: 'Nowa gra',
    chapterSelect: 'Wybór rozdziału',
    settings: 'Ustawienia',
    language: 'Język',
    fullscreen: 'Pełny ekran',
    exitFullscreen: 'Wyjdź z pełnego ekranu',
    resume: 'Wznów',
    returnToMenu: 'Menu główne',
    statusCompleted: 'Ukończono',
    statusAvailable: 'Dostępny',
    statusLocked: 'Zablokowany',
    difficultyLabel: 'Poziom trudności',
    graphicsLabel: 'Grafika',
  },
  zh: {
    gameTitle: '钢铁船长',
    startGame: '开始班次',
    continueGame: '继续战役',
    newGame: '新游戏',
    chapterSelect: '章节选择',
    settings: '设置',
    language: '语言',
    fullscreen: '全屏',
    exitFullscreen: '退出全屏',
    resume: '继续',
    returnToMenu: '主菜单',
    statusCompleted: '已完成',
    statusAvailable: '可用',
    statusLocked: '未解锁',
    difficultyLabel: '难度',
    graphicsLabel: '画质预设',
    windowLabel: '窗口期',
    stakeLabel: '风险',
    capitalLabel: '资产',
  },
  ja: {
    gameTitle: 'アイアン・キャプテン',
    startGame: 'シフト開始',
    continueGame: '続きから',
    newGame: 'ニューゲーム',
    chapterSelect: 'チャプター選択',
    settings: '設定',
    language: '言語',
    fullscreen: 'フルスクリーン',
    exitFullscreen: '全画面解除',
    resume: '再開',
    returnToMenu: 'メインメニュー',
    statusCompleted: '完了',
    statusAvailable: '解放済み',
    statusLocked: 'ロック中',
    difficultyLabel: '難易度',
    graphicsLabel: 'グラフィック',
    windowLabel: '猶予期間',
    stakeLabel: '賭け率',
    capitalLabel: '資金',
  },
  vi: {
    gameTitle: 'THUYỀN TRƯỞNG SẮT',
    startGame: 'Bắt đầu ca',
    continueGame: 'Tiếp tục',
    newGame: 'Chơi mới',
    chapterSelect: 'Chọn chương',
    settings: 'Cài đặt',
    language: 'Ngôn ngữ',
    fullscreen: 'Toàn màn hình',
    exitFullscreen: 'Thoát toàn màn hình',
    resume: 'Tiếp tục',
    returnToMenu: 'Menu chính',
    statusCompleted: 'Hoàn thành',
    statusAvailable: 'Khả dụng',
    statusLocked: 'Đã khóa',
    difficultyLabel: 'Độ khó',
    graphicsLabel: 'Đồ họa',
  },
  ar: {
    gameTitle: 'القبطان الحديدي',
    startGame: 'بدء المناوبة',
    continueGame: 'متابعة الحملة',
    newGame: 'لعبة جديدة',
    chapterSelect: 'اختيار الفصل',
    settings: 'الإعدادات',
    language: 'اللغة',
    fullscreen: 'ملء الشاشة',
    exitFullscreen: 'إنهاء ملء الشاشة',
    resume: 'استئناف',
    returnToMenu: 'القائمة الرئيسية',
    statusCompleted: 'مكتمل',
    statusAvailable: 'متاح',
    statusLocked: 'مقفل',
    difficultyLabel: 'الصعوبة',
    graphicsLabel: 'جودة الرسوميات',
    windowLabel: 'النافذة',
    stakeLabel: 'المخاطرة',
    capitalLabel: 'رأس المال',
  },
  fa: {
    gameTitle: 'کاپیتان آهنین',
    startGame: 'شروع شیفت',
    continueGame: 'ادامه بازی',
    newGame: 'بازی جدید',
    chapterSelect: 'انتخاب فصل',
    settings: 'تنظیمات',
    language: 'زبان',
    fullscreen: 'تمام‌صفحه',
    exitFullscreen: 'خروج از تمام‌صفحه',
    resume: 'ادامه',
    returnToMenu: 'منوی اصلی',
    statusCompleted: 'تکمیل شده',
    statusAvailable: 'در دسترس',
    statusLocked: 'قفل شده',
    difficultyLabel: 'درجه سختی',
    graphicsLabel: 'سطح گرافیک',
    windowLabel: 'پنجره زمانی',
    stakeLabel: 'ریسک',
    capitalLabel: 'سرمایه',
  },
  elv: {
    gameTitle: 'ANGA-HÉRË',
    gameSubtitle: 'Nóre Minya-Canta · Vilin',
    startGame: 'Tula i Róna',
    continueGame: 'Lelya',
    newGame: 'Vinya Nyárë',
    chapterSelect: 'Cilë Quentë',
    settings: 'Panyë',
    language: 'Lambë',
    fullscreen: 'Ilqua Cenda',
    exitFullscreen: 'Auta Ilqua',
    resume: 'Lelya',
    returnToMenu: 'Mára Men',
    statusCompleted: 'Telyana',
    statusAvailable: 'Lerta',
    statusLocked: 'Holma',
    difficultyLabel: 'Narda',
    graphicsLabel: 'Canta',
    windowLabel: 'Lú',
    stakeLabel: 'Cauma',
    capitalLabel: 'Mírë',
    skillCrane: 'Anga-Orta',
    skillGrapple: 'Lias-Tulta',
    skillSlam: 'Nén-Ramba',
    skillJump: 'Lappa',
  },
  orc: {
    gameTitle: 'KRUMP KAP’N',
    gameSubtitle: 'Twin-4 Scrap · Gaz-World',
    startGame: 'KRUMP NOW',
    continueGame: 'KEEP KRUMPIN',
    newGame: 'FRESH WAAAGH',
    chapterSelect: 'PICK FIGHT',
    settings: 'GUBBINZ',
    language: 'TONGUE',
    fullscreen: 'BIGGA SCREEN',
    exitFullscreen: 'SMOL SCREEN',
    resume: 'BACK TA WORK',
    returnToMenu: 'BOSS TENT',
    statusCompleted: 'SMASHED',
    statusAvailable: 'READY',
    statusLocked: 'LOCKED UP',
    difficultyLabel: 'HOW HARD',
    graphicsLabel: 'SHINY LEVEL',
    windowLabel: 'TIME LEFT',
    stakeLabel: 'RISK',
    capitalLabel: 'TEEF',
    skillCrane: 'DROP BIG IRON',
    skillGrapple: 'YANK HOOK',
    skillSlam: 'STOMP DECK',
    skillJump: 'BOUNCE',
  },
};

export function getUi(lang: LanguageCode): UiStrings {
  return {
    ...EN,
    ...(OVERRIDES[lang] ?? {}),
  };
}

export function isRtlLanguage(lang: LanguageCode): boolean {
  return lang === 'ar' || lang === 'fa';
}
