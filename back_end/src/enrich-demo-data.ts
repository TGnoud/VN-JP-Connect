import 'dotenv/config';
import { createHash } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  AnyBulkWriteOperation,
  Db,
  Document,
  Filter,
  MongoClient,
  ObjectId,
} from 'mongodb';
import { MAX_BIO_LENGTH } from './profile/profile.constants';

type Nationality = 'VN' | 'JP';
type Gender = 'male' | 'female' | 'other';
type LanguageSkill = { language: string; level: string };
type CustomerPlan = {
  id: ObjectId;
  ordinal: number;
  isNew: boolean;
  isDemo: boolean;
  email: string;
  phoneNumber: string;
  fullName: string;
  originalFullName?: string;
  nationality: Nationality;
  birthDate: Date;
  age: number;
  profile: ProfilePlan;
};
type ProfilePlan = {
  gender: Gender;
  location: string;
  occupation: string;
  education: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  socialLinks: { instagram: string; facebook: string; line: string };
  languages: LanguageSkill[];
  photos: Array<{
    _id: ObjectId;
    url: string;
    public_id: string;
    is_main: boolean;
    uploaded_at: Date;
  }>;
  matchRate: number;
  connectionsCount: number;
  interestNames: string[];
};
type MatchPlan = {
  id: ObjectId;
  requesterId: ObjectId;
  receiverId: ObjectId;
  existingMatchId?: ObjectId;
};
type ConversationPlan = {
  id: ObjectId;
  matchId: ObjectId;
  type: 'direct' | 'group';
  title: string;
  participantIds: ObjectId[];
  createdBy?: ObjectId;
};
type MessagePlan = {
  seedKey: string;
  conversationId: ObjectId;
  senderId: ObjectId;
  content: string;
  translatedContent: string;
  status: 'sent' | 'read';
  readBy: ObjectId[];
  sentAt: Date;
};
type CleanupPlan = {
  matches: FilterWithCount;
  conversations: FilterWithCount;
  messages: FilterWithCount;
};
type FilterWithCount = {
  collectionName: 'matches' | 'conversations' | 'messages';
  filter: Filter<Document>;
};

const TARGET_CUSTOMER_COUNT = 280;
const DIRECT_MATCHES_PER_USER = 5;
const BACKUP_COLLECTIONS = [
  'users',
  'profiles',
  'tags',
  'user_interests',
  'matches',
  'conversations',
  'messages',
] as const;
const DEMO_EMAIL_PREFIX = 'demo.vn-jp.';
const DEMO_EMAIL_DOMAIN = '@vn-jp-connect.local';
const ENRICH_SEED_PREFIX = 'enrich-demo-data';
const DEFAULT_PASSWORD_HASH = 'local-seed-password-hash';
const MATCH_RATE_MIN = 60;
const MATCH_RATE_MAX = 100;

