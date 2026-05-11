import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-200">
        {/* 1 - Logo */}
        <Link href="/" className="text-base font-semibold text-gray-900 tracking-tight">
          Connect VN-JP
        </Link>
        {/* 2, 3 - Nav buttons */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            ログイン
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 text-sm font-semibold text-white rounded-md transition-colors"
            style={{ backgroundColor: "#1B4332" }}
          >
            新規登録
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-8">
        <div className="text-center max-w-2xl">
          {/* 4 - Main headline */}
          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
            シンプルにつながる。<br />
            未来を創る。
          </h1>

          {/* 5 - Description */}
          <p className="text-base text-gray-600 leading-relaxed mb-10 max-w-md mx-auto">
            ベトナム人と日本人の言語交換、友人作り、本格的な文化的パートナーシップを
            直接つなぐプラットフォーム。
          </p>

          {/* 6, 7 - CTA buttons */}
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3 text-sm font-semibold text-white rounded-md transition-colors"
              style={{ backgroundColor: "#1B4332" }}
            >
              今すぐ始める →
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center px-8 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              サインイン
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}