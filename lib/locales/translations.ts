"use client"

export type TranslationKey =
  | 'title' | 'subtitle' | 'host' | 'tryout' | 'join' | 'language' | 'english' | 'indonesian' | 'chinese'
  | 'welcome' | 'startGame' | 'joinGame' | 'createGame' | 'gameCode' | 'enterCode' | 'waiting'
  | 'players' | 'ready' | 'notReady' | 'gameStarting' | 'loading' | 'error' | 'success'
  | 'cancel' | 'confirm' | 'close' | 'next' | 'previous' | 'submit' | 'reset'
  | 'score' | 'points' | 'time' | 'question' | 'questions' | 'answer' | 'correct' | 'incorrect'
  | 'tutorial' | 'rules' | 'howToPlay' | 'instructions' | 'backToMenu' | 'playAgain'
  | 'gameOver' | 'winner' | 'loser' | 'tie' | 'finalScore' | 'highScore' | 'newRecord'
  | 'enterName' | 'chooseAvatar' | 'gameCodeQR' | 'waitForHost' | 'miniGameGuide'
  | 'afterCorrect' | 'correctAnswers' | 'enterMiniGame' | 'swipeRocket' | 'avoidMeteors'
  | 'collectItems' | 'reducePoints' | 'increasePoints' | 'skip' | 'start' | 'name'
  | 'quizNotFound' | 'goHome' | 'loadingQuiz' | 'waitingForHost' | 'progress' | 'questionOf'
  | 'questionImage'
  // Custom for select quiz page
  | 'selectQuiz' | 'searchQuizzes' | 'allCategory' | 'starting'
  // Rules dialog
  | 'gameRules' | 'timeLimit' | 'numberOfQuestions' | 'selectTimeLimit' | 'selectNumberOfQuestions' | 'minutes' | 'back'
  // Host page
  | 'spaceQuiz' | 'startQuiz' | 'exitGame' | 'waitingForPlayersToJoin'
  | 'playersLabel' | 'exitGameQuestion' | 'exitGameWarning' | 'endSession'
  // Tryout play
  | 'currentQuestion' | 'answered' | 'unanswered' | 'complete' | 'totalQuestions' | 'alreadyAnswered' | 'notAnsweredYet' | 'stillUnanswered'
  | 'questionNumber' | 'notAnswered' | 'questionsRandomized' | 'unansweredQuestions'
  | 'alreadyAnsweredCheck' | 'youStillHave' | 'questionsNotAnswered'
  // Exit confirmation dialog
  | 'exitConfirmation' | 'areYouSureExitQuiz' | 'currentProgress' | 'timeRemaining' | 'progressWillBeSaved' | 'exit'
  // Quiz completion dialog
  | 'quizComplete' | 'allQuestionsAnswered' | 'areYouSureFinishQuiz' | 'cannotChangeAnswers' | 'continue' | 'finish'
  // Tryout results page
  | 'tryoutComplete' | 'player' | 'totalScore' | 'correctAnswersLabel' | 'loadingResults' | 'restarting' | 'restart' | 'backToQuizzes'
  | 'excellent' | 'greatJob' | 'goodWork' | 'notBad' | 'keepPracticing'
  // Unanswered questions dialog
  | 'answerNow'
  // Mini-game
  | 'gameFinished' | 'finalScoreLabel' | 'closingIn'
  // Wait page
  | 'getReady' | 'waitingHostToStart' | 'gameStartingWait' | 'getReadyIn' | 'seconds' | 'loadingWait' | 'exitGameQuestionWait' | 'exitGameWarningWait' | 'youWillNeedToJoinAgain'
  // Host countdown
  | 'quizStarting'
  // Host actions
  | 'endQuiz'

