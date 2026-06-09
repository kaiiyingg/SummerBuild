/**
 * translations.js
 * Hardcoded translations for the Pilly Patient UI
 *
 * Languages:
 *   en  — English
 *   zh  — Chinese (Simplified)
 *   ms  — Malay (Bahasa Melayu)
 *   ta  — Tamil
 *
 * Usage:
 *   import { useTranslation } from '../context/LanguageContext';
 *   const { t } = useTranslation();
 *   <Text>{t('queue.yourNumber')}</Text>
 *
 * NOTE: Medicine names and dosages are intentionally NOT translated here.
 * They should always appear in English for safety.
 */

const translations = {

  // ─────────────────────────────────────────────
  // LANGUAGE NAMES (shown in the selector itself)
  // ─────────────────────────────────────────────
  languages: {
    en: { en: 'English',   zh: '英语',     ms: 'Bahasa Inggeris', ta: 'ஆங்கிலம்'    },
    zh: { en: 'Chinese',   zh: '中文',     ms: 'Bahasa Cina',     ta: 'சீனம்'       },
    ms: { en: 'Malay',     zh: '马来语',   ms: 'Bahasa Melayu',   ta: 'மலாய்'       },
    ta: { en: 'Tamil',     zh: '泰米尔语', ms: 'Bahasa Tamil',    ta: 'தமிழ்'       },
  },

  // ─────────────────────────────────────────────
  // NAVIGATION TABS
  // ─────────────────────────────────────────────
  nav: {
    home: {
      en: 'Home',
      zh: '主页',
      ms: 'Laman Utama',
      ta: 'முகப்பு',
    },
    queue: {
      en: 'Queue',
      zh: '排队',
      ms: 'Giliran',
      ta: 'வரிசை',
    },
    medications: {
      en: 'Medications',
      zh: '药物',
      ms: 'Ubat-ubatan',
      ta: 'மருந்துகள்',
    },
    chat: {
      en: 'Chat',
      zh: '聊天',
      ms: 'Sembang',
      ta: 'அரட்டை',
    },
    scan: {
      en: 'Scan',
      zh: '扫描',
      ms: 'Imbas',
      ta: 'ஸ்கேன்',
    },
    reminders: {
      en: 'Reminders',
      zh: '提醒',
      ms: 'Peringatan',
      ta: 'நினைவூட்டல்கள்',
    },
    profile: {
      en: 'Profile',
      zh: '我的账号',
      ms: 'Profil',
      ta: 'சுயவிவரம்',
    },
  },

  // ─────────────────────────────────────────────
  // HOME SCREEN
  // ─────────────────────────────────────────────
  home: {
    greeting_morning: {
      en: 'Good morning',
      zh: '早上好',
      ms: 'Selamat pagi',
      ta: 'காலை வணக்கம்',
    },
    greeting_afternoon: {
      en: 'Good afternoon',
      zh: '下午好',
      ms: 'Selamat tengah hari',
      ta: 'மதிய வணக்கம்',
    },
    greeting_evening: {
      en: 'Good evening',
      zh: '晚上好',
      ms: 'Selamat petang',
      ta: 'மாலை வணக்கம்',
    },
    subtitle: {
      en: 'Here is your pharmacy update',
      zh: '以下是您的药房更新',
      ms: 'Berikut adalah kemas kini farmasi anda',
      ta: 'உங்கள் மருந்தக புதுப்பிப்பு இங்கே உள்ளது',
    },
    yourQueueStatus: {
      en: 'Your Queue Status',
      zh: '您的排队状态',
      ms: 'Status Giliran Anda',
      ta: 'உங்கள் வரிசை நிலை',
    },
    medicationReminder: {
      en: 'Medication Reminder',
      zh: '用药提醒',
      ms: 'Peringatan Ubat',
      ta: 'மருந்து நினைவூட்டல்',
    },
    viewAll: {
      en: 'View All',
      zh: '查看全部',
      ms: 'Lihat Semua',
      ta: 'அனைத்தையும் காண்க',
    },
    noReminders: {
      en: 'No reminders for today',
      zh: '今天没有提醒',
      ms: 'Tiada peringatan untuk hari ini',
      ta: 'இன்று நினைவூட்டல்கள் இல்லை',
    },
  },

  // ─────────────────────────────────────────────
  // QUEUE SCREEN
  // ─────────────────────────────────────────────
  queue: {
    title: {
      en: 'Live Queue',
      zh: '实时排队',
      ms: 'Giliran Langsung',
      ta: 'நேரடி வரிசை',
    },
    yourNumber: {
      en: 'Your Queue Number',
      zh: '您的排队号码',
      ms: 'Nombor Giliran Anda',
      ta: 'உங்கள் வரிசை எண்',
    },
    registrationQueue: {
      en: 'Registration Queue',
      zh: '挂号排队',
      ms: 'Giliran Pendaftaran',
      ta: 'பதிவு வரிசை',
    },
    collectionQueue: {
      en: 'Collection Queue',
      zh: '取药排队',
      ms: 'Giliran Pengambilan',
      ta: 'சேகரிப்பு வரிசை',
    },
    estimatedWait: {
      en: 'Estimated Wait',
      zh: '预计等待时间',
      ms: 'Anggaran Masa Tunggu',
      ta: 'மதிப்பிடப்பட்ட காத்திருப்பு நேரம்',
    },
    peopleAhead: {
      en: 'people ahead of you',
      zh: '人在您前面',
      ms: 'orang di hadapan anda',
      ta: 'பேர் உங்களுக்கு முன்னால் உள்ளனர்',
    },
    minutes: {
      en: 'min',
      zh: '分钟',
      ms: 'minit',
      ta: 'நிமிடம்',
    },
    statusWaiting: {
      en: 'Waiting',
      zh: '等待中',
      ms: 'Menunggu',
      ta: 'காத்திருக்கிறது',
    },
    statusBeingPacked: {
      en: 'Being Packed',
      zh: '正在打包',
      ms: 'Sedang Dibungkus',
      ta: 'பேக் செய்யப்படுகிறது',
    },
    statusReady: {
      en: 'Ready for Collection',
      zh: '可以取药',
      ms: 'Sedia untuk Diambil',
      ta: 'சேகரிக்க தயாராக உள்ளது',
    },
    statusOnHold: {
      en: 'On Hold',
      zh: '暂缓',
      ms: 'Ditangguhkan',
      ta: 'நிறுத்தி வைக்கப்பட்டுள்ளது',
    },
    statusCollected: {
      en: 'Collected',
      zh: '已取药',
      ms: 'Telah Diambil',
      ta: 'சேகரிக்கப்பட்டது',
    },
    onHoldReason: {
      en: 'Reason for delay',
      zh: '延迟原因',
      ms: 'Sebab kelewatan',
      ta: 'தாமதத்தின் காரணம்',
    },
    reschedule: {
      en: 'Reschedule',
      zh: '重新安排',
      ms: 'Jadual Semula',
      ta: 'மீண்டும் திட்டமிடுக',
    },
    notInQueue: {
      en: 'You are not in any queue yet',
      zh: '您还没有加入任何队列',
      ms: 'Anda belum berada dalam mana-mana giliran',
      ta: 'நீங்கள் இன்னும் எந்த வரிசையிலும் இல்லை',
    },
    joinQueue: {
      en: 'Join Queue',
      zh: '加入队列',
      ms: 'Sertai Giliran',
      ta: 'வரிசையில் சேரவும்',
    },
    refreshing: {
      en: 'Updating queue...',
      zh: '正在更新队列...',
      ms: 'Mengemas kini giliran...',
      ta: 'வரிசையை புதுப்பிக்கிறது...',
    },
  },

  // ─────────────────────────────────────────────
  // URGENCY LETTERS INFO CARD
  // ─────────────────────────────────────────────
  urgency: {
    title: {
      en: 'What does your letter mean?',
      zh: '您的字母代表什么？',
      ms: 'Apakah maksud huruf anda?',
      ta: 'உங்கள் எழுத்தின் அர்த்தம் என்ன?',
    },
    A: {
      en: 'Priority A — Urgent. You will be attended to first.',
      zh: 'A级 — 紧急。您将被优先处理。',
      ms: 'Keutamaan A — Mendesak. Anda akan dilayan dahulu.',
      ta: 'முன்னுரிமை A — அவசரம். நீங்கள் முதலில் கவனிக்கப்படுவீர்கள்.',
    },
    B: {
      en: 'Priority B — Moderate. You will be seen shortly.',
      zh: 'B级 — 一般。您将很快被处理。',
      ms: 'Keutamaan B — Sederhana. Anda akan dilayan tidak lama lagi.',
      ta: 'முன்னுரிமை B — மிதமான. நீங்கள் விரைவில் கவனிக்கப்படுவீர்கள்.',
    },
    C: {
      en: 'Priority C — Routine. Please wait for your turn.',
      zh: 'C级 — 常规。请等待您的号码。',
      ms: 'Keutamaan C — Rutin. Sila tunggu giliran anda.',
      ta: 'முன்னுரிமை C — வழக்கமான. உங்கள் முறைக்கு காத்திருங்கள்.',
    },
  },

  // ─────────────────────────────────────────────
  // MEDICATIONS SCREEN
  // ─────────────────────────────────────────────
  medications: {
    title: {
      en: 'My Medications',
      zh: '我的药物',
      ms: 'Ubat Saya',
      ta: 'என் மருந்துகள்',
    },
    scanTitle: {
      en: 'Scan Medication',
      zh: '扫描药物',
      ms: 'Imbas Ubat',
      ta: 'மருந்தை ஸ்கேன் செய்யுங்கள்',
    },
    scanSubtitle: {
      en: 'Point your camera at the medication label to identify it',
      zh: '将相机对准药品标签以识别',
      ms: 'Arahkan kamera anda ke label ubat untuk mengenal pastinya',
      ta: 'மருந்தை அடையாளம் காண உங்கள் கேமராவை லேபிளில் வைக்கவும்',
    },
    scanButton: {
      en: 'Scan Label',
      zh: '扫描标签',
      ms: 'Imbas Label',
      ta: 'லேபிளை ஸ்கேன் செய்யுங்கள்',
    },
    reminderTitle: {
      en: 'Reminders',
      zh: '提醒',
      ms: 'Peringatan',
      ta: 'நினைவூட்டல்கள்',
    },
    addReminder: {
      en: 'Add Reminder',
      zh: '添加提醒',
      ms: 'Tambah Peringatan',
      ta: 'நினைவூட்டல் சேர்க்கவும்',
    },
    dosage: {
      en: 'Dosage',
      zh: '剂量',
      ms: 'Dos',
      ta: 'அளவு',
    },
    frequency: {
      en: 'Frequency',
      zh: '服用频率',
      ms: 'Kekerapan',
      ta: 'அடிக்கடி',
    },
    morning: {
      en: 'Morning',
      zh: '早上',
      ms: 'Pagi',
      ta: 'காலை',
    },
    afternoon: {
      en: 'Afternoon',
      zh: '下午',
      ms: 'Tengah Hari',
      ta: 'மதியம்',
    },
    evening: {
      en: 'Evening',
      zh: '傍晚',
      ms: 'Petang',
      ta: 'மாலை',
    },
    night: {
      en: 'Night',
      zh: '晚上',
      ms: 'Malam',
      ta: 'இரவு',
    },
    takeWithFood: {
      en: 'Take with food',
      zh: '随餐服用',
      ms: 'Ambil bersama makanan',
      ta: 'உணவுடன் எடுக்கவும்',
    },
    noMedications: {
      en: 'No medications assigned yet',
      zh: '暂无分配的药物',
      ms: 'Tiada ubat yang ditetapkan lagi',
      ta: 'இன்னும் மருந்துகள் ஒதுக்கப்படவில்லை',
    },
    textToSpeech: {
      en: 'Read aloud',
      zh: '朗读',
      ms: 'Baca dengan kuat',
      ta: 'சத்தமாக படிக்கவும்',
    },
    tapToScan: {
      en: 'Tap to open camera or upload a photo',
      zh: '点击打开相机或上传照片',
      ms: 'Ketik untuk buka kamera atau muat naik foto',
      ta: 'கேமரா திறக்க அல்லது படம் பதிவேற்ற தட்டவும்',
    },
    openCamera: {
      en: 'Open Camera',
      zh: '打开相机',
      ms: 'Buka Kamera',
      ta: 'கேமரா திறக்கவும்',
    },
    uploadPhoto: {
      en: 'Upload Photo',
      zh: '上传照片',
      ms: 'Muat Naik Foto',
      ta: 'புகைப்படம் பதிவேற்றவும்',
    },
    whatYouCanDo: {
      en: 'What you can do',
      zh: '您可以做什么',
      ms: 'Apa yang anda boleh lakukan',
      ta: 'நீங்கள் என்ன செய்யலாம்',
    },
    featureIdentifyTitle: {
      en: 'Identify Pills',
      zh: '识别药片',
      ms: 'Kenal Pasti Pil',
      ta: 'மாத்திரைகளை அடையாளம் காணுங்கள்',
    },
    featureIdentifyDesc: {
      en: 'Snap a photo to identify any medication instantly',
      zh: '拍照即可快速识别任何药物',
      ms: 'Ambil gambar untuk kenal pasti ubat dengan segera',
      ta: 'எந்த மருந்தையும் உடனடியாக அடையாளம் காண புகைப்படம் எடுக்கவும்',
    },
    featureTranslateTitle: {
      en: 'Translated Instructions',
      zh: '翻译说明',
      ms: 'Arahan Terjemahan',
      ta: 'மொழிபெயர்க்கப்பட்ட வழிமுறைகள்',
    },
    featureTranslateDesc: {
      en: 'Get instructions in your preferred language',
      zh: '以您的首选语言获取说明',
      ms: 'Dapatkan arahan dalam bahasa pilihan anda',
      ta: 'உங்கள் விருப்பமான மொழியில் வழிமுறைகளைப் பெறுங்கள்',
    },
    featureTtsTitle: {
      en: 'Text-to-Speech',
      zh: '文字转语音',
      ms: 'Teks-ke-Ucapan',
      ta: 'உரையை பேச்சாக மாற்றுக',
    },
    featureTtsDesc: {
      en: 'Have instructions read aloud to you',
      zh: '让说明为您朗读',
      ms: 'Biarkan arahan dibaca kepada anda',
      ta: 'வழிமுறைகள் உங்களுக்கு சத்தமாக படிக்கப்படும்',
    },
    tipsCameraTitle: {
      en: 'Tips for Open Camera',
      zh: '打开相机的使用提示',
      ms: 'Petua untuk Buka Kamera',
      ta: 'கேமரா திறப்பதற்கான குறிப்புகள்',
    },
    tipsUploadTitle: {
      en: 'Tips for Upload Photo',
      zh: '上传照片的提示',
      ms: 'Petua untuk Muat Naik Foto',
      ta: 'புகைப்படம் பதிவேற்றுவதற்கான குறிப்புகள்',
    },
    tipCamera1: { en: 'Ensure good lighting when scanning',                    zh: '扫描时确保光线充足',            ms: 'Pastikan pencahayaan yang baik semasa mengimbas',                      ta: 'ஸ்கேன் செய்யும்போது நல்ல வெளிச்சம் இருப்பதை உறுதிப்படுத்துக'         },
    tipCamera2: { en: 'Hold camera steady over the label',                     zh: '将相机稳定地对准标签',           ms: 'Pegang kamera dengan stabil di atas label',                           ta: 'லேபிலின் மீது கேமராவை நிலையாக வையுங்கள்'                             },
    tipCamera3: { en: 'Scan the full label including dosage information',       zh: '扫描包含剂量信息的完整标签',       ms: 'Imbas label penuh termasuk maklumat dos',                             ta: 'அளவு தகவல் உட்பட முழு லேபிலையும் ஸ்கேன் செய்யுங்கள்'                  },
    tipCamera4: { en: 'Keep the label flat and free of folds or shadows',      zh: '保持标签平整，无折痕或阴影',        ms: 'Pastikan label rata dan bebas lipatan atau bayang',                   ta: 'லேபிலை தட்டையாக வையுங்கள், மடிப்புகள் அல்லது நிழல்கள் இல்லாமல்'       },
    tipUpload1: { en: 'Use a clear, well-lit photo taken close to the label',   zh: '使用靠近标签拍摄的清晰、光线充足的照片', ms: 'Gunakan foto yang jelas dan terang diambil dekat dengan label',     ta: 'லேபிலுக்கு அருகில் எடுக்கப்பட்ட தெளிவான புகைப்படத்தைப் பயன்படுத்துங்கள்' },
    tipUpload2: { en: 'Ensure the full label is visible and not cropped',       zh: '确保标签完整可见，未被裁剪',        ms: 'Pastikan label penuh kelihatan dan tidak dipotong',                   ta: 'முழு லேபிலும் தெரியும் மற்றும் வெட்டப்படவில்லை என்பதை உறுதிப்படுத்துங்கள்' },
    tipUpload3: { en: 'Avoid blurry or dark images for better accuracy',        zh: '避免模糊或暗色图像以提高准确性',      ms: 'Elakkan imej yang kabur atau gelap untuk ketepatan yang lebih baik', ta: 'சிறந்த துல்லியத்திற்கு மங்கலான அல்லது இருண்ட படங்களைத் தவிர்க்கவும்'  },
    tipUpload4: { en: 'Supported formats: JPG, PNG (max 10MB)',                 zh: '支持格式：JPG、PNG（最大10MB）',   ms: 'Format yang disokong: JPG, PNG (maks 10MB)',                          ta: 'ஆதரிக்கப்படும் வடிவங்கள்: JPG, PNG (அதிகபட்சம் 10MB)'                },
  },

  // ─────────────────────────────────────────────
  // CHATBOT SCREEN
  // ─────────────────────────────────────────────
  chat: {
    title: {
      en: 'Ask Pilly',
      zh: '问问 Pilly',
      ms: 'Tanya Pilly',
      ta: 'Pilly-ஐ கேளுங்கள்',
    },
    subtitle: {
      en: 'Get answers to your medication questions',
      zh: '获取药物相关问题的解答',
      ms: 'Dapatkan jawapan kepada soalan ubat anda',
      ta: 'உங்கள் மருந்து கேள்விகளுக்கு பதில் பெறுங்கள்',
    },
    placeholder: {
      en: 'Type your question here...',
      zh: '在此输入您的问题...',
      ms: 'Taip soalan anda di sini...',
      ta: 'உங்கள் கேள்வியை இங்கே தட்டச்சு செய்யுங்கள்...',
    },
    send: {
      en: 'Send',
      zh: '发送',
      ms: 'Hantar',
      ta: 'அனுப்பு',
    },
    escalateToPharmacist: {
      en: 'Connect to Pharmacist',
      zh: '联系药剂师',
      ms: 'Hubungi Farmasis',
      ta: 'மருந்தாளரை தொடர்பு கொள்ளுங்கள்',
    },
    escalateNotice: {
      en: 'A pharmacist will respond during working hours (Mon–Fri, 8am–6pm)',
      zh: '药剂师将在工作时间内回复（周一至周五，上午8点至下午6点）',
      ms: 'Farmasis akan bertindak balas semasa waktu bekerja (Isnin–Jumaat, 8pg–6ptg)',
      ta: 'மருந்தாளர் வேலை நேரத்தில் பதில் அளிப்பார் (திங்கள்-வெள்ளி, காலை 8 - மாலை 6)',
    },
    typing: {
      en: 'Pilly is typing...',
      zh: 'Pilly 正在输入...',
      ms: 'Pilly sedang menaip...',
      ta: 'Pilly தட்டச்சு செய்கிறது...',
    },
    suggestionOne: {
      en: 'What are the side effects of my medication?',
      zh: '我的药物有哪些副作用？',
      ms: 'Apakah kesan sampingan ubat saya?',
      ta: 'என் மருந்தின் பக்க விளைவுகள் என்ன?',
    },
    suggestionTwo: {
      en: 'Can I take my medication with food?',
      zh: '我可以随餐服药吗？',
      ms: 'Bolehkah saya ambil ubat bersama makanan?',
      ta: 'என்னால் உணவுடன் மருந்து சாப்பிட முடியுமா?',
    },
    suggestionThree: {
      en: 'How long will I wait for my medication?',
      zh: '我需要等多久才能取药？',
      ms: 'Berapa lama saya perlu tunggu untuk ubat saya?',
      ta: 'என் மருந்துக்கு எவ்வளவு நேரம் காத்திருக்க வேண்டும்?',
    },
  },

  // ─────────────────────────────────────────────
  // PROFILE SCREEN
  // ─────────────────────────────────────────────
  profile: {
    title: {
      en: 'Profile',
      zh: '我的账号',
      ms: 'Profil',
      ta: 'சுயவிவரம்',
    },
    personalInfo: {
      en: 'Personal Information',
      zh: '个人信息',
      ms: 'Maklumat Peribadi',
      ta: 'தனிப்பட்ட தகவல்',
    },
    name: {
      en: 'Name',
      zh: '姓名',
      ms: 'Nama',
      ta: 'பெயர்',
    },
    patientId: {
      en: 'Patient ID',
      zh: '病人编号',
      ms: 'ID Pesakit',
      ta: 'நோயாளி அடையாள எண்',
    },
    dateOfBirth: {
      en: 'Date of Birth',
      zh: '出生日期',
      ms: 'Tarikh Lahir',
      ta: 'பிறந்த தேதி',
    },
    contactNumber: {
      en: 'Contact Number',
      zh: '联系电话',
      ms: 'Nombor Telefon',
      ta: 'தொடர்பு எண்',
    },
    preferences: {
      en: 'Preferences',
      zh: '偏好设置',
      ms: 'Pilihan',
      ta: 'விருப்பத்தேர்வுகள்',
    },
    languagePreference: {
      en: 'Language Preference',
      zh: '语言偏好',
      ms: 'Keutamaan Bahasa',
      ta: 'மொழி விருப்பம்',
    },
    notifications: {
      en: 'Notifications',
      zh: '通知',
      ms: 'Pemberitahuan',
      ta: 'அறிவிப்புகள்',
    },
    notifyQueueUpdates: {
      en: 'Queue updates',
      zh: '队列更新',
      ms: 'Kemas kini giliran',
      ta: 'வரிசை புதுப்பிப்புகள்',
    },
    notifyMedicationReady: {
      en: 'Medication ready alerts',
      zh: '药物准备就绪提醒',
      ms: 'Makluman ubat sedia',
      ta: 'மருந்து தயார் விழிப்பூட்டல்கள்',
    },
    notifyMedicationReminder: {
      en: 'Medication reminders',
      zh: '用药提醒',
      ms: 'Peringatan ubat',
      ta: 'மருந்து நினைவூட்டல்கள்',
    },
    logout: {
      en: 'Log Out',
      zh: '退出登录',
      ms: 'Log Keluar',
      ta: 'வெளியேறு',
    },
    logoutConfirm: {
      en: 'Are you sure you want to log out?',
      zh: '您确定要退出吗？',
      ms: 'Adakah anda pasti mahu log keluar?',
      ta: 'நீங்கள் நிச்சயமாக வெளியேற விரும்புகிறீர்களா?',
    },
  },

  // ─────────────────────────────────────────────
  // NOTIFICATIONS
  // ─────────────────────────────────────────────
  notifications: {
    title: {
      en: 'Notifications',
      zh: '通知',
      ms: 'Pemberitahuan',
      ta: 'அறிவிப்புகள்',
    },
    medicationReady: {
      en: 'Your medication is ready for collection',
      zh: '您的药物已准备好，可以取药',
      ms: 'Ubat anda sedia untuk diambil',
      ta: 'உங்கள் மருந்து சேகரிக்க தயாராக உள்ளது',
    },
    queueCalled: {
      en: 'Your queue number has been called',
      zh: '您的号码已被叫到',
      ms: 'Nombor giliran anda telah dipanggil',
      ta: 'உங்கள் வரிசை எண் அழைக்கப்பட்டது',
    },
    medicationDelayed: {
      en: 'Your medication is delayed. Reason:',
      zh: '您的药物已延迟。原因：',
      ms: 'Ubat anda ditangguhkan. Sebab:',
      ta: 'உங்கள் மருந்து தாமதமாகிறது. காரணம்:',
    },
    reminderTime: {
      en: 'Time to take your medication',
      zh: '该服药了',
      ms: 'Masa untuk ambil ubat anda',
      ta: 'உங்கள் மருந்து எடுக்கும் நேரம்',
    },
    noNotifications: {
      en: 'No new notifications',
      zh: '没有新通知',
      ms: 'Tiada pemberitahuan baharu',
      ta: 'புதிய அறிவிப்புகள் இல்லை',
    },
    markAllRead: {
      en: 'Mark all as read',
      zh: '全部标为已读',
      ms: 'Tandakan semua sebagai dibaca',
      ta: 'அனைத்தையும் படித்தது என குறிக்கவும்',
    },
  },

  // ─────────────────────────────────────────────
  // COMMON / SHARED ELEMENTS
  // ─────────────────────────────────────────────
  common: {
    confirm: {
      en: 'Confirm',
      zh: '确认',
      ms: 'Sahkan',
      ta: 'உறுதிப்படுத்துக',
    },
    cancel: {
      en: 'Cancel',
      zh: '取消',
      ms: 'Batal',
      ta: 'ரத்து செய்க',
    },
    save: {
      en: 'Save',
      zh: '保存',
      ms: 'Simpan',
      ta: 'சேமி',
    },
    back: {
      en: 'Back',
      zh: '返回',
      ms: 'Kembali',
      ta: 'பின்னால்',
    },
    close: {
      en: 'Close',
      zh: '关闭',
      ms: 'Tutup',
      ta: 'மூடு',
    },
    loading: {
      en: 'Loading...',
      zh: '加载中...',
      ms: 'Memuatkan...',
      ta: 'ஏற்றுகிறது...',
    },
    error: {
      en: 'Something went wrong. Please try again.',
      zh: '出现错误，请重试。',
      ms: 'Sesuatu telah berlaku. Sila cuba lagi.',
      ta: 'ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்.',
    },
    yes: {
      en: 'Yes',
      zh: '是',
      ms: 'Ya',
      ta: 'ஆம்',
    },
    no: {
      en: 'No',
      zh: '否',
      ms: 'Tidak',
      ta: 'இல்லை',
    },
    today: {
      en: 'Today',
      zh: '今天',
      ms: 'Hari ini',
      ta: 'இன்று',
    },
    now: {
      en: 'Now',
      zh: '现在',
      ms: 'Sekarang',
      ta: 'இப்போது',
    },
  },

  // ─────────────────────────────────────────────
  // LOGIN / REGISTER (Patient side)
  // ─────────────────────────────────────────────
  auth: {
    welcomeBack: {
      en: 'Welcome back',
      zh: '欢迎回来',
      ms: 'Selamat kembali',
      ta: 'மீண்டும் வருக',
    },
    signIn: {
      en: 'Sign In',
      zh: '登录',
      ms: 'Log Masuk',
      ta: 'உள்நுழைக',
    },
    register: {
      en: 'Register',
      zh: '注册',
      ms: 'Daftar',
      ta: 'பதிவு செய்க',
    },
    email: {
      en: 'Email Address',
      zh: '电子邮件',
      ms: 'Alamat E-mel',
      ta: 'மின்னஞ்சல் முகவரி',
    },
    password: {
      en: 'Password',
      zh: '密码',
      ms: 'Kata Laluan',
      ta: 'கடவுச்சொல்',
    },
    confirmPassword: {
      en: 'Confirm Password',
      zh: '确认密码',
      ms: 'Sahkan Kata Laluan',
      ta: 'கடவுச்சொல்லை உறுதிப்படுத்துக',
    },
    forgotPassword: {
      en: 'Forgot password?',
      zh: '忘记密码？',
      ms: 'Lupa kata laluan?',
      ta: 'கடவுச்சொல் மறந்துவிட்டதா?',
    },
    noAccount: {
      en: 'New here? Register for a new account',
      zh: '还没有账号？注册新账号',
      ms: 'Baru di sini? Daftar akaun baru',
      ta: 'புதியவரா? புதிய கணக்கை பதிவு செய்யுங்கள்',
    },
    haveAccount: {
      en: 'Already have an account? Sign in here',
      zh: '已有账号？在此登录',
      ms: 'Sudah ada akaun? Log masuk di sini',
      ta: 'ஏற்கனவே கணக்கு இருக்கிறதா? இங்கே உள்நுழைக',
    },
  },

};

export default translations;
