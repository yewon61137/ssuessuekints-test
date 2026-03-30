import os

filepath = r"d:\김예원⭐❤️🐸\ssuessuekints-test\magazine.html"

new_grid = """      <div class="article-grid">

        <a href="/magazine/knitting-history-spy.html" class="article-card">
          <span class="article-card-category i18n" data-ko="뜨개 역사" data-en="Knitting History" data-ja="編み物の歴史">뜨개 역사</span>
          <h3 class="i18n" data-ko="전쟁터의 스파이와 뜨개질 암호 — 실 뭉치 속에 숨겨진 역사" data-en="Spies and Knitting Codes — Secrets Hidden in the Wool" data-ja="戦場のス파이와 뜨개질 암호 — 毛糸の中に隠された秘密の歴史">전쟁터의 스파이와 뜨개질 암호 — 실 뭉치 속에 숨겨진 역사</h3>
          <p class="i18n" data-ko="제1차, 2차 세계대전 당시 스파이들이 뜨개질을 암호 전달 수단으로 사용했다는 놀라운 사실을 알고 계신가요?" data-en="Did you know spies used knitting as a code during WWI and WWII? Discover the fascinating history of knitting in espionage." data-ja="第一次・第二次世界大戦中、スパイが編み物を暗号伝達手段として使用していた驚きの事実をご存知ですか？">제1차, 2차 세계대전 당시 스파이들이 뜨개질을 암호 전달 수단으로 사용했다는 놀라운 사실을 알고 계신가요?</p>
          <span class="article-card-meta i18n" data-ko="2026년 3월 30일" data-en="March 30, 2026" data-ja="2026年3月30日">2026년 3월 30일</span>
          <span class="article-card-read i18n" data-ko="읽기 →" data-en="Read →" data-ja="読む →">읽기 →</span>
        </a>

        <a href="/magazine/science-of-knitting-physics.html" class="article-card">
          <span class="article-card-category i18n" data-ko="뜨개 과학" data-en="Knitting Science" data-ja="編み物の科学">뜨개 과학</span>
          <h3 class="i18n" data-ko="뜨개질의 물리 — 왜 니트는 신축성이 좋을까?" data-en="The Physics of Knitting — Why is it so Stretchy?" data-ja="編み物の物理 — なぜニットは伸縮性が良いのか？">뜨개질의 물리 — 왜 니트는 신축성이 좋을까?</h3>
          <p class="i18n" data-ko="니트 편물의 독특한 신축성 뒤에 숨겨진 루프의 기하학과 NASA의 우주 안테나 기술까지, 과학적으로 분석합니다." data-en="Explore the geometry of loops behind stretchiness and how NASA uses knitting for space antennas." data-ja="ニット独特の伸縮性の背後に隠されたループの幾何学と、NASAの宇宙アンテナ技術まで科学的に分析します。">니트 편물의 독특한 신축성 뒤에 숨겨진 루프의 기하학과 NASA의 우주 안테나 기술까지, 과학적으로 분석합니다.</p>
          <span class="article-card-meta i18n" data-ko="2026년 3월 27일" data-en="March 27, 2026" data-ja="2026年3月27日">2026년 3월 27일</span>
          <span class="article-card-read i18n" data-ko="읽기 →" data-en="Read →" data-ja="読む →">읽기 →</span>
        </a>

        <a href="/magazine/knitting-mental-health.html" class="article-card">
          <span class="article-card-category i18n" data-ko="뜨개 라이프" data-en="Knitting Life" data-ja="編み物ライフ">뜨개 라이프</span>
          <h3 class="i18n" data-ko="뜨개질은 마음의 요가입니다 — 멘탈 헬스와 뜨개질의 관계" data-en="Knitting is Yoga for the Mind — The Mental Health Connection" data-ja="編み物は心のヨガです — メンタルヘルスと編み物の関係">뜨개질은 마음의 요가입니다 — 멘탈 헬스와 뜨개질의 관계</h3>
          <p class="i18n" data-ko="스트레스 해소와 우울감 완화에 뜨개질이 어떤 과학적 도움을 주는지, '움직이는 명상'의 효과를 알아봅니다." data-en="Discover how knitting helps with stress and anxiety through rhythmic repetition and the psychology of flow." data-ja="ストレス解消や抑うつの緩和に編み物がどのような科学的助けを与えるのか、「動く瞑想」の効果を探ります。">스트레스 해소와 우울감 완화에 뜨개질이 어떤 과학적 도움을 주는지, '움직이는 명상'의 효과를 알아봅니다.</p>
          <span class="article-card-meta i18n" data-ko="2026년 3월 24일" data-en="March 24, 2026" data-ja="2026년 3월 24일">2026년 3월 24일</span>
          <span class="article-card-read i18n" data-ko="읽기 →" data-en="Read →" data-ja="読む →">읽기 →</span>
        </a>

        <a href="/magazine/2026-crochet-fashion-trends.html" class="article-card">
          <span class="article-card-category i18n" data-ko="뜨개 패션" data-en="Knitting Fashion" data-ja="編み物ファッション">뜨개 패션</span>
          <h3 class="i18n" data-ko="2026년 런웨이를 장식한 크로셰 트렌드 분석" data-en="Analysis of 2026 Runway Crochet Trends" data-ja="2026年ランウェイを飾ったクロシェ・トレンド分析">2026년 런웨이를 장식한 크로셰 트렌드 분석</h3>
          <p class="i18n" data-ko="맥시멀리즘, 지속 가능한 럭셔리, 기하학적 패턴의 귀환까지 — 2026년 최신 크로셰 패션을 분석합니다." data-en="Maximalism, sustainable luxury, and geometric patterns — explore the latest crochet trends from Paris and Milan." data-ja="マキシマリズム、サステナブル・ラグジュアリー、幾何学模様の帰還まで、2026年の最新トレンドを分析します。">맥시멀리즘, 지속 가능한 럭셔리, 기하학적 패턴의 귀환까지 — 2026년 최신 크로셰 패션을 분석합니다.</p>
          <span class="article-card-meta i18n" data-ko="2026년 3월 20일" data-en="March 20, 2026" data-ja="2026년 3월 20일">2026년 3월 20일</span>
          <span class="article-card-read i18n" data-ko="읽기 →" data-en="Read →" data-ja="読む →">읽기 →</span>
        </a>

        <a href="/magazine/sustainable-knitting-slow-fashion.html" class="article-card">
          <span class="article-card-category i18n" data-ko="뜨개 패션" data-en="Knitting Fashion" data-ja="編み物ファッション">뜨개 패션</span>
          <h3 class="i18n" data-ko="지속 가능한 패션의 미래 — 뜨개질은 왜 완벽한 '슬로우 패션'인가?" data-en="Future of Sustainable Fashion — Why Knitting is Ultimate Slow Fashion" data-ja="持続可能なファッションの未来 — なぜ編み物は究極のスローファッションなのか？">지속 가능한 패션의 미래 — 뜨개질은 왜 완벽한 '슬로우 패션'인가?</h3>
          <p class="i18n" data-ko="패스트 패션의 대안으로서 수작업의 의미와 환경 친화적인 뜨개질 라이프를 제안합니다." data-en="Why hand-knitting is the perfect eco-friendly alternative to fast fashion, focusing on quality and lifecycle." data-ja="ファストファッションの代案としての手仕事の意味と、환경에 優しい編み物ライフ를提案します。">패스트 패션의 대안으로서 수작업의 의미와 환경 친화적인 뜨개질 라이프를 제안합니다.</p>
          <span class="article-card-meta i18n" data-ko="2026년 3월 17일" data-en="March 17, 2026" data-ja="2026년 3월 17일">2026년 3월 17일</span>
          <span class="article-card-read i18n" data-ko="읽기 →" data-en="Read →" data-ja="読む →">읽기 →</span>
        </a>

        <a href="/magazine/aran-knitting-symbols.html" class="article-card">
          <span class="article-card-category i18n" data-ko="뜨개 역사" data-en="Knitting History" data-ja="編み物の歴史">뜨개 역사</span>
          <h3 class="i18n" data-ko="행운을 비는 매듭 — 아란 무늬 속에 담긴 상징과 역사" data-en="Knots for Luck — Symbols and History of Aran Patterns" data-ja="幸運を祈る結び目 — アラン模様に込められた象徴と歴史">행운을 비는 매듭 — 아란 무늬 속에 담긴 상징과 역사</h3>
          <p class="i18n" data-ko="아일랜드 아란 제도의 거친 바다에서 탄생한 케이블, 다이아몬드, 허니콤 무늬 속에 담긴 상징을 알아봅니다." data-en="Discover the hidden meanings of cables, diamonds, and honeycombs born in the Aran Islands of Ireland." data-ja="アイルランドのアラン諸島で誕生したケーブル、ダイヤモンド、ハニカム模様に込められた象徴を探ります。">아일랜드 아란 제도의 거친 바다에서 탄생한 케이블, 다이아몬드, 허니콤 무늬 속에 담긴 상징을 알아봅니다.</p>
          <span class="article-card-meta i18n" data-ko="2026년 3월 14일" data-en="March 14, 2026" data-ja="2026년 3월 14일">2026년 3월 14일</span>
          <span class="article-card-read i18n" data-ko="읽기 →" data-en="Read →" data-ja="読む →">읽기 →</span>
        </a>

        <a href="/magazine/crochet-basics.html" class="article-card">
          <span class="article-card-category i18n" data-ko="코바늘 기법" data-en="Crochet Techniques" data-ja="かぎ針技法">코바늘 기법</span>
          <h3 class="i18n" data-ko="코바늘 기초 기법 완전 정리 — 짧은뜨기부터 한길긴뜨기까지" data-en="Complete Guide to Basic Crochet Stitches — From Single to Treble Crochet" data-ja="かぎ針基本技法完全ガイド — 細編みから長々編みまで">코바늘 기초 기법 완전 정리 — 짧은뜨기부터 한길긴뜨기까지</h3>
          <p class="i18n" data-ko="사슬뜨기, 짧은뜨기, 긴뜨기, 한길긴뜨기, 증코·감코, 원형뜨기까지. 코바늘을 처음 잡는 분도 따라할 수 있는 단계별 완전 가이드입니다." data-en="Chain, single crochet, double crochet, treble crochet, increases/decreases, and working in the round. A step-by-step complete guide for first-time crocheters." data-ja="くさり編み、細編み、長編み、長々編み、増目・減目、輪編みまで。かぎ針を初めて持つ方でも実践できるステップ別完全ガイドです。">사슬뜨기, 짧은뜨기, 긴뜨기, 한길긴뜨기, 증코·감코, 원형뜨기까지. 코바늘을 처음 잡는 분도 따라할 수 있는 단계별 완전 가이드입니다.</p>
          <span class="article-card-meta i18n" data-ko="2026년 3월 10일" data-en="March 10, 2026" data-ja="2026년 3월 10일">2026년 3월 10일</span>
          <span class="article-card-read i18n" data-ko="읽기 →" data-en="Read →" data-ja="読む →">읽기 →</span>
        </a>

        <a href="/magazine/gauge-swatch-guide.html" class="article-card">
          <span class="article-card-category i18n" data-ko="기법 · 테크닉" data-en="Technique" data-ja="テクニック">기법 · 테크닉</span>
          <h3 class="i18n" data-ko="게이지 스와치 완벽 가이드 — 뜨개 사이즈 맞추는 법" data-en="The Complete Gauge Swatch Guide — Getting Your Size Right" data-ja="ゲージスウォッチ完全ガイド — サイズを合わせる方法">게이지 스와치 완벽 가이드 — 뜨개 사이즈 맞추는 법</h3>
          <p class="i18n" data-ko="게이지 스와치가 왜 필요한지, 어떻게 뜨고 측정하는지 완벽하게 정리했습니다. 코 수·단 수 조절 계산법과 블로킹의 관계까지." data-en="Everything about why gauge swatches matter, how to knit and measure them, and the relationship between row counts, stitch counts, and blocking." data-ja="ゲージスウォッチがなぜ必要か、どう編み・測定するか、目数・段数の調整計算法과ブロッキングの関係まで完全にまとめました。">게이지 스와치가 왜 필요한지, 어떻게 뜨고 측정하는지 완벽하게 정리했습니다. 코 수·단 수 조절 계산법과 블로킹의 관계까지.</p>
          <span class="article-card-meta i18n" data-ko="2026년 3월 5일" data-en="March 5, 2026" data-ja="2026년 3월 5일">2026년 3월 5일</span>
          <span class="article-card-read i18n" data-ko="읽기 →" data-en="Read →" data-ja="読む →">읽기 →</span>
        </a>

        <a href="/magazine/amigurumi-beginners.html" class="article-card">
          <span class="article-card-category i18n" data-ko="코바늘 기법" data-en="Crochet Techniques" data-ja="かぎ針技法">코바늘 기법</span>
          <h3 class="i18n" data-ko="아미구루미 입문 가이드 — 귀여운 인형 처음 만들기" data-en="Amigurumi Beginner's Guide — Make Your First Cute Plush" data-ja="アミグルミ入門ガイド — はじめてのかわいいぬいぐるみ">아미구루미 입문 가이드 — 귀여운 인형 처음 만들기</h3>
          <p class="i18n" data-ko="매직링, 짧은뜨기, 증코·감코로 만드는 아미구루미 기초. 기본 구 만들기부터 파츠 연결, 눈 달기, 솜 넣기까지 단계별로 안내합니다." data-en="Amigurumi basics with magic ring, single crochet, increases and decreases. Step-by-step from making a basic sphere to joining parts, attaching eyes, and stuffing." data-ja="マジックリング、細編み、増目・減目でアミグルミの基礎。基本の球の作り方からパーツの接合、目つけ、綿入れまでステップ別にご案内します。">매직링, 짧은뜨기, 증코·감코로 만드는 아미구루미 기초. 기본 구 만들기부터 파츠 연결, 눈 달기, 솜 넣기까지 단계별로 안내합니다.</p>
          <span class="article-card-meta i18n" data-ko="2026년 2월 28일" data-en="February 28, 2026" data-ja="2026년 2월 28일">2026년 2월 28일</span>
          <span class="article-card-read i18n" data-ko="읽기 →" data-en="Read →" data-ja="読む →">읽기 →</span>
        </a>

        <a href="/magazine/yarn-care-guide.html" class="article-card">
          <span class="article-card-category i18n" data-ko="실 & 관리" data-en="Yarn & Care" data-ja="糸・ケア">실 & 관리</span>
          <h3 class="i18n" data-ko="소재별 뜨개 완성품 세탁·보관 완벽 가이드" data-en="Washing & Storing Your Knits by Yarn Fiber" data-ja="素材別ニット完成品 洗濯・保管完全ガイド">소재별 뜨개 완성품 세탁·보관 완벽 가이드</h3>
          <p class="i18n" data-ko="울, 메리노, 면, 아크릴, 알파카, 린넨 — 소재별 세탁 방법과 보관법을 총정리했습니다. 블로킹 3가지 방법도 함께 소개합니다." data-en="Wool, merino, cotton, acrylic, alpaca, linen — complete wash and care guide by fiber. Includes all 3 blocking methods." data-ja="ウール、メリノ、綿、アクリル、アルパカ、リネン — 素材別の洗濯・保管方法を総まとめ。ブロッキング3種類の方法もご紹介します。">울, 메리노, 면, 아크릴, 알파카, 린넨 — 소재별 세탁 방법과 보관법을 총정리했습니다. 블로킹 3가지 방법도 함께 소개합니다.</p>
          <span class="article-card-meta i18n" data-ko="2026년 2월 20일" data-en="February 20, 2026" data-ja="2026년 2월 20일">2026년 2월 20일</span>
          <span class="article-card-read i18n" data-ko="읽기 →" data-en="Read →" data-ja="読む →">읽기 →</span>
        </a>

        <a href="/magazine/2026-knitting-trends.html" class="article-card">
          <span class="article-card-category i18n" data-ko="트렌드" data-en="Trends" data-ja="トレンド">트렌드</span>
          <h3 class="i18n" data-ko="2026 뜨개질 트렌드 총정리 — 올해 주목할 스타일 7가지" data-en="2026 Knitting Trends — 7 Styles to Watch This Year" data-ja="2026年編み物トレンドまとめ — 今年注目の7スタイル">2026 뜨개질 트렌드 총정리 — 올해 주목할 스타일 7가지</h3>
          <p class="i18n" data-ko="점보 얀·암 니팅, 컬러 블로킹, 텍스처 믹스, 지속가능 소재, 모자이크 코바늘, 모던 그래니 스퀘어, 픽셀 컬러웍까지." data-en="Jumbo yarn & arm knitting, color blocking, texture mix, sustainable fibers, mosaic crochet, modern granny squares, and pixel colorwork." data-ja="ジャンボヤーン・アームニッティング、カラーブロッキング、テクスチャーミックス、サステナブル素材、モザイクかぎ針、モダングラニースクエア、ピクセルカラーワークまで。">점보 얀·암 니팅, 컬러 블로킹, 텍스처 믹스, 지속가능 소재, 모자이크 코바늘, 모던 그래니 스퀘어, 픽셀 컬러웍까지.</p>
          <span class="article-card-meta i18n" data-ko="2026년 2월 10일" data-en="February 10, 2026" data-ja="2026년 2월 10일">2026년 2월 10일</span>
          <span class="article-card-read i18n" data-ko="읽기 →" data-en="Read →" data-ja="読む →">읽기 →</span>
        </a>

        <a href="/magazine/beginners-guide.html" class="article-card">
          <span class="article-card-category i18n" data-ko="입문 가이드" data-en="Beginner's Guide" data-ja="入門ガイド">입문 가이드</span>
          <h3 class="i18n" data-ko="뜨개질 입문 완전 가이드 — 도구 선택부터 첫 작품까지" data-en="Complete Beginner's Guide to Knitting — From Tools to Your First Project" data-ja="編み物入門完全ガイド — 道具選びから最初の作品まで">뜨개질 입문 완전 가이드 — 도구 선택부터 첫 작품까지</h3>
          <p class="i18n" data-ko="필요한 도구, 실 선택, 기초 기법, 첫 프로젝트 추천까지. 뜨개질을 처음 시작하는 분을 위한 단계별 완전 입문 가이드입니다." data-en="Tools, yarn selection, basic stitches, and first project recommendations. A step-by-step complete beginner's guide for anyone starting knitting." data-ja="必要な道具、糸の選び方、基本技法、最初のプロジェクトまで。編み物を始めたての方のためのステップ別完全入門ガイドです。">필요한 도구, 실 선택, 기초 기법, 첫 프로젝트 추천까지. 뜨개질을 처음 시작하는 분을 위한 단계별 완전 입문 가이드입니다.</p>
          <span class="article-card-meta i18n" data-ko="2026년 1월 30일" data-en="January 30, 2026" data-ja="2026년 1월 30일">2026년 1월 30일</span>
          <span class="article-card-read i18n" data-ko="읽기 →" data-en="Read →" data-ja="読む →">읽기 →</span>
        </a>

        <a href="/magazine/crochet-vs-knitting.html" class="article-card">
          <span class="article-card-category i18n" data-ko="기법 비교" data-en="Technique Comparison" data-ja="기법 비교">기법 비교</span>
          <h3 class="i18n" data-ko="코바늘 vs 대바늘 나에게 맞는 기법은?" data-en="Crochet vs Knitting Which Technique is Right for You?" data-ja="かぎ針 vs 棒針 あなたに合う技法は？">코바늘 vs 대바늘 나에게 맞는 기법은?</h3>
          <p class="i18n" data-ko="도구, 기법, 난이도, 완성품 느낌까지 — 코바늘과 대바늘의 차이점을 한눈에 비교하고 나에게 맞는 선택을 해보세요." data-en="Tools, techniques, difficulty, and fabric feel — compare crochet and knitting at a glance and find your best fit." data-ja="道具、技法、難易度、完成品の風合いまで — かぎ針と棒針の違いを一目比較して、自分に合う選択をしてみましょう。">도구, 기법, 난이도, 완성품 느낌까지 — 코바늘과 대바늘의 차이점을 한눈에 비교하고 나에게 맞는 선택을 해보세요.</p>
          <span class="article-card-meta i18n" data-ko="2026년 1월 15일" data-en="January 15, 2026" data-ja="2026년 1월 15일">2026년 1월 15일</span>
          <span class="article-card-read i18n" data-ko="읽기 →" data-en="Read →" data-ja="読む →">읽기 →</span>
        </a>

        <a href="/magazine/yarn-weight-guide.html" class="article-card">
          <span class="article-card-category i18n" data-ko="실 & 도구" data-en="Yarn & Tools" data-ja="糸・道具">실 & 도구</span>
          <h3 class="i18n" data-ko="실 굵기 완벽 가이드 — Lace부터 Super Bulky까지" data-en="Complete Yarn Weight Guide — From Lace to Super Bulky" data-ja="糸の太さ完全ガイド — LaceからSuper Bulkyまで">실 굵기 완벽 가이드 — Lace부터 Super Bulky까지</h3>
          <p class="i18n" data-ko="Lace, Fingering, DK, Worsted, Chunky, Super Bulky — 7가지 실 굵기의 특징과 적합한 프로젝트를 상세히 정리했습니다." data-en="Lace, Fingering, DK, Worsted, Chunky, Super Bulky — characteristics and recommended projects for 7 yarn weights, explained in detail." data-ja="Lace、Fingering、DK、Worsted、Chunky、Super Bulky — 7種類の糸の太さの特徴と適したプロジェクトを詳しくまとめました。">Lace, Fingering, DK, Worsted, Chunky, Super Bulky — 7가지 실 굵기의 특징과 적합한 프로젝트를 상세히 정리했습니다.</p>
          <span class="article-card-meta i18n" data-ko="2026년 1월 5일" data-en="January 5, 2026" data-ja="2026년 1월 5일">2026년 1월 5일</span>
          <span class="article-card-read i18n" data-ko="읽기 →" data-en="Read →" data-ja="読む →">읽기 →</span>
        </a>

      </div>"""

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the entire grid block
import re
pattern = re.compile(r'<div class="article-grid">.*?</div>', re.DOTALL)
new_content = pattern.sub(new_grid, content, count=1)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)
print("Updated magazine.html grid")