export const translations: Record<string, Record<TranslationKey, string>> = {
  en: {
    // Main page
    title: 'SPACE QUIZ',
    subtitle: 'Play a quiz game and with your friends!',
    host: 'HOST',
    tryout: 'TRYOUT',
    join: 'JOIN',
    language: 'Language',
    english: 'English',
    indonesian: 'Indonesian',
    chinese: 'Chinese',

    // General UI
    welcome: 'Welcome',
    name: 'Name',
    startGame: 'Start Game',
    joinGame: 'Join Game',
    createGame: 'Create Game',
    gameCode: 'Game Code',
    enterCode: 'Enter Code',
    waiting: 'Waiting...',
    players: 'Players',
    ready: 'Ready',
    notReady: 'Not Ready',
    gameStarting: 'Game Starting...',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    next: 'Next',
    previous: 'Previous',
    submit: 'Submit',
    reset: 'Reset',

    // Game related
    score: 'Score',
    points: 'Points',
    time: 'Time',
    question: 'Question',
    questions: 'Questions',
    answer: 'Answer',
    correct: 'Correct!',
    incorrect: 'Incorrect!',

    // Tutorial and rules
    tutorial: 'Tutorial',
    rules: 'Rules',
    howToPlay: 'How to Play',
    instructions: 'Instructions',
    backToMenu: 'Back to Menu',
    playAgain: 'Play Again',

    // Game results
    gameOver: 'Game Over',
    winner: 'Winner!',
    loser: 'Game Over',
    tie: "It's a Tie!",
    finalScore: 'Final Score',
    highScore: 'High Score',
    newRecord: 'New Record!',

    // Tutorial specific
    enterName: 'Enter your name and choose an avatar.',
    chooseAvatar: 'Choose Your Avatar',
    gameCodeQR: 'Enter the 6-digit game code or scan the QR code.',
    waitForHost: 'Wait for the host to start the quiz.',
    miniGameGuide: 'Mini-Game Guide',
    afterCorrect: 'After every',
    correctAnswers: 'correct answers',
    enterMiniGame: "you'll enter a mini-game!",
    swipeRocket: 'Swipe left/right to move the rocket.',
    avoidMeteors: 'Avoid meteors/dark object — hitting them will reduce your points.',
    collectItems: 'Collect colorful items to increase your points.',
    reducePoints: 'reduce your points',
    increasePoints: 'increase your points',
    skip: 'Skip',
    start: 'Start',

    // Error and loading messages
    quizNotFound: 'Quiz not found or invalid quiz ID.',
    goHome: 'Go Home',
    loadingQuiz: 'Loading quiz...',
    waitingForHost: 'Waiting for host to start...',
    progress: 'Progress',
    questionOf: 'Question {current} of {total}',
    questionImage: 'Question image',

    // Select quiz page
    selectQuiz: 'Select Quiz',
    searchQuizzes: 'Search quizzes...',
    allCategory: 'All Category',
    starting: 'Starting...',

    // Rules dialog
    gameRules: 'Game Rules',
    timeLimit: 'Time Limit',
    numberOfQuestions: 'Number of Questions',
    selectTimeLimit: 'Select time limit',
    selectNumberOfQuestions: 'Select number of questions',
    minutes: 'minutes',
    back: 'Back'
    ,
    // Host page
    spaceQuiz: 'Space-Quiz',
    startQuiz: 'Start Quiz',
    exitGame: 'Exit Game',
    waitingForPlayersToJoin: 'Waiting for players to join...',
    playersLabel: 'Players',
    exitGameQuestion: 'Exit Game?',
    exitGameWarning: 'Are you sure you want to exit? The game session will end immediately and all players will be disconnected.',
    endSession: 'End Session',
    // Tryout play
    currentQuestion: 'Current',
    answered: 'Answered',
    unanswered: 'Unanswered',
    complete: 'Complete',
    totalQuestions: 'Total Questions',
    alreadyAnswered: 'Already answered',
    notAnsweredYet: 'Not answered yet',
    stillUnanswered: 'Still unanswered',
    questionNumber: 'Question',
    notAnswered: 'Not answered',
    questionsRandomized: 'Questions have been randomized! The order will remain the same during this session.',
    unansweredQuestions: 'Unanswered questions:',
    alreadyAnsweredCheck: '✓ Already answered',
    youStillHave: 'You still have',
    questionsNotAnswered: 'questions not answered',
    // Exit confirmation dialog
    exitConfirmation: 'Exit Confirmation',
    areYouSureExitQuiz: 'Are you sure you want to exit this quiz?',
    currentProgress: 'Current Progress:',
    timeRemaining: 'Time Remaining:',
    progressWillBeSaved: 'Your progress will be saved, but you will lose the remaining time.',
    exit: 'Exit',
    // Quiz completion dialog
    quizComplete: 'Quiz Complete!',
    allQuestionsAnswered: 'All questions have been answered completely',
    areYouSureFinishQuiz: 'Are you sure you want to finish this quiz?',
    cannotChangeAnswers: 'You cannot change answers after this.',
    continue: 'Continue',
    finish: 'Finish',
    // Tryout results page
    tryoutComplete: 'Tryout Complete!',
    player: 'Player:',
    totalScore: 'Total Score',
    correctAnswersLabel: 'Correct Answers',
    loadingResults: 'Loading results...',
    restarting: 'Restarting...',
    restart: 'Restart',
    backToQuizzes: 'Back to Quizzes',
    excellent: 'Excellent! 🌟',
    greatJob: 'Great job! 🎉',
    goodWork: 'Good work! 👍',
    notBad: 'Not bad! 😊',
    keepPracticing: 'Keep practicing! 💪',
    // Unanswered questions dialog
    answerNow: 'Answer Now',
    // Mini-game
    gameFinished: 'Game Finished!',
    finalScoreLabel: 'Final Score:',
    closingIn: 'Closing in 2 seconds...',
    // Wait page
    getReady: 'Get Ready!',
    waitingHostToStart: 'Waiting host to start',
    gameStartingWait: 'Game Starting!',
    getReadyIn: 'Get ready in',
    seconds: 'seconds',
    loadingWait: 'Loading...',
    exitGameQuestionWait: 'Exit Game?',
    exitGameWarningWait: 'Are you sure you want to leave the game?',
    youWillNeedToJoinAgain: 'You will need to join again if you change your mind.',
    // Host countdown
    quizStarting: 'Quiz Starting!',
    // Host actions
    endQuiz: 'End Quiz'
  },
  id: {
    // Main page
    title: 'KUIS RUANG ANGKASA',
    subtitle: 'Mainkan permainan kuis bersama teman-temanmu!',
    host: 'HOST',
    tryout: 'COBA',
    join: 'GABUNG',
    language: 'Bahasa',
    english: 'Bahasa Inggris',
    indonesian: 'Bahasa Indonesia',
    chinese: 'Bahasa Mandarin',

    // General UI
    welcome: 'Selamat Datang',
    name: 'Nama',
    startGame: 'Mulai Permainan',
    joinGame: 'Gabung Permainan',
    createGame: 'Buat Permainan',
    gameCode: 'Kode Permainan',
    enterCode: 'Masukkan Kode',
    waiting: 'Menunggu...',
    players: 'Pemain',
    ready: 'Siap',
    notReady: 'Belum Siap',
    gameStarting: 'Permainan Dimulai...',
    loading: 'Memuat...',
    error: 'Kesalahan',
    success: 'Berhasil',
    cancel: 'Batal',
    confirm: 'Konfirmasi',
    close: 'Tutup',
    next: 'Selanjutnya',
    previous: 'Sebelumnya',
    submit: 'Kirim',
    reset: 'Reset',

    // Game related
    score: 'Skor',
    points: 'Poin',
    time: 'Waktu',
    question: 'Pertanyaan',
    questions: 'Pertanyaan',
    answer: 'Jawaban',
    correct: 'Benar!',
    incorrect: 'Salah!',

    // Tutorial and rules
    tutorial: 'Tutorial',
    rules: 'Aturan',
    howToPlay: 'Cara Bermain',
    instructions: 'Petunjuk',
    backToMenu: 'Kembali ke Menu',
    playAgain: 'Main Lagi',

    // Game results
    gameOver: 'Permainan Selesai',
    winner: 'Pemenang!',
    loser: 'Permainan Selesai',
    tie: 'Seri!',
    finalScore: 'Skor Akhir',
    highScore: 'Skor Tertinggi',
    newRecord: 'Rekor Baru!',

    // Tutorial specific
    enterName: 'Masukkan nama dan pilih avatar.',
    chooseAvatar: 'Pilih Avatar Anda',
    gameCodeQR: 'Masukkan kode permainan 6 digit atau scan QR code.',
    waitForHost: 'Tunggu host untuk memulai kuis.',
    miniGameGuide: 'Panduan Mini-Game',
    afterCorrect: 'Setelah setiap',
    correctAnswers: 'jawaban benar',
    enterMiniGame: 'Anda akan masuk ke mini-game!',
    swipeRocket: 'Geser kiri/kanan untuk menggerakkan roket.',
    avoidMeteors: 'Hindari meteor/objek gelap — terkena akan mengurangi poin.',
    collectItems: 'Kumpulkan item berwarna untuk menambah poin.',
    reducePoints: 'mengurangi poin',
    increasePoints: 'menambah poin',
    skip: 'Lewati',
    start: 'Mulai',

    // Error and loading messages
    quizNotFound: 'Kuis tidak ditemukan atau ID kuis tidak valid.',
    goHome: 'Kembali ke Beranda',
    loadingQuiz: 'Memuat kuis...',
    waitingForHost: 'Menunggu host untuk memulai...',
    progress: 'Progress',
    questionOf: 'Pertanyaan {current} dari {total}',
    questionImage: 'Gambar soal',

    // Select quiz page
    selectQuiz: 'Pilih Kuis',
    searchQuizzes: 'Cari kuis...',
    allCategory: 'Semua Kategori',
    starting: 'Memulai...',

    // Rules dialog
    gameRules: 'Aturan Permainan',
    timeLimit: 'Batas Waktu',
    numberOfQuestions: 'Jumlah Pertanyaan',
    selectTimeLimit: 'Pilih batas waktu',
    selectNumberOfQuestions: 'Pilih jumlah pertanyaan',
    minutes: 'menit',
    back: 'Kembali'
    ,
    // Host page
    spaceQuiz: 'Kuis-Antariksa',
    startQuiz: 'Mulai Kuis',
    exitGame: 'Keluar Permainan',
    waitingForPlayersToJoin: 'Menunggu pemain bergabung...',
    playersLabel: 'Pemain',
    exitGameQuestion: 'Keluar dari Permainan?',
    exitGameWarning: 'Apakah Anda yakin ingin keluar? Sesi permainan akan segera berakhir dan semua pemain akan terputus.',
    endSession: 'Akhiri Sesi',
    // Tryout play
    currentQuestion: 'Saat ini',
    answered: 'Sudah dijawab',
    unanswered: 'Belum dijawab',
    complete: 'Selesai',
    totalQuestions: 'Total Soal',
    alreadyAnswered: 'Sudah dijawab',
    notAnsweredYet: 'Belum dijawab',
    stillUnanswered: 'Masih ada soal yang belum dijawab',
    questionNumber: 'Soal',
    notAnswered: 'Belum dijawab',
    questionsRandomized: 'Soal telah diacak! Urutan akan tetap sama selama sesi ini.',
    unansweredQuestions: 'Soal yang belum dijawab:',
    alreadyAnsweredCheck: '✓ Sudah dijawab',
    youStillHave: 'Anda masih memiliki',
    questionsNotAnswered: 'soal yang belum dijawab',
    // Exit confirmation dialog
    exitConfirmation: 'Konfirmasi Keluar',
    areYouSureExitQuiz: 'Apakah Anda yakin ingin keluar dari quiz ini?',
    currentProgress: 'Progress Saat Ini:',
    timeRemaining: 'Waktu Tersisa:',
    progressWillBeSaved: 'Progress Anda akan disimpan, tetapi Anda akan kehilangan waktu yang tersisa.',
    exit: 'Keluar',
    // Quiz completion dialog
    quizComplete: 'Quiz Selesai!',
    allQuestionsAnswered: 'Semua soal telah terjawab dengan lengkap',
    areYouSureFinishQuiz: 'Apakah Anda yakin ingin menyelesaikan quiz ini?',
    cannotChangeAnswers: 'Anda tidak dapat mengubah jawaban setelah ini.',
    continue: 'Lanjutkan',
    finish: 'Selesai',
    // Tryout results page
    tryoutComplete: 'Tryout Selesai!',
    player: 'Pemain:',
    totalScore: 'Total Skor',
    correctAnswersLabel: 'Jawaban Benar',
    loadingResults: 'Memuat hasil...',
    restarting: 'Memulai ulang...',
    restart: 'Mulai Ulang',
    backToQuizzes: 'Kembali ke Kuis',
    excellent: 'Luar biasa! 🌟',
    greatJob: 'Kerja bagus! 🎉',
    goodWork: 'Kerja yang baik! 👍',
    notBad: 'Tidak buruk! 😊',
    keepPracticing: 'Terus berlatih! 💪',
    // Unanswered questions dialog
    answerNow: 'Jawab Sekarang',
    // Mini-game
    gameFinished: 'Permainan Selesai!',
    finalScoreLabel: 'Skor Akhir:',
    closingIn: 'Tutup dalam 2 detik...',
    // Wait page
    getReady: 'Bersiap!',
    waitingHostToStart: 'Menunggu host untuk memulai',
    gameStartingWait: 'Permainan Dimulai!',
    getReadyIn: 'Bersiap dalam',
    seconds: 'detik',
    loadingWait: 'Memuat...',
    exitGameQuestionWait: 'Keluar dari Permainan?',
    exitGameWarningWait: 'Apakah Anda yakin ingin keluar dari permainan?',
    youWillNeedToJoinAgain: 'Anda perlu bergabung lagi jika Anda berubah pikiran.',
    // Host countdown
    quizStarting: 'Kuis Dimulai!',
    // Host actions
    endQuiz: 'Akhiri Kuis'
  },
  zh: {
    // Main page
    title: '太空问答',
    subtitle: '和你的朋友一起玩问答游戏！',
    host: '主持',
    tryout: '试玩',
    join: '加入',
    language: '语言',
    english: '英语',
    indonesian: '印尼语',
    chinese: '中文',

    // General UI
    welcome: '欢迎',
    name: '姓名',
    startGame: '开始游戏',
    joinGame: '加入游戏',
    createGame: '创建游戏',
    gameCode: '游戏代码',
    enterCode: '输入代码',
    waiting: '等待中...',
    players: '玩家',
    ready: '准备就绪',
    notReady: '未准备',
    gameStarting: '游戏开始中...',
    loading: '加载中...',
    error: '错误',
    success: '成功',
    cancel: '取消',
    confirm: '确认',
    close: '关闭',
    next: '下一个',
    previous: '上一个',
    submit: '提交',
    reset: '重置',

    // Game related
    score: '分数',
    points: '点数',
    time: '时间',
    question: '问题',
    questions: '问题',
    answer: '答案',
    correct: '正确！',
    incorrect: '错误！',

    // Tutorial and rules
    tutorial: '教程',
    rules: '规则',
    howToPlay: '游戏玩法',
    instructions: '说明',
    backToMenu: '返回菜单',
    playAgain: '再玩一次',

    // Game results
    gameOver: '游戏结束',
    winner: '获胜者！',
    loser: '游戏结束',
    tie: '平局！',
    finalScore: '最终分数',
    highScore: '最高分',
    newRecord: '新纪录！',

    // Tutorial specific
    enterName: '输入您的姓名并选择头像。',
    chooseAvatar: '选择您的头像',
    gameCodeQR: '输入6位游戏代码或扫描二维码。',
    waitForHost: '等待主持人开始问答。',
    miniGameGuide: '小游戏指南',
    afterCorrect: '每',
    correctAnswers: '个正确答案后',
    enterMiniGame: '您将进入小游戏！',
    swipeRocket: '左右滑动移动火箭。',
    avoidMeteors: '避开流星/暗色物体 — 碰到会减少分数。',
    collectItems: '收集彩色物品来增加分数。',
    reducePoints: '减少分数',
    increasePoints: '增加分数',
    skip: '跳过',
    start: '开始',

    // Error and loading messages
    quizNotFound: '找不到测验或测验ID无效。',
    goHome: '返回首页',
    loadingQuiz: '加载测验中...',
    waitingForHost: '等待主持人开始...',
    progress: '进度',
    questionOf: '第 {current} 题，共 {total} 题',
    questionImage: '问题图片',

    // Select quiz page
    selectQuiz: '选择测验',
    searchQuizzes: '搜索测验...',
    allCategory: '全部分类',
    starting: '开始中...',

    // Rules dialog
    gameRules: '游戏规则',
    timeLimit: '时间限制',
    numberOfQuestions: '题目数量',
    selectTimeLimit: '选择时间限制',
    selectNumberOfQuestions: '选择题目数量',
    minutes: '分钟',
    back: '返回'
    ,
    // Host page
    spaceQuiz: '太空问答',
    startQuiz: '开始测验',
    exitGame: '退出游戏',
    waitingForPlayersToJoin: '等待玩家加入...',
    playersLabel: '玩家',
    exitGameQuestion: '退出游戏？',
    exitGameWarning: '确定要退出吗？当前游戏会立即结束，所有玩家将断开连接。',
    endSession: '结束会话',
    // Tryout play
    currentQuestion: '当前',
    answered: '已答',
    unanswered: '未答',
    complete: '完成',
    totalQuestions: '总题数',
    alreadyAnswered: '已回答',
    notAnsweredYet: '未回答',
    stillUnanswered: '仍有未答题目',
    questionNumber: '题目',
    notAnswered: '未答',
    questionsRandomized: '题目已随机排序！在此会话期间顺序将保持不变。',
    unansweredQuestions: '未答题目：',
    alreadyAnsweredCheck: '✓ 已回答',
    youStillHave: '您还有',
    questionsNotAnswered: '道题目未回答',
    // Exit confirmation dialog
    exitConfirmation: '退出确认',
    areYouSureExitQuiz: '确定要退出这个测验吗？',
    currentProgress: '当前进度：',
    timeRemaining: '剩余时间：',
    progressWillBeSaved: '您的进度将被保存，但您将失去剩余时间。',
    exit: '退出',
    // Quiz completion dialog
    quizComplete: '测验完成！',
    allQuestionsAnswered: '所有题目已完整回答',
    areYouSureFinishQuiz: '确定要完成这个测验吗？',
    cannotChangeAnswers: '完成后您将无法更改答案。',
    continue: '继续',
    finish: '完成',
    // Tryout results page
    tryoutComplete: '测验完成！',
    player: '玩家：',
    totalScore: '总分',
    correctAnswersLabel: '正确答案',
    loadingResults: '加载结果中...',
    restarting: '重新开始中...',
    restart: '重新开始',
    backToQuizzes: '返回测验',
    excellent: '优秀！🌟',
    greatJob: '做得好！🎉',
    goodWork: '不错！👍',
    notBad: '还可以！😊',
    keepPracticing: '继续练习！💪',
    // Unanswered questions dialog
    answerNow: '立即回答',
    // Mini-game
    gameFinished: '游戏结束！',
    finalScoreLabel: '最终得分：',
    closingIn: '2秒后关闭...',
    // Wait page
    getReady: '准备就绪！',
    waitingHostToStart: '等待主持人开始',
    gameStartingWait: '游戏开始！',
    getReadyIn: '准备在',
    seconds: '秒',
    loadingWait: '加载中...',
    exitGameQuestionWait: '退出游戏？',
    exitGameWarningWait: '确定要离开游戏吗？',
    youWillNeedToJoinAgain: '如果您改变主意，需要重新加入。',
    // Host countdown
    quizStarting: '测验开始！',
    // Host actions
    endQuiz: '结束测验'
  }
}


