import type { User, ChatRoom, Event } from "@/types";

export const INTERESTS = [
  "コーヒーを飲みながらチャット",
  "スポーツ",
  "アニメ/漫画",
  "グルメ探索",
  "旅行",
  "テクノロジー",
  "音楽",
  "写真",
  "ゲーム",
  "文学",
  "料理",
  "映画",
];

export const PURPOSES = [
  { value: "language_exchange", label: "言語交換" },
  { value: "friendship", label: "友達作り" },
  { value: "networking", label: "ネットワーキング" },
  { value: "event", label: "イベント探し" },
];

export const JAPANESE_LEVELS = ["N5", "N4", "N3", "N2", "N1", "Basic", "Native"];
export const VIETNAMESE_LEVELS = ["Basic", "A1", "A2", "B1", "B2", "C1", "Native"];
export const CITIES = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Khác"];

export const MOCK_USERS: User[] = [
  {
    id: "1",
    fullName: "Tanaka Hiroshi",
    email: "tanaka@example.com",
    phone: "+81901234567",
    nationality: "Japanese",
    gender: "male",
    birthDate: "1998-04-15",
    occupation: "Software Engineer",
    city: "Hà Nội",
    japaneseLevel: "Native",
    vietnameseLevel: "A2",
    purposes: ["language_exchange", "friendship"],
    interests: ["コーヒーを飲みながらチャット", "旅行", "音楽"],
    bio: "Xin chào! Tôi là Hiroshi, đến từ Osaka. Tôi đang học tiếng Việt và muốn tìm bạn để luyện tập. Hãy cùng nhau khám phá Hà Nội nhé! 🎌",
    avatarUrl: "https://api.dicebear.com/7.x/personas/svg?seed=hiroshi",
    likeRate: 87,
    connectionsCount: 24,
    joinedAt: "2024-03-10",
  },
  {
    id: "2",
    fullName: "Nguyễn Minh Anh",
    email: "minhanh@example.com",
    phone: "+84901234567",
    nationality: "Vietnamese",
    gender: "female",
    birthDate: "2000-08-22",
    occupation: "Sinh viên",
    city: "Hà Nội",
    japaneseLevel: "N3",
    vietnameseLevel: "Native",
    purposes: ["language_exchange", "networking"],
    interests: ["アニメ/漫画", "音楽", "旅行", "コーヒーを飲みながらチャット"],
    bio: "こんにちは！私はMinhAnhです。日本語を勉強しています。一緒に言語交換しましょう！",
    avatarUrl: "https://api.dicebear.com/7.x/personas/svg?seed=minhanh",
    likeRate: 92,
    connectionsCount: 31,
    joinedAt: "2024-02-15",
  },
  {
    id: "3",
    fullName: "Yamamoto Yuki",
    email: "yuki@example.com",
    phone: "+81807654321",
    nationality: "Japanese",
    gender: "female",
    birthDate: "1997-12-01",
    occupation: "Teacher",
    city: "Hà Nội",
    japaneseLevel: "Native",
    vietnameseLevel: "B1",
    purposes: ["friendship", "event"],
    interests: ["料理", "写真", "旅行", "グルメ探索"],
    bio: "Yuki đây! Tôi yêu thích ẩm thực Việt Nam và muốn học thêm về văn hóa Việt. Cùng nấu ăn và khám phá nhé 🌸",
    avatarUrl: "https://api.dicebear.com/7.x/personas/svg?seed=yuki",
    likeRate: 95,
    connectionsCount: 18,
    joinedAt: "2024-04-01",
  },
];

export const MOCK_CURRENT_USER: User = {
  id: "me",
  fullName: "Trần Mạnh Đức",
  email: "duc@example.com",
  phone: "+84987654321",
  nationality: "Vietnamese",
  gender: "male",
  birthDate: "2002-01-15",
  occupation: "Sinh viên CNTT",
  city: "Hà Nội",
  japaneseLevel: "N4",
  vietnameseLevel: "Native",
  purposes: ["language_exchange", "friendship"],
  interests: ["テクノロジー", "ゲーム", "アニメ/漫画", "コーヒーを飲みながらチャット"],
  bio: "Mình đang học tiếng Nhật và muốn kết bạn với người Nhật để luyện tập. Mình thích anime và công nghệ!",
  avatarUrl: "https://api.dicebear.com/7.x/personas/svg?seed=duc",
  likeRate: 78,
  connectionsCount: 12,
  joinedAt: "2024-05-01",
};

export const MOCK_CHAT_ROOMS: ChatRoom[] = [
  {
    id: "chat1",
    participants: [MOCK_USERS[0]],
    lastMessage: {
      id: "m1",
      senderId: "1",
      content: "こんにちは！元気ですか？",
      timestamp: "2024-05-10T10:30:00",
      status: "read",
    },
    unreadCount: 2,
    isGroup: false,
  },
  {
    id: "chat2",
    participants: [MOCK_USERS[1]],
    lastMessage: {
      id: "m2",
      senderId: "me",
      content: "Xin chào bạn! Bạn có muốn luyện tiếng Nhật không?",
      timestamp: "2024-05-09T15:00:00",
      status: "read",
    },
    unreadCount: 0,
    isGroup: false,
  },
];

export const MOCK_EVENTS: Event[] = [
  {
    id: "e1",
    title: "Giao lưu Nhật-Việt tại Hà Nội",
    description: "Buổi giao lưu văn hóa Nhật Bản - Việt Nam với các hoạt động thú vị",
    date: "2024-05-25T14:00:00",
    location: "Trung tâm Văn hóa Nhật Bản, Hà Nội",
    interestedCount: 45,
    isInterested: false,
  },
  {
    id: "e2",
    title: "Language Exchange Party",
    description: "Cùng luyện tập tiếng Nhật và tiếng Việt trong không khí vui vẻ",
    date: "2024-06-01T18:00:00",
    location: "The Note Coffee, Hoàn Kiếm, Hà Nội",
    interestedCount: 28,
    isInterested: true,
  },
];