const VN_FAMILIES = [
  'Nguyen',
  'Tran',
  'Le',
  'Pham',
  'Hoang',
  'Huynh',
  'Phan',
  'Vu',
  'Vo',
  'Dang',
  'Bui',
  'Do',
  'Ho',
  'Ngo',
  'Duong',
  'Ly',
  'Truong',
  'Dinh',
  'Mai',
  'Cao',
  'Ta',
  'Luu',
];
const VN_MIDDLES = [
  'Van',
  'Thi',
  'Minh',
  'Ngoc',
  'Thanh',
  'Gia',
  'Duc',
  'Nhat',
  'Bao',
  'Quoc',
  'Anh',
  'Hoai',
  'Khanh',
  'Phuong',
  'Hai',
];
const VN_GIVENS = [
  'An',
  'Binh',
  'Chi',
  'Dung',
  'Giang',
  'Ha',
  'Hanh',
  'Khang',
  'Lam',
  'Linh',
  'Long',
  'Minh',
  'Nam',
  'Nhi',
  'Phuc',
  'Quang',
  'Son',
  'Thao',
  'Trang',
  'Tuan',
  'Vy',
  'Yen',
];
const JP_FAMILIES = [
  'Sato',
  'Suzuki',
  'Takahashi',
  'Tanaka',
  'Watanabe',
  'Ito',
  'Yamamoto',
  'Nakamura',
  'Kobayashi',
  'Kato',
  'Yoshida',
  'Yamada',
  'Sasaki',
  'Yamaguchi',
  'Matsumoto',
  'Inoue',
  'Kimura',
  'Shimizu',
  'Hayashi',
  'Saito',
];
const JP_GIVENS = [
  'Haruto',
  'Yui',
  'Ren',
  'Aoi',
  'Sakura',
  'Yuto',
  'Hina',
  'Riku',
  'Mei',
  'Sora',
  'Akari',
  'Daiki',
  'Rin',
  'Kaito',
  'Yuna',
  'Nanami',
  'Shota',
  'Mio',
  'Hinata',
  'Tsubasa',
];
const JAPANESE_GIVEN_NAMES = [
  'Ai',
  'Aiko',
  'Aimi',
  'Aina',
  'Airi',
  'Akane',
  'Akari',
  'Akemi',
  'Aki',
  'Akihiro',
  'Akiko',
  'Akio',
  'Akira',
  'Ami',
  'Aoi',
  'Asuka',
  'Ayaka',
  'Ayako',
  'Ayame',
  'Ayano',
  'Chihiro',
  'Daichi',
  'Daiki',
  'Eiji',
  'Emi',
  'Hana',
  'Haruka',
  'Haruki',
  'Haruto',
  'Hayato',
  'Hikari',
  'Hina',
  'Hiroki',
  'Hiroshi',
  'Honoka',
  'Ichiro',
  'Itsuki',
  'Jun',
  'Kaito',
  'Kana',
  'Kaori',
  'Kazuki',
  'Keiko',
  'Kenji',
  'Kenta',
  'Kokoro',
  'Kohei',
  'Koichi',
  'Koji',
  'Koki',
  'Kosuke',
  'Kota',
  'Kotone',
  'Mai',
  'Maki',
  'Mana',
  'Manami',
  'Mei',
  'Mika',
  'Minato',
  'Mio',
  'Misaki',
  'Miyu',
  'Naoki',
  'Naoya',
  'Natsuki',
  'Natsumi',
  'Noa',
  'Noboru',
  'Nobu',
  'Noriko',
  'Nozomi',
  'Osamu',
  'Ran',
  'Rei',
  'Reiko',
  'Reina',
  'Ren',
  'Rie',
  'Riko',
  'Riku',
  'Rikuto',
  'Rin',
  'Rina',
  'Rio',
  'Risa',
  'Ritsu',
  'Rumi',
  'Ryo',
  'Ryoichi',
  'Ryoko',
  'Ryosuke',
  'Ryota',
  'Ryu',
  'Ryuji',
  'Ryunosuke',
  'Sakura',
  'Saki',
  'Shiori',
  'Shota',
  'Sora',
  'Takumi',
  'Tsubasa',
  'Yui',
  'Yuki',
  'Yuna',
  'Yuto',
];
type NamePools = {
  vietnameseFullNames: string[];
};
const PERSONAS = [
  'student',
  'software engineer',
  'teacher',
  'creator',
  'event staff',
  'study abroad learner',
  'freelancer',
  'human resources specialist',
  'designer',
  'cafe owner',
  'translator',
  'marketing planner',
];
const VN_LOCATIONS = [
  'Ha Noi, Viet Nam',
  'Ho Chi Minh City, Viet Nam',
  'Da Nang, Viet Nam',
  'Hue, Viet Nam',
  'Can Tho, Viet Nam',
  'Tokyo, Japan',
  'Osaka, Japan',
  'Fukuoka, Japan',
];
const JP_LOCATIONS = [
  'Tokyo, Japan',
  'Osaka, Japan',
  'Kyoto, Japan',
  'Fukuoka, Japan',
  'Nagoya, Japan',
  'Ha Noi, Viet Nam',
  'Ho Chi Minh City, Viet Nam',
  'Da Nang, Viet Nam',
];
const INTEREST_NAMES = [
  'Language Exchange',
  'Japanese Culture',
  'Vietnamese Culture',
  'Vietnamese Cuisine',
  'Japanese Food',
  'Anime',
  'Manga',
  'Travel',
  'Photography',
  'Coffee',
  'Books',
  'J-POP',
  'K-POP',
  'Movies',
  'Music',
  'Cooking',
  'Hiking',
  'Study Abroad',
  'Job Hunting',
  'Technology',
  'Design',
  'Startups',
  'Volunteering',
  'Karaoke',
  'Running',
  'Yoga',
  'Tea Ceremony',
  'Calligraphy',
  'Local Events',
  'Career Exchange',
];
const EDUCATIONS = [
  'University of Languages and International Studies',
  'Ha Noi University of Science and Technology',
  'Vietnam National University',
  'RMIT University Vietnam',
  'Tokyo University',
  'Waseda University',
  'Osaka University',
  'Kyoto University',
  'Japanese language school',
  'Vocational college',
  'Self-study',
  'Online courses',
];
const MESSAGE_OPENERS = [
  ['Xin chao, ban dang hoc ngon ngu nao gan day?', 'Hi, what language are you practicing lately?'],
  ['Konnichiwa, cuoi tuan nay ban co ranh trao doi ngon ngu khong?', 'Hi, are you free for language exchange this weekend?'],
  ['Minh thay ban cung thich ca phe, co quan nao hay khong?', 'I saw you like coffee too. Any good cafe recommendations?'],
  ['Ban da tung tham gia event VN-JP nao chua?', 'Have you joined any VN-JP events before?'],
  ['Minh muon luyen kaiwa nhe nhang sau gio lam.', 'I want to practice casual conversation after work.'],
] as const;
const MESSAGE_REPLIES = [
  ['Co, minh thuong hoc buoi toi. Ban muon luyen tieng Viet hay tieng Nhat?', 'Yes, I usually study at night. Do you want to practice Vietnamese or Japanese?'],
  ['Duoc nha, minh co the chuan bi vai chu de ve am thuc va du lich.', 'Sure, I can prepare a few topics about food and travel.'],
  ['Minh moi biet mot quan yen tinh gan trung tam, hop de hoc bai.', 'I know a quiet place near the center, good for studying.'],
  ['Chua nhieu, nen minh muon gap ban moi va hoc cach noi tu nhien hon.', 'Not many yet, so I want to meet new friends and speak more naturally.'],
  ['Hay qua. Minh cung can sua phat am va tu vung hang ngay.', 'Sounds great. I also need help with pronunciation and daily vocabulary.'],
] as const;
const MESSAGE_FOLLOW_UPS = [
  [
    'Minh co the bat dau bang gioi thieu ban than roi chuyen sang {interest}.',
    'We can start with self-introductions, then move to {interest}.',
  ],
  [
    'Neu ban muon, minh se gui truoc vai tu moi de buoi noi chuyen de hon.',
    'If you want, I can send a few words first so the conversation is easier.',
  ],
  [
    'Lan truoc minh noi hoi cham, nen lan nay muon tap phan hoi tu nhien hon.',
    'Last time I spoke a bit slowly, so this time I want to practice more natural replies.',
  ],
  [
    'Ban co hay hoc qua video ngan khong? Minh thay cach do kha de nho.',
    'Do you study with short videos? I find that method easy to remember.',
  ],
  [
    'Minh dang tim mot partner co the sua loi phat am nhe nhang.',
    'I am looking for a partner who can gently correct pronunciation mistakes.',
  ],
  [
    'Cuoi tuan nay minh co the gap o cafe hoac noi online deu duoc.',
    'This weekend I can meet at a cafe or talk online, either is fine.',
  ],
  [
    'Neu noi ve {interest}, ban co cau nao hay dung trong doi song khong?',
    'For {interest}, do you know any phrases people use in daily life?',
  ],
  [
    'Minh se ghi lai tu moi sau buoi chat roi gui lai cho ban.',
    'I will note new words after the chat and send them back to you.',
  ],
  [
    'Ban thich hoc theo hoi dap nhanh hay noi chuyen dai hon mot chut?',
    'Do you prefer quick Q&A practice or a slightly longer conversation?',
  ],
  [
    'Hom nao co event VN-JP phu hop, minh se ru ban tham gia cung.',
    'If I find a good VN-JP event, I will invite you to join.',
  ],
] as const;

function databaseNameFromUri(uri: string) {
  const parsedUri = new URL(uri);
  return parsedUri.pathname.replace(/^\//, '') || undefined;
}

function resolveAtlasConfig() {
  const uri = process.env.MONGO_ATLAS_URI ?? process.env.MONGO_URI;
  const dbName =
    process.env.MONGO_ATLAS_DATABASE_NAME ??
    process.env.MONGO_DATABASE_NAME ??
    (uri ? databaseNameFromUri(uri) : undefined);

  if (!uri) {
    throw new Error('Missing MONGO_ATLAS_URI or MONGO_URI.');
  }

  if (!dbName) {
    throw new Error('Missing MONGO_ATLAS_DATABASE_NAME or database name in URI.');
  }

  const parsedUri = new URL(uri);
  const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(
    parsedUri.hostname,
  );

  if (isLocalHost || dbName.endsWith('_local')) {
    throw new Error('Refusing to enrich a local database with Atlas script.');
  }

  return { uri, dbName };
}

function modeFromArgs() {
  const isApply = process.argv.includes('--apply');
  const isDryRun = process.argv.includes('--dry-run');

  if (isApply === isDryRun) {
    throw new Error('Pass exactly one mode: --dry-run or --apply.');
  }

  return isApply ? 'apply' : 'dry-run';
}

function seededObjectId(seed: string) {
  return new ObjectId(
    createHash('sha256').update(seed).digest('hex').slice(0, 24),
  );
}

function seededImage(seed: string, width: number, height: number) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

function demoEmail(index: number) {
  return `${DEMO_EMAIL_PREFIX}${String(index).padStart(3, '0')}${DEMO_EMAIL_DOMAIN}`;
}

function demoPhone(index: number, nationality: Nationality) {
  const suffix = String(index).padStart(6, '0');
  return nationality === 'VN' ? `+84980${suffix}` : `+81980${suffix}`;
}

function cleanFullName(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{M}\s'.-]/gu, '')
    .trim();
}

async function loadVietnameseFullNames() {
  const filePath = join(process.cwd(), 'temp', 'uit_member.json');

  try {
    const raw = await readFile(filePath, 'utf8');
    const items = JSON.parse(raw) as Array<Record<string, unknown>>;
    const names = items
      .map((item) => cleanFullName(item.full_name))
      .filter((name) => name.length >= 5);

    return [...new Set(names)];
  } catch (error) {
    console.warn(
      `Could not load Vietnamese names from ${filePath}; falling back to generated names: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return [];
  }
}

function isDemoUser(user: Document) {
  return String(user.email ?? '').startsWith(DEMO_EMAIL_PREFIX);
}

function documentDateMs(value: unknown) {
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? value.getTime()
    : 0;
}

function sortCustomersForPlanning(users: Document[]) {
  return [...users].sort((left, right) => {
    const leftIsDemo = isDemoUser(left);
    const rightIsDemo = isDemoUser(right);

    if (leftIsDemo !== rightIsDemo) {
      return leftIsDemo ? 1 : -1;
    }

    if (leftIsDemo && rightIsDemo) {
      return String(left.email ?? '').localeCompare(String(right.email ?? ''));
    }

    const createdDiff =
      documentDateMs(left.created_at) - documentDateMs(right.created_at);
    if (createdDiff !== 0) {
      return createdDiff;
    }

    return String(left._id).localeCompare(String(right._id));
  });
}

function normalizedNationality(value: unknown, fallbackIndex: number): Nationality {
  return value === 'JP' || value === 'VN'
    ? value
    : fallbackIndex % 2 === 0
      ? 'VN'
      : 'JP';
}

function ageForOrdinal(ordinal: number) {
  return 18 + ((ordinal * 7) % 28);
}

function birthDateForAge(age: number, ordinal: number) {
  const currentYear = new Date().getUTCFullYear();
  const month = ordinal % 5;
  const day = 3 + (ordinal % 23);
  return new Date(Date.UTC(currentYear - age, month, day));
}

function isPlaceholderName(name: string) {
  const normalized = name.trim().toLowerCase();
  return (
    normalized.length < 3 ||
    /^[a-z]$/.test(normalized) ||
    /^(test|demo|sample|user|customer|unknown|anonymous)$/i.test(normalized) ||
    normalized.includes(' event organizer')
  );
}

function uniqueGeneratedName(
  nationality: Nationality,
  ordinal: number,
  usedNames: Set<string>,
  namePools: NamePools,
) {
  for (let offset = 0; offset < 1000; offset += 1) {
    const index = ordinal + offset;
    const vietnameseName =
      namePools.vietnameseFullNames[
        index % Math.max(namePools.vietnameseFullNames.length, 1)
      ];
    const name =
      nationality === 'VN' && vietnameseName
        ? vietnameseName
        : nationality === 'VN'
          ? `${VN_FAMILIES[index % VN_FAMILIES.length]} ${
              VN_MIDDLES[Math.floor(index / VN_FAMILIES.length) % VN_MIDDLES.length]
            } ${
              VN_GIVENS[
                Math.floor(index / (VN_FAMILIES.length * VN_MIDDLES.length)) %
                  VN_GIVENS.length
              ]
            }`
          : `${JP_FAMILIES[index % JP_FAMILIES.length]} ${
              JAPANESE_GIVEN_NAMES[
                (index * 7 + Math.floor(index / JP_FAMILIES.length)) %
                  JAPANESE_GIVEN_NAMES.length
              ]
            }`;

    if (!usedNames.has(name)) {
      return name;
    }
  }

  throw new Error('Could not generate a unique customer name.');
}

function languagesFor(nationality: Nationality, ordinal: number) {
  const japaneseLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const vietnameseLevels = ['Beginner', 'Intermediate', 'Advanced'];
  const englishLevels = ['Intermediate', 'Advanced', 'IELTS 6.5', 'IELTS 7.0'];

  if (nationality === 'VN') {
    return [
      { language: 'Vietnamese', level: 'Native' },
      { language: 'Japanese', level: japaneseLevels[ordinal % japaneseLevels.length] },
      { language: 'English', level: englishLevels[ordinal % englishLevels.length] },
    ];
  }

  return [
    { language: 'Japanese', level: 'Native' },
    {
      language: 'Vietnamese',
      level: vietnameseLevels[ordinal % vietnameseLevels.length],
    },
    { language: 'English', level: englishLevels[(ordinal + 1) % englishLevels.length] },
  ];
}

function profileForCustomer(
  userId: ObjectId,
  fullName: string,
  nationality: Nationality,
  ordinal: number,
  now: Date,
): ProfilePlan {
  const persona = PERSONAS[ordinal % PERSONAS.length];
  const locations = nationality === 'VN' ? VN_LOCATIONS : JP_LOCATIONS;
  const location = locations[ordinal % locations.length];
  const occupation =
    persona === 'student'
      ? 'University student'
      : persona === 'creator'
        ? 'Content creator'
        : persona
            .split(' ')
            .map((word) => word[0].toUpperCase() + word.slice(1))
            .join(' ');
  const education = EDUCATIONS[ordinal % EDUCATIONS.length];
  const interestCount = 3 + (ordinal % 4);
  const interestNames = Array.from({ length: interestCount }, (_, index) => {
    return INTEREST_NAMES[(ordinal * 3 + index * 5) % INTEREST_NAMES.length];
  });
  const practiceGoal =
    nationality === 'VN'
      ? 'practice Japanese and meet friends who enjoy Vietnamese culture'
      : 'practice Vietnamese and learn more about daily life in Viet Nam';
  const weekendPlan = interestNames.slice(0, 2).join(' and ');
  const bio = `${fullName} is a ${occupation.toLowerCase()} based in ${location}. Looking to ${practiceGoal}. Usually enjoys ${weekendPlan} on weekends and prefers friendly, practical conversations.`;
  const safeBio = bio.slice(0, MAX_BIO_LENGTH);
  const seed = `${ENRICH_SEED_PREFIX}-${userId.toString()}-${ordinal}`;

  return {
    gender: (['male', 'female', 'other'] as const)[ordinal % 3],
    location,
    occupation,
    education,
    bio: safeBio,
    avatarUrl: seededImage(`${seed}-avatar-nature`, 320, 320),
    coverUrl: seededImage(`${seed}-cover-landscape`, 1400, 420),
    socialLinks: {
      instagram: `@vnjp_${String(ordinal + 1).padStart(3, '0')}`,
      facebook: fullName,
      line: `vnjp_${String(ordinal + 1).padStart(3, '0')}`,
    },
    languages: languagesFor(nationality, ordinal),
    photos: [0, 1, 2].map((photoIndex) => ({
      _id: seededObjectId(`${seed}-photo-id-${photoIndex}`),
      url: seededImage(`${seed}-photo-${photoIndex}`, 700, 900),
      public_id: '',
      is_main: photoIndex === 0,
      uploaded_at: now,
    })),
    matchRate: 68 + ((ordinal * 11) % 33),
    connectionsCount: 5 + ((ordinal * 13) % 96),
    interestNames,
  };
}

function deficientAvatar(value: unknown) {
  const url = typeof value === 'string' ? value.trim() : '';
  return (
    !url ||
    /^\/uploads\/profile\//i.test(url) ||
    /^https:\/\/api\.dicebear\.com\//i.test(url) ||
    /default/i.test(url)
  );
}

function deficientCover(value: unknown) {
  const url = typeof value === 'string' ? value.trim() : '';
  return !url || /^\/uploads\/profile\//i.test(url) || /default/i.test(url);
}

function deficientText(value: unknown) {
  return typeof value !== 'string' || value.trim().length === 0;
}

function ageFromBirthDate(value: unknown) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getUTCFullYear() - value.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - value.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < value.getUTCDate())
  ) {
    age -= 1;
  }

  return age;
}

function shouldRefreshBirthDate(user: Document) {
  const age = ageFromBirthDate(user.birth_date);
  return age === null || age < 18 || age > 45;
}

function deficientMatchRate(value: unknown) {
  return (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < MATCH_RATE_MIN ||
    value > MATCH_RATE_MAX
  );
}

function profileNeedsEnrichment(profile: Document | undefined) {
  return (
    !profile ||
    deficientText(profile.bio) ||
    deficientAvatar(profile.avatar_url) ||
    deficientCover(profile.cover_url) ||
    !Array.isArray(profile.languages) ||
    profile.languages.length === 0 ||
    !Array.isArray(profile.photos) ||
    profile.photos.length === 0 ||
    deficientText(profile.location) ||
    deficientText(profile.occupation) ||
    deficientText(profile.education) ||
    deficientMatchRate(profile.match_rate)
  );
}

function buildCustomerPlans(
  existingUsers: Document[],
  profilesByUserId: Map<string, Document>,
  now: Date,
  namePools: NamePools,
) {
  const usedNames = new Set<string>();
  const existingEmails = new Set(
    existingUsers
      .map((user) => String(user.email ?? '').toLowerCase())
      .filter(Boolean),
  );
  const plans: CustomerPlan[] = [];

  for (let index = 0; index < existingUsers.length; index += 1) {
    const user = existingUsers[index];
    const nationality = normalizedNationality(user.nationality, index);
    const originalFullName = String(user.full_name ?? '').trim();
    const isExistingDemo = isDemoUser(user);
    const shouldRename =
      !originalFullName ||
      isPlaceholderName(originalFullName) ||
      isExistingDemo ||
      usedNames.has(originalFullName);
    const fullName = shouldRename
      ? uniqueGeneratedName(nationality, index, usedNames, namePools)
      : originalFullName;
    usedNames.add(fullName);

    const age = ageForOrdinal(index);
    const birthDate = birthDateForAge(age, index);
    const userId = new ObjectId(String(user._id));
    plans.push({
      id: userId,
      ordinal: index,
      isNew: false,
      isDemo: isExistingDemo,
      email: String(user.email ?? ''),
      phoneNumber: String(user.phone_number ?? ''),
      fullName,
      originalFullName,
      nationality,
      birthDate,
      age,
      profile: profileForCustomer(userId, fullName, nationality, index, now),
    });
  }

  let demoIndex = 1;
  while (plans.length < TARGET_CUSTOMER_COUNT) {
    const email = demoEmail(demoIndex);
    if (!existingEmails.has(email)) {
      const ordinal = plans.length;
      const nationality: Nationality = ordinal % 2 === 0 ? 'VN' : 'JP';
      const id = seededObjectId(`${ENRICH_SEED_PREFIX}-user-${demoIndex}`);
      const fullName = uniqueGeneratedName(
        nationality,
        ordinal,
        usedNames,
        namePools,
      );
      const age = ageForOrdinal(ordinal);
      plans.push({
        id,
        ordinal,
        isNew: true,
        isDemo: true,
        email,
        phoneNumber: demoPhone(demoIndex, nationality),
        fullName,
        nationality,
        birthDate: birthDateForAge(age, ordinal),
        age,
        profile: profileForCustomer(id, fullName, nationality, ordinal, now),
      });
      usedNames.add(fullName);
    }
    demoIndex += 1;
  }

  return plans.map((plan) => {
    const currentProfile = profilesByUserId.get(plan.id.toString());
    return {
      ...plan,
      profileRequiresUpdate:
        plan.isDemo || profileNeedsEnrichment(currentProfile),
    };
  });
}

function userUpdateOps(plans: ReturnType<typeof buildCustomerPlans>, existingById: Map<string, Document>) {
  const ops: AnyBulkWriteOperation<Document>[] = [];

  for (const plan of plans) {
    const existing = existingById.get(plan.id.toString());
    if (plan.isNew) {
      ops.push({
        updateOne: {
          filter: { email: plan.email },
          update: {
            $set: {
              phone_number: plan.phoneNumber,
              full_name: plan.fullName,
              nationality: plan.nationality,
              birth_date: plan.birthDate,
              is_verified: true,
              role: 'customer',
              status: 'active',
              status_updated_at: new Date(),
              last_seen_at: lastSeenFor(plan.ordinal),
            },
            $setOnInsert: {
              _id: plan.id,
              email: plan.email,
              password_hash: DEFAULT_PASSWORD_HASH,
              created_at: joinedAtFor(plan.ordinal),
            },
          },
          upsert: true,
        },
      });
      continue;
    }

    if (!existing) {
      continue;
    }

    const $set: Document = {};
    if (plan.originalFullName !== plan.fullName) {
      $set.full_name = plan.fullName;
    }
    if (shouldRefreshBirthDate(existing) || plan.profileRequiresUpdate) {
      $set.birth_date = plan.birthDate;
    }
    if (Object.keys($set).length > 0) {
      ops.push({
        updateOne: {
          filter: { _id: plan.id },
          update: { $set },
        },
      });
    }
  }

  return ops;
}

function profileUpdateOps(
  plans: ReturnType<typeof buildCustomerPlans>,
  profilesByUserId: Map<string, Document>,
  now: Date,
) {
  const ops: AnyBulkWriteOperation<Document>[] = [];

  for (const plan of plans) {
    const existing = profilesByUserId.get(plan.id.toString());
    const profile = plan.profile;
    const $set: Document = { updated_at: now };

    if (plan.isDemo || !existing || deficientText(existing.bio)) {
      $set.bio = profile.bio;
    }
    if (plan.isDemo || !existing || deficientAvatar(existing.avatar_url)) {
      $set.avatar_url = profile.avatarUrl;
    }
    if (plan.isDemo || !existing || deficientCover(existing.cover_url)) {
      $set.cover_url = profile.coverUrl;
    }
    if (plan.isDemo || !existing || deficientText(existing.location)) {
      $set.location = profile.location;
    }
    if (plan.isDemo || !existing || deficientText(existing.occupation)) {
      $set.occupation = profile.occupation;
    }
    if (plan.isDemo || !existing || deficientText(existing.education)) {
      $set.education = profile.education;
    }
    if (!existing || !existing.gender || plan.isDemo) {
      $set.gender = profile.gender;
    }
    if (
      plan.isDemo ||
      !existing ||
      !Array.isArray(existing.languages) ||
      existing.languages.length === 0
    ) {
      $set.languages = profile.languages;
    }
    if (
      plan.isDemo ||
      !existing ||
      !Array.isArray(existing.photos) ||
      existing.photos.length === 0
    ) {
      $set.photos = profile.photos;
    }
    if (!existing || !existing.social_links || plan.isDemo) {
      $set.social_links = profile.socialLinks;
    }
    if (!existing || typeof existing.age !== 'number' || plan.profileRequiresUpdate) {
      $set.age = plan.age;
    }
    if (!existing || deficientMatchRate(existing.match_rate) || plan.isDemo) {
      $set.match_rate = profile.matchRate;
    }
    if (
      !existing ||
      typeof existing.connections_count !== 'number' ||
      plan.isDemo
    ) {
      $set.connections_count = profile.connectionsCount;
    }

    if (plan.isDemo || !existing || plan.profileRequiresUpdate) {
      ops.push({
        updateOne: {
          filter: { user_id: plan.id },
          update: {
            $set,
            $setOnInsert: { user_id: plan.id },
          },
          upsert: true,
        },
      });
    }
  }

  return ops;
}

function tagOps() {
  return INTEREST_NAMES.map<AnyBulkWriteOperation<Document>>((name) => ({
    updateOne: {
      filter: { name, type: 'interest' },
      update: {
        $setOnInsert: {
          _id: seededObjectId(`${ENRICH_SEED_PREFIX}-tag-${name}`),
          name,
          type: 'interest',
        },
      },
      upsert: true,
    },
  }));
}

function interestOps(
  plans: ReturnType<typeof buildCustomerPlans>,
  tagIdsByName: Map<string, ObjectId>,
) {
  const ops: AnyBulkWriteOperation<Document>[] = [];

  for (const plan of plans) {
    for (const interestName of plan.profile.interestNames) {
      const tagId = tagIdsByName.get(interestName);
      if (!tagId) {
        continue;
      }

      ops.push({
        updateOne: {
          filter: { user_id: plan.id, tag_id: tagId },
          update: {
            $setOnInsert: {
              _id: seededObjectId(
                `${ENRICH_SEED_PREFIX}-interest-${plan.id.toString()}-${tagId.toString()}`,
              ),
              user_id: plan.id,
              tag_id: tagId,
            },
          },
          upsert: true,
        },
      });
    }
  }

  return ops;
}

function pairKey(a: ObjectId, b: ObjectId) {
  return [a.toString(), b.toString()].sort().join(':');
}

function buildMatchPlans(plans: CustomerPlan[], existingMatches: Document[]) {
  const existingByPair = new Map<string, Document>();
  for (const match of existingMatches) {
    if (!match.requester_id || !match.receiver_id) {
      continue;
    }
    existingByPair.set(
      pairKey(new ObjectId(String(match.requester_id)), new ObjectId(String(match.receiver_id))),
      match,
    );
  }

  const matchPlans: MatchPlan[] = [];
  const seenPairs = new Set<string>();

  for (let index = 0; index < plans.length; index += 1) {
    const requester = plans[index];
    for (let step = 1; step <= DIRECT_MATCHES_PER_USER; step += 1) {
      const receiver = plans[(index + step) % plans.length];
      const key = pairKey(requester.id, receiver.id);
      if (requester.id.equals(receiver.id) || seenPairs.has(key)) {
        continue;
      }

      const existing = existingByPair.get(key);
      matchPlans.push({
        id: existing?._id
          ? new ObjectId(String(existing._id))
          : seededObjectId(`${ENRICH_SEED_PREFIX}-match-${key}`),
        requesterId: existing?.requester_id
          ? new ObjectId(String(existing.requester_id))
          : requester.id,
        receiverId: existing?.receiver_id
          ? new ObjectId(String(existing.receiver_id))
          : receiver.id,
        existingMatchId: existing?._id ? new ObjectId(String(existing._id)) : undefined,
      });
      seenPairs.add(key);
    }
  }

  return matchPlans;
}

function matchOps(matchPlans: MatchPlan[], now: Date) {
  return matchPlans.map<AnyBulkWriteOperation<Document>>((match) => ({
    updateOne: {
      filter: match.existingMatchId
        ? { _id: match.existingMatchId }
        : { requester_id: match.requesterId, receiver_id: match.receiverId },
      update: {
        $set: {
          requester_id: match.requesterId,
          receiver_id: match.receiverId,
          status: 'accepted',
        },
        $setOnInsert: {
          _id: match.id,
          seed_key: `${ENRICH_SEED_PREFIX}-match-${pairKey(
            match.requesterId,
            match.receiverId,
          )}`,
          created_at: now,
        },
      },
      upsert: !match.existingMatchId,
    },
  }));
}

function buildDirectConversations(matchPlans: MatchPlan[]) {
  return matchPlans.map<ConversationPlan>((match) => ({
    id: seededObjectId(`${ENRICH_SEED_PREFIX}-conversation-${match.id.toString()}`),
    matchId: match.id,
    type: 'direct',
    title: '',
    participantIds: [match.requesterId, match.receiverId],
  }));
}

function buildGroupConversations(plans: CustomerPlan[]) {
  const groups: ConversationPlan[] = [];
  const groupCount = Math.max(4, Math.floor(plans.length / 20));

  for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
    const start = (groupIndex * 17) % plans.length;
    const participantIds = Array.from({ length: 5 }, (_, offset) => {
      return plans[(start + offset * 3) % plans.length].id;
    });
    const id = seededObjectId(`${ENRICH_SEED_PREFIX}-group-${groupIndex}`);

    groups.push({
      id,
      matchId: seededObjectId(`${ENRICH_SEED_PREFIX}-group-match-${groupIndex}`),
      type: 'group',
      title: [
        'VN-JP Weekend Practice',
        'Cafe Language Circle',
        'Travel and Culture Chat',
        'Study Abroad Tips',
      ][groupIndex % 4],
      participantIds,
      createdBy: participantIds[0],
    });
  }

  return groups;
}

function conversationOps(conversations: ConversationPlan[], now: Date) {
  return conversations.map<AnyBulkWriteOperation<Document>>((conversation) => ({
    updateOne: {
      filter:
        conversation.type === 'direct'
          ? { match_id: conversation.matchId }
          : { seed_key: `${ENRICH_SEED_PREFIX}-group-${conversation.id.toString()}` },
      update: {
        $set: {
          match_id: conversation.matchId,
          type: conversation.type,
          title: conversation.title,
          participant_ids: conversation.participantIds,
          created_by: conversation.createdBy,
          updated_at: now,
          last_message_at: messageTimeFor(conversation.id.toString(), 7),
        },
        $setOnInsert: {
          _id: conversation.id,
          seed_key:
            conversation.type === 'group'
              ? `${ENRICH_SEED_PREFIX}-group-${conversation.id.toString()}`
              : `${ENRICH_SEED_PREFIX}-conversation-${conversation.matchId.toString()}`,
          created_at: now,
        },
      },
      upsert: true,
    },
  }));
}

function messageTimeFor(seed: string, index: number) {
  const hash = createHash('sha256').update(seed).digest();
  const dayOffset = hash[0] % 21;
  const hour = 8 + (hash[1] % 12);
  const minute = (index * 7 + hash[2]) % 60;
  return new Date(Date.UTC(2026, 4, 10 + dayOffset, hour, minute, 0));
}

function directMessagePair(conversationIndex: number, messageIndex: number) {
  if (messageIndex < 2) {
    return messageIndex % 2 === 0
      ? MESSAGE_OPENERS[conversationIndex % MESSAGE_OPENERS.length]
      : MESSAGE_REPLIES[(conversationIndex + 1) % MESSAGE_REPLIES.length];
  }

  const interest =
    INTEREST_NAMES[
      (conversationIndex * 7 + messageIndex * 3) % INTEREST_NAMES.length
    ].toLowerCase();
  const template =
    MESSAGE_FOLLOW_UPS[
      (conversationIndex + messageIndex * 2) % MESSAGE_FOLLOW_UPS.length
    ];

  return [
    template[0].replace('{interest}', interest),
    template[1].replace('{interest}', interest),
  ] as const;
}

function buildDirectMessages(conversations: ConversationPlan[]) {
  const messages: MessagePlan[] = [];

  for (let index = 0; index < conversations.length; index += 1) {
    const conversation = conversations[index];
    const messageCount = 4 + (index % 5);
    const [firstUser, secondUser] = conversation.participantIds;

    for (let messageIndex = 0; messageIndex < messageCount; messageIndex += 1) {
      const isFirstSender = messageIndex % 2 === 0;
      const senderId = isFirstSender ? firstUser : secondUser;
      const pair = directMessagePair(index, messageIndex);
      messages.push({
        seedKey: `${ENRICH_SEED_PREFIX}-message-direct-${conversation.matchId.toString()}-${messageIndex}`,
        conversationId: conversation.id,
        senderId,
        content: pair[0],
        translatedContent: pair[1],
        status: messageIndex < messageCount - 1 ? 'read' : 'sent',
        readBy:
          messageIndex < messageCount - 1
            ? conversation.participantIds
            : [senderId],
        sentAt: messageTimeFor(conversation.id.toString(), messageIndex),
      });
    }
  }

  return messages;
}

function buildGroupMessages(conversations: ConversationPlan[]) {
  const groupTexts = [
    'Moi nguoi chon chu de tuan nay: du lich, am thuc hay kaiwa cong viec?',
    'Minh vote am thuc. Co the so sanh mon an Viet Nam va Nhat Ban.',
    'Hay do. Minh se mang vai cum tu tieng Nhat de cung luyen.',
    'Neu co nguoi moi tham gia, minh se gui lich hen va dia diem cafe.',
    'Tuan sau chung ta thu doi cap de moi nguoi noi nhieu hon nhe.',
    'Ok, minh se ghi lai tu moi va chia se sau buoi hoc.',
  ];

  return conversations.flatMap((conversation, conversationIndex) =>
    groupTexts.map<MessagePlan>((content, messageIndex) => {
      const senderId =
        conversation.participantIds[messageIndex % conversation.participantIds.length];
      return {
        seedKey: `${ENRICH_SEED_PREFIX}-message-group-${conversation.id.toString()}-${messageIndex}`,
        conversationId: conversation.id,
        senderId,
        content,
        translatedContent: '',
        status: 'read',
        readBy: conversation.participantIds,
        sentAt: messageTimeFor(
          `${conversation.id.toString()}-${conversationIndex}`,
          messageIndex,
        ),
      };
    }),
  );
}

function messageOps(messages: MessagePlan[]) {
  return messages.map<AnyBulkWriteOperation<Document>>((message) => ({
    updateOne: {
      filter: { seed_key: message.seedKey },
      update: {
        $set: {
          conversation_id: message.conversationId,
          sender_id: message.senderId,
          content: message.content,
          translated_content: message.translatedContent,
          message_type: 'text',
          status: message.status,
          read_by: message.readBy,
          attachments: [],
          sent_at: message.sentAt,
        },
        $setOnInsert: {
          _id: seededObjectId(message.seedKey),
          seed_key: message.seedKey,
        },
      },
      upsert: true,
    },
  }));
}

function joinedAtFor(ordinal: number) {
  return new Date(Date.UTC(2024 + (ordinal % 3), ordinal % 12, 1 + (ordinal % 24)));
}

function lastSeenFor(ordinal: number) {
  return new Date(Date.now() - (ordinal % 96) * 60 * 60 * 1000);
}

async function backupCollections(db: Db, dbName: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = join(
    process.cwd(),
    '.temp',
    'enrich-demo-data-backups',
    `${dbName}-${timestamp}`,
  );

  await mkdir(backupDir, { recursive: true });

  for (const collectionName of BACKUP_COLLECTIONS) {
    const docs = await db.collection(collectionName).find({}).toArray();
    await writeFile(
      join(backupDir, `${collectionName}.json`),
      JSON.stringify(docs, null, 2),
      'utf8',
    );
  }

  return backupDir;
}

async function bulkWriteIfNeeded(
  collectionName: string,
  db: Db,
  ops: AnyBulkWriteOperation<Document>[],
  mode: 'dry-run' | 'apply',
) {
  if (mode === 'dry-run' || ops.length === 0) {
    return { collectionName, planned: ops.length, modified: 0, upserted: 0 };
  }

  let modified = 0;
  let upserted = 0;
  const collection = db.collection(collectionName);

  for (let index = 0; index < ops.length; index += 500) {
    const chunk = ops.slice(index, index + 500);
    const result = await collection.bulkWrite(chunk, { ordered: false });
    modified += result.modifiedCount;
    upserted += result.upsertedCount;
  }

  return { collectionName, planned: ops.length, modified, upserted };
}

function buildCleanupPlan(
  matchPlans: MatchPlan[],
  conversations: ConversationPlan[],
  messages: MessagePlan[],
): CleanupPlan {
  return {
    matches: {
      collectionName: 'matches',
      filter: {
        seed_key: /^enrich-demo-data-match-/,
        _id: { $nin: matchPlans.map((match) => match.id) },
      },
    },
    conversations: {
      collectionName: 'conversations',
      filter: {
        seed_key: /^enrich-demo-data-/,
        _id: { $nin: conversations.map((conversation) => conversation.id) },
      },
    },
    messages: {
      collectionName: 'messages',
      filter: {
        $and: [
          { seed_key: /^enrich-demo-data-message-/ },
          { seed_key: { $nin: messages.map((message) => message.seedKey) } },
        ],
      },
    },
  };
}

async function cleanupCounts(db: Db, cleanupPlan: CleanupPlan) {
  const entries = Object.values(cleanupPlan);
  const counts = await Promise.all(
    entries.map(async (item) => [
      item.collectionName,
      await db.collection(item.collectionName).countDocuments(item.filter),
    ]),
  );

  return Object.fromEntries(counts) as Record<
    CleanupPlan[keyof CleanupPlan]['collectionName'],
    number
  >;
}

async function cleanupObsoleteSeedData(db: Db, cleanupPlan: CleanupPlan) {
  const entries = Object.values(cleanupPlan);
  const deleted = await Promise.all(
    entries.map(async (item) => {
      const result = await db.collection(item.collectionName).deleteMany(item.filter);
      return [item.collectionName, result.deletedCount] as const;
    }),
  );

  return Object.fromEntries(deleted) as Record<
    CleanupPlan[keyof CleanupPlan]['collectionName'],
    number
  >;
}

async function tagIdsByName(db: Db) {
  const existingTags = await db
    .collection('tags')
    .find({ name: { $in: INTEREST_NAMES }, type: 'interest' })
    .toArray();
  const tagMap = new Map<string, ObjectId>();

  for (const name of INTEREST_NAMES) {
    const existing = existingTags.find((tag) => tag.name === name);
    tagMap.set(
      name,
      existing?._id
        ? new ObjectId(String(existing._id))
        : seededObjectId(`${ENRICH_SEED_PREFIX}-tag-${name}`),
    );
  }

  return tagMap;
}

async function printValidationStats(db: Db, plans: CustomerPlan[]) {
  const customerCount = await db
    .collection('users')
    .countDocuments({ role: { $ne: 'admin' } });
  const missingProfiles = await db
    .collection('users')
    .aggregate([
      { $match: { role: { $ne: 'admin' } } },
      {
        $lookup: {
          from: 'profiles',
          localField: '_id',
          foreignField: 'user_id',
          as: 'profile',
        },
      },
      {
        $match: {
          $or: [
            { profile: { $size: 0 } },
            { 'profile.avatar_url': '' },
            { 'profile.cover_url': '' },
            { 'profile.bio': '' },
            { 'profile.languages': { $size: 0 } },
            { 'profile.photos': { $size: 0 } },
          ],
        },
      },
      { $count: 'count' },
    ])
    .toArray();
  const duplicateNames = await db
    .collection('users')
    .aggregate([
      { $match: { role: { $ne: 'admin' } } },
      { $group: { _id: '$full_name', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'count' },
    ])
    .toArray();
  const userIds = plans.map((plan) => plan.id);
  const acceptedMatches = await db
    .collection('matches')
    .find({
      status: 'accepted',
      $or: [{ requester_id: { $in: userIds } }, { receiver_id: { $in: userIds } }],
    })
    .project({ requester_id: 1, receiver_id: 1 })
    .toArray();
  const directCounts = new Map(plans.map((plan) => [plan.id.toString(), 0]));

  for (const match of acceptedMatches) {
    const requesterId = String(match.requester_id);
    const receiverId = String(match.receiver_id);
    if (directCounts.has(requesterId)) {
      directCounts.set(requesterId, (directCounts.get(requesterId) ?? 0) + 1);
    }
    if (directCounts.has(receiverId)) {
      directCounts.set(receiverId, (directCounts.get(receiverId) ?? 0) + 1);
    }
  }

  const minDirectMatches = Math.min(...Array.from(directCounts.values()));

  console.log(
    JSON.stringify(
      {
        customerCount,
        missingProfileGroups: missingProfiles[0]?.count ?? 0,
        duplicateNameGroups: duplicateNames[0]?.count ?? 0,
        minDirectMatches,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const mode = modeFromArgs();
  const { uri, dbName } = resolveAtlasConfig();
  const client = new MongoClient(uri);
  const now = new Date();
  const namePools = {
    vietnameseFullNames: await loadVietnameseFullNames(),
  };

  await client.connect();

  try {
    const db = client.db(dbName);
    const existingUsersRaw = await db
      .collection('users')
      .find({ role: { $ne: 'admin' } })
      .toArray();
    const existingUsers = sortCustomersForPlanning(existingUsersRaw);
    const existingById = new Map(
      existingUsers.map((user) => [String(user._id), user]),
    );
    const existingProfiles = await db.collection('profiles').find({}).toArray();
    const profilesByUserId = new Map(
      existingProfiles.map((profile) => [String(profile.user_id), profile]),
    );
    const customerPlans = buildCustomerPlans(
      existingUsers,
      profilesByUserId,
      now,
      namePools,
    );
    const plannedCustomerIds = customerPlans.map((plan) => plan.id);
    const existingMatches = await db
      .collection('matches')
      .find({
        $or: [
          { requester_id: { $in: plannedCustomerIds } },
          { receiver_id: { $in: plannedCustomerIds } },
        ],
      })
      .toArray();
    const matchPlans = buildMatchPlans(customerPlans, existingMatches);
    const directConversations = buildDirectConversations(matchPlans);
    const groupConversations = buildGroupConversations(customerPlans);
    const conversations = [...directConversations, ...groupConversations];
    const messages = [
      ...buildDirectMessages(directConversations),
      ...buildGroupMessages(groupConversations),
    ];
    const cleanupPlan = buildCleanupPlan(matchPlans, conversations, messages);
    const plannedCleanup = await cleanupCounts(db, cleanupPlan);
    const tagMap = await tagIdsByName(db);
    const operations = [
      {
        collection: 'users',
        ops: userUpdateOps(customerPlans, existingById),
      },
      {
        collection: 'profiles',
        ops: profileUpdateOps(customerPlans, profilesByUserId, now),
      },
      { collection: 'tags', ops: tagOps() },
      { collection: 'user_interests', ops: interestOps(customerPlans, tagMap) },
      { collection: 'matches', ops: matchOps(matchPlans, now) },
      { collection: 'conversations', ops: conversationOps(conversations, now) },
      { collection: 'messages', ops: messageOps(messages) },
    ];

    console.log(
      JSON.stringify(
        {
          mode,
          targetDb: dbName,
          existingCustomers: existingUsers.length,
          plannedCustomers: customerPlans.length,
          plannedNewCustomers: customerPlans.filter((plan) => plan.isNew).length,
          vietnameseNamesLoaded: namePools.vietnameseFullNames.length,
          japaneseGivenNamesLoaded: JAPANESE_GIVEN_NAMES.length,
          plannedProfileEnrichments: customerPlans.filter(
            (plan) => plan.profileRequiresUpdate,
          ).length,
          plannedAcceptedDirectMatches: matchPlans.length,
          plannedDirectConversations: directConversations.length,
          plannedGroupConversations: groupConversations.length,
          plannedMessages: messages.length,
          plannedCleanup,
          operations: Object.fromEntries(
            operations.map((item) => [item.collection, item.ops.length]),
          ),
          warning:
            existingUsers.length > TARGET_CUSTOMER_COUNT
              ? `Existing customer count is already above ${TARGET_CUSTOMER_COUNT}; script will enrich all customers and will not delete anyone.`
              : '',
        },
        null,
        2,
      ),
    );

    if (mode === 'apply') {
      const backupDir = await backupCollections(db, dbName);
      console.log(`Backup written to ${backupDir}`);
      const deleted = await cleanupObsoleteSeedData(db, cleanupPlan);
      console.log(JSON.stringify({ cleanupDeleted: deleted }));
    }

    for (const item of operations) {
      const result = await bulkWriteIfNeeded(item.collection, db, item.ops, mode);
      console.log(JSON.stringify(result));
    }

    if (mode === 'apply') {
      await printValidationStats(db, customerPlans);
    }
  } finally {
    await client.close();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
