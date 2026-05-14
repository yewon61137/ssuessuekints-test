const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const magazineDir = path.join(root, 'magazine');
const site = 'https://ssuessueknits.com';
const publisher = 'SSUESSUE KNITS';
const today = '2026-05-14';

const articles = [
  {
    slug: 'beginners-guide',
    date: '2026-01-30',
    category: '입문 가이드',
    title: '뜨개질 입문 완전 가이드: 도구 선택부터 첫 작품까지',
    description: '뜨개질을 처음 시작하는 사람을 위한 준비물, 코바늘과 대바늘 선택, 첫 프로젝트 추천, 실수 해결법을 단계별로 정리했습니다.',
    intro: '뜨개질은 실과 바늘만 있으면 시작할 수 있지만, 실제로 첫 작품을 완성하려면 어떤 도구를 사야 하는지, 어떤 실이 연습에 좋은지, 어디서부터 배워야 하는지 정리되어 있어야 합니다. 이 글은 처음 뜨개질을 시작하는 사람이 불필요한 시행착오를 줄이고 작은 완성품까지 도달할 수 있도록 만든 입문 안내서입니다.',
    why: '처음부터 비싼 바늘 세트나 어려운 의류 도안을 고르면 손에 맞지 않는 도구와 복잡한 계산 때문에 쉽게 지칩니다. 입문 단계의 목표는 멋진 작품 하나보다 손의 감각을 익히고, 코 수를 세고, 틀렸을 때 다시 고치는 경험을 쌓는 것입니다.',
    how: '코바늘은 5mm 안팎의 바늘과 밝은색 중간 굵기 실로 시작하면 코가 잘 보여 연습하기 좋습니다. 대바늘은 4.5mm에서 5.5mm 사이의 줄바늘을 추천합니다. 첫 작품은 코스터, 머플러, 헤어밴드처럼 사각형이나 긴 직사각형으로 끝나는 것이 좋습니다.',
    pitfalls: '초보자가 가장 많이 겪는 문제는 코 수가 늘거나 줄어드는 일, 장력이 일정하지 않은 일, 실을 너무 세게 잡아 바늘이 움직이지 않는 일입니다. 한 단을 뜰 때마다 코 수를 확인하고, 완성 속도보다 손의 힘을 일정하게 유지하는 데 집중하세요.',
    checklist: ['밝은색 중간 굵기 실 1볼', '손에 맞는 바늘 1개 또는 줄바늘 1쌍', '가위와 돗바늘', '코 수를 표시할 마커', '작은 첫 프로젝트 도안'],
    extra: [
      {
        title: '첫 2주 연습 플랜',
        body: [
          '1~3일차에는 매듭 만들기와 사슬뜨기 또는 겉뜨기만 반복하며 손의 힘을 일정하게 만드는 데 집중합니다. 4~7일차에는 10cm 정사각형 샘플을 떠서 코 수가 유지되는지 확인하세요. 2주차에는 코스터, 수세미, 헤어밴드처럼 작은 완성품을 하나 정해 처음부터 끝까지 마무리합니다.',
          '처음부터 예쁜 작품을 목표로 잡기보다, 실을 잡는 손과 바늘을 움직이는 손이 자연스럽게 협업하도록 만드는 것이 중요합니다. 같은 동작을 반복하는 시간이 쌓이면 도안을 읽는 부담도 줄어듭니다.'
        ],
        table: {
          headers: ['기간', '연습 목표', '확인할 점'],
          rows: [
            ['1~3일차', '기본 손동작 익히기', '실을 너무 세게 잡지 않는지 확인'],
            ['4~7일차', '작은 스와치 뜨기', '시작 코 수와 끝 코 수가 같은지 확인'],
            ['2주차', '첫 소품 완성', '실 정리와 마무리까지 경험']
          ]
        }
      },
      {
        title: '첫 구매 예산을 줄이는 방법',
        body: [
          '입문자는 바늘 세트, 고급 실, 다양한 부자재를 한 번에 사지 않는 편이 좋습니다. 중간 굵기 실 1볼과 바늘 1개, 가위, 돗바늘만 있어도 첫 소품은 충분히 만들 수 있습니다. 손에 맞는 바늘 소재를 알기 전까지는 낱개 구매가 더 합리적입니다.',
          '실은 어두운색보다 밝은 단색을 고르세요. 검정, 네이비, 털이 긴 실은 코가 잘 보이지 않아 초보 단계에서는 실수를 찾기 어렵습니다.'
        ]
      }
    ],
    faq: [
      ['코바늘과 대바늘 중 무엇부터 시작하면 좋나요?', '손에 익히기 쉬운 쪽은 코바늘입니다. 다만 의류나 니트 조직을 목표로 한다면 대바늘도 초반부터 함께 연습해도 좋습니다.'],
      ['바늘 세트를 바로 사도 되나요?', '처음에는 낱개 바늘을 몇 개 써본 뒤 손에 맞는 소재와 브랜드를 고르는 편이 안전합니다.'],
      ['첫 작품은 얼마나 걸리나요?', '코스터는 하루 안에도 가능하고, 머플러는 하루 30분 기준으로 1~3주 정도 걸립니다.']
    ],
    related: ['yarn-weight-guide', 'gauge-swatch-guide', 'reading-patterns']
  },
  {
    slug: 'yarn-weight-guide',
    date: '2026-01-05',
    category: '실과 도구',
    title: '실 굵기 완벽 가이드: Lace부터 Super Bulky까지',
    description: '뜨개실 굵기별 특징, 권장 바늘, 게이지, 어울리는 프로젝트와 실 대체 시 확인할 기준을 정리했습니다.',
    intro: '실 굵기는 완성품의 크기, 무게, 드레이프, 작업 속도를 모두 바꿉니다. 같은 도안이라도 가는 실로 뜨면 섬세하고 오래 걸리며, 굵은 실로 뜨면 빠르게 완성되지만 두껍고 무거워질 수 있습니다.',
    why: '도안의 권장 실을 그대로 쓰지 않을 때는 실 굵기와 게이지를 먼저 맞춰야 합니다. 무게가 같은 100g이라도 레이스 실은 길이가 매우 길고, 슈퍼 벌키 실은 길이가 짧기 때문에 필요한 볼 수가 완전히 달라집니다.',
    how: '입문자는 Worsted 또는 Aran 굵기를 선택하면 코가 잘 보여 실수를 찾기 쉽습니다. 양말이나 장갑은 Fingering, 가벼운 가디건은 DK, 빠른 겨울 소품은 Bulky가 잘 맞습니다. 실 라벨의 권장 바늘과 10cm 게이지를 반드시 확인하세요.',
    pitfalls: '실 굵기만 맞고 소재가 다르면 결과가 달라집니다. 울은 탄성이 있어 형태를 잡기 쉽고, 면은 시원하지만 늘어질 수 있으며, 아크릴은 관리가 쉽지만 통기성이 낮을 수 있습니다. 굵기와 소재를 함께 판단해야 합니다.',
    checklist: ['도안의 권장 굵기 확인', '실 라벨의 권장 바늘 확인', '100g당 길이 확인', '염색 로트 번호 확인', '게이지 스와치 제작'],
    extra: [
      {
        title: '실 굵기별 선택표',
        body: [
          '아래 표는 처음 실을 고를 때 기준으로 삼기 좋은 간단한 분류입니다. 제조사마다 권장 바늘과 게이지가 조금씩 다를 수 있으므로, 실제 구매 전에는 실 라벨을 함께 확인해야 합니다.'
        ],
        table: {
          headers: ['굵기', '잘 맞는 작품', '초보 난이도'],
          rows: [
            ['Lace / Fingering', '숄, 양말, 섬세한 소품', '높음'],
            ['DK', '가벼운 의류, 모자, 아기용품', '보통'],
            ['Worsted / Aran', '머플러, 비니, 첫 의류', '낮음'],
            ['Bulky / Super Bulky', '빠른 겨울 소품, 담요', '낮음, 단 무게 주의']
          ]
        }
      },
      {
        title: '실 대체 계산 예시',
        body: [
          '도안이 10cm에 20코인 Worsted 실을 기준으로 쓰였는데, 내가 고른 실은 10cm에 18코가 나온다면 같은 코 수로 뜰 때 완성품이 더 커집니다. 이때는 게이지 스와치를 기준으로 시작 코 수를 줄여야 합니다.',
          '예를 들어 도안 시작 코가 100코라면 100 x 18 / 20 = 90코로 보정할 수 있습니다. 단, 무늬 반복 단위가 4코라면 88코 또는 92코처럼 반복 단위에 맞춰 조정해야 합니다.'
        ]
      }
    ],
    faq: [
      ['DK와 Worsted를 서로 바꿔 써도 되나요?', '소품은 가능할 때도 있지만 의류는 크기가 달라질 수 있어 게이지 계산이 필요합니다.'],
      ['초보자에게 가장 쉬운 굵기는 무엇인가요?', 'Worsted 또는 Aran이 가장 무난합니다. 코가 선명하고 진행 속도도 적당합니다.'],
      ['실을 살 때 몇 퍼센트 더 사야 하나요?', '스와치와 마무리, 실수 보정을 고려해 10~15% 정도 여유를 두는 편이 좋습니다.']
    ],
    related: ['yarn-fiber-guide', 'winter-yarn-guide', 'gauge-swatch-guide']
  },
  {
    slug: 'gauge-swatch-guide',
    date: '2026-03-05',
    category: '기법',
    title: '게이지 스와치 완벽 가이드: 뜨개 사이즈 맞추는 법',
    description: '게이지 스와치를 왜 떠야 하는지, 어떻게 측정하는지, 코 수와 단 수를 보정하는 계산법까지 정리했습니다.',
    intro: '게이지는 10cm 안에 들어가는 코 수와 단 수입니다. 작은 숫자처럼 보이지만, 옷이나 모자처럼 치수가 중요한 작품에서는 완성 크기를 결정하는 가장 중요한 기준입니다.',
    why: '도안 게이지가 10cm에 20코인데 내 게이지가 18코라면, 같은 100코를 떠도 완성 폭은 50cm가 아니라 약 55.6cm가 됩니다. 작은 차이가 전체 폭과 길이에 누적되므로 스와치를 생략하면 완성 후에 사이즈가 맞지 않을 수 있습니다.',
    how: '스와치는 측정할 10cm보다 크게, 보통 15cm 이상으로 뜹니다. 도안과 같은 실, 같은 바늘, 같은 기법으로 뜬 뒤 실제 작품과 같은 방식으로 세탁하거나 블로킹한 다음 중앙 10cm를 잽니다. 가장자리는 말리거나 장력이 달라질 수 있어 측정에서 제외합니다.',
    pitfalls: '스와치를 너무 작게 뜨거나 세탁 전 수치만 기록하면 실제 완성품과 달라질 수 있습니다. 특히 울, 면, 알파카는 세탁과 건조 후 길이와 폭이 달라질 수 있으므로 최종 상태에서 측정해야 합니다.',
    checklist: ['15cm 이상 스와치 뜨기', '도안과 같은 기법 사용', '세탁 또는 블로킹 후 측정', '중앙 10cm 코 수 기록', '단 수도 함께 기록'],
    extra: [
      {
        title: '게이지 보정 공식',
        body: [
          '가로 코 수를 보정할 때는 도안 코 수에 내 게이지를 곱하고 도안 게이지로 나눕니다. 단 수 보정도 같은 방식으로 계산할 수 있습니다.',
          '공식: 보정 코 수 = 도안 코 수 x 내 10cm 코 수 / 도안 10cm 코 수. 예를 들어 도안 20코, 내 게이지 18코, 도안 시작 100코라면 90코가 됩니다.'
        ],
        table: {
          headers: ['상황', '의미', '조정'],
          rows: [
            ['내 코 수가 더 많다', '더 촘촘하게 뜨고 있음', '바늘을 키우거나 코 수를 늘려 계산'],
            ['내 코 수가 더 적다', '더 느슨하게 뜨고 있음', '바늘을 줄이거나 코 수를 줄여 계산'],
            ['단 수만 다르다', '세로 길이가 달라짐', '암홀, 소매, 총장 구간에서 단 수 보정']
          ]
        }
      },
      {
        title: '측정할 때 흔한 실수',
        body: [
          '스와치 가장자리까지 포함해 재면 실제보다 코 수가 적거나 많게 나올 수 있습니다. 반드시 중앙 10cm를 기준으로 재고, 0.5코처럼 애매한 숫자도 반올림하지 말고 그대로 기록하세요.',
          '세탁 후 늘어나는 실이라면 세탁 전 수치가 아니라 건조 후 수치를 기준으로 계산해야 합니다. 완성품이 실제로 겪을 상태를 스와치에도 똑같이 적용하는 것이 핵심입니다.'
        ]
      }
    ],
    faq: [
      ['게이지가 도안보다 촘촘하면 어떻게 하나요?', '바늘 호수를 키워 다시 스와치를 떠보세요. 그래도 맞지 않으면 코 수 계산으로 보정합니다.'],
      ['코 수만 맞으면 되나요?', '의류는 단 수도 중요합니다. 암홀, 소매산, 총장처럼 세로 치수가 필요한 부분에 영향을 줍니다.'],
      ['소품도 스와치가 필요한가요?', '정확한 치수가 필요한 모자, 장갑, 양말은 필요합니다. 수세미나 장식 소품은 생략해도 됩니다.']
    ],
    related: ['yarn-weight-guide', 'blocking-guide', 'toolkit']
  },
  {
    slug: 'reading-patterns',
    date: '2026-04-11',
    category: '기법',
    title: '뜨개 도안 읽는 법: 기호, 약어, 차트 해설',
    description: '뜨개 도안의 구성, 게이지 정보, 사이즈 표기, 반복 구간, 코바늘과 대바늘 약어, 차트 읽는 방향을 설명합니다.',
    intro: '처음 도안을 열면 k2, p1, yo, k2tog 같은 약어와 괄호가 암호처럼 보입니다. 하지만 도안은 일정한 규칙으로 쓰이기 때문에 구조를 이해하면 훨씬 쉽게 읽을 수 있습니다.',
    why: '도안을 제대로 읽지 못하면 실이나 바늘을 잘못 준비하거나, 사이즈별 숫자를 중간에 바꿔 읽거나, 반복 구간을 놓쳐 전체 코 수가 틀어질 수 있습니다. 작업 전 도안 전체를 한 번 읽는 습관이 중요합니다.',
    how: '먼저 완성 치수, 재료, 게이지, 약어 목록, 특수 기법, 본문 지시, 마무리 순서로 훑습니다. 여러 사이즈가 괄호로 표시된 경우 시작 전에 내 사이즈 숫자만 표시해두세요. 차트는 대체로 아래에서 위로 읽고, 평면 뜨기는 홀수 단과 짝수 단의 읽는 방향이 달라집니다.',
    pitfalls: 'repeat from * to end는 별표 뒤 구간을 끝까지 반복하라는 뜻입니다. [k2, p2] x 5는 대괄호 안을 다섯 번 반복합니다. RS는 겉면, WS는 안면이므로 같은 기호라도 단의 방향에 따라 의미가 달라질 수 있습니다.',
    checklist: ['완성 치수 먼저 확인', '내 사이즈 숫자 표시', '약어 목록 확인', '게이지 스와치 제작', '반복 구간과 차트 방향 표시'],
    extra: [
      {
        title: '도안 첫 페이지에서 먼저 볼 것',
        body: [
          '도안을 받으면 바로 1단부터 뜨지 말고, 완성 치수와 게이지, 사용 실, 바늘 호수, 약어표를 먼저 확인하세요. 특히 의류 도안은 완성 치수와 실제 몸 치수 사이의 여유분인 ease가 중요합니다.',
          '내가 만들 사이즈를 정한 뒤에는 괄호 안 숫자 중 해당 사이즈만 형광펜이나 메모로 표시해두는 것이 좋습니다. 중간에 다른 사이즈 숫자를 따라가면 코 수가 크게 틀어집니다.'
        ],
        table: {
          headers: ['표기 예시', '읽는 법', '주의점'],
          rows: [
            ['CO 80 (88, 96) sts', 'S는 80코, M은 88코, L은 96코', '시작 전에 사이즈 하나만 표시'],
            ['*k2, p2; rep from *', '별표 뒤 구간을 반복', '반복 끝나는 지점 확인'],
            ['RS / WS', '겉면 / 안면', '차트 기호 의미가 달라질 수 있음']
          ]
        }
      },
      {
        title: '차트 읽기 실전 순서',
        body: [
          '차트는 보통 아래에서 위로 읽습니다. 평면 뜨기에서는 겉면 단은 오른쪽에서 왼쪽, 안면 단은 왼쪽에서 오른쪽으로 읽습니다. 원형 뜨기는 모든 단을 오른쪽에서 왼쪽으로 읽는 경우가 많습니다.',
          '차트 옆의 범례는 도안마다 다를 수 있습니다. 같은 빈칸이라도 어떤 도안에서는 겉뜨기, 다른 도안에서는 무늬 없음으로 쓰일 수 있으므로 범례를 먼저 확인하세요.'
        ]
      }
    ],
    faq: [
      ['영문 도안은 꼭 번역해야 하나요?', '기본 약어만 익히면 전체 번역 없이도 읽을 수 있습니다. 약어표를 옆에 두고 시작하세요.'],
      ['차트는 어디서부터 읽나요?', '대부분 아래에서 위로 읽습니다. 평면 뜨기는 겉면 단은 오른쪽에서 왼쪽, 안면 단은 왼쪽에서 오른쪽입니다.'],
      ['픽셀 도안과 일반 도안은 무엇이 다른가요?', '픽셀 도안은 각 칸이 색상 배치를 뜻하고, 일반 도안은 코의 기법과 형태를 지시합니다.']
    ],
    related: ['knitting-abbreviations', 'colorwork-basics', 'gauge-swatch-guide']
  },
  {
    slug: 'crochet-basics',
    date: '2026-04-02',
    category: '코바늘',
    title: '코바늘 기초 기법 완전 정리',
    description: '사슬뜨기, 짧은뜨기, 긴뜨기, 빼뜨기, 매직링까지 코바늘 입문자가 알아야 할 기본 기법을 정리했습니다.',
    intro: '코바늘은 하나의 바늘로 루프를 만들고 통과시키며 형태를 쌓아가는 기법입니다. 작은 소품부터 인형, 가방, 의류까지 만들 수 있어 입문자에게 성취감이 빠른 편입니다.',
    why: '기초 기법의 이름과 쓰임을 알면 도안을 읽는 속도가 빨라집니다. 특히 사슬뜨기와 짧은뜨기는 대부분의 코바늘 작품에서 출발점이 되므로 손에 익혀두면 이후 기법도 훨씬 쉽게 배울 수 있습니다.',
    how: '사슬뜨기로 기초 코를 만들고, 짧은뜨기로 단단한 조직을 연습하세요. 긴뜨기는 높이가 있어 빠르게 면적을 넓힐 수 있고, 빼뜨기는 단을 연결하거나 가장자리를 정리할 때 사용합니다. 원형 작품은 매직링으로 중앙 구멍을 줄일 수 있습니다.',
    pitfalls: '초보자는 기초 사슬을 너무 세게 떠서 다음 단에 바늘이 들어가지 않는 경우가 많습니다. 사슬은 살짝 여유 있게 만들고, 매 단 끝에서 코 수를 확인해 좌우가 좁아지지 않게 하세요.',
    checklist: ['사슬뜨기 30코 연습', '짧은뜨기 사각 스와치', '긴뜨기 스와치', '원형 매직링 연습', '단 끝 코 수 확인'],
    faq: [
      ['코바늘은 몇 호로 시작하면 좋나요?', '5mm 안팎의 바늘과 중간 굵기 실이 가장 보기 쉽습니다.'],
      ['짧은뜨기와 긴뜨기의 차이는 무엇인가요?', '짧은뜨기는 단단하고 낮으며, 긴뜨기는 높고 부드럽게 면적이 넓어집니다.'],
      ['매직링이 꼭 필요한가요?', '인형이나 원형 모티프처럼 중심 구멍을 작게 만들고 싶을 때 유용합니다.']
    ],
    related: ['amigurumi-beginners', 'crochet-vs-knitting', 'reading-patterns']
  },
  {
    slug: 'crochet-vs-knitting',
    date: '2026-04-02',
    category: '입문 가이드',
    title: '코바늘 vs 대바늘: 나에게 맞는 기법은?',
    description: '코바늘과 대바늘의 도구, 조직감, 난이도, 어울리는 작품을 비교해 처음 시작할 기법을 고르는 기준을 안내합니다.',
    intro: '뜨개질을 시작할 때 가장 먼저 만나는 선택지는 코바늘과 대바늘입니다. 둘 다 실로 천을 만드는 기법이지만 손의 움직임, 완성 조직, 어울리는 프로젝트가 꽤 다릅니다.',
    why: '자신에게 맞는 기법을 고르면 연습이 훨씬 오래갑니다. 빠른 완성과 작은 소품을 원하면 코바늘, 부드러운 의류와 니트 조직을 원하면 대바늘이 잘 맞는 경우가 많습니다.',
    how: '코바늘은 바늘 하나로 작업하며 코가 빠져도 복구가 쉽습니다. 대바늘은 여러 코가 바늘 위에 걸려 있어 처음엔 조심스럽지만, 메리야스 조직처럼 부드러운 니트 원단을 만들기 좋습니다.',
    pitfalls: '코바늘이 무조건 쉽고 대바늘이 무조건 어렵다고 볼 수는 없습니다. 인형처럼 입체 조립이 많은 코바늘 작품은 어려울 수 있고, 가터뜨기 머플러처럼 단순한 대바늘 작품은 매우 쉽습니다.',
    checklist: ['완성하고 싶은 작품 정하기', '선호하는 조직감 확인', '작은 샘플 둘 다 떠보기', '손목 부담 비교', '도안 접근성 확인'],
    faq: [
      ['둘 중 하나만 배워도 되나요?', '가능합니다. 다만 둘 다 알면 도안 선택 폭이 넓어집니다.'],
      ['옷은 어떤 기법이 더 좋나요?', '일반적인 니트 의류는 대바늘이 부드럽고 드레이프가 좋습니다.'],
      ['가방은 어떤 기법이 좋나요?', '단단한 형태가 필요한 가방은 코바늘이 잘 맞습니다.']
    ],
    related: ['beginners-guide', 'crochet-basics', 'needle-types-guide']
  },
  {
    slug: 'amigurumi-beginners',
    date: '2026-04-02',
    category: '코바늘',
    title: '아미구루미 입문 가이드: 코바늘 인형 처음 시작하기',
    description: '아미구루미를 처음 뜨는 사람을 위해 준비물, 매직링, 코 늘림과 줄임, 솜 넣기, 조립 팁을 정리했습니다.',
    intro: '아미구루미는 코바늘로 만드는 작은 인형과 입체 소품을 말합니다. 짧은뜨기를 원형으로 반복해 형태를 만들기 때문에 기초만 알면 비교적 빠르게 첫 작품을 완성할 수 있습니다.',
    why: '아미구루미는 완성품이 작아 성취감이 빠르고 선물용으로도 좋습니다. 다만 코 수를 정확히 세고 솜을 균일하게 넣어야 형태가 예쁘게 나오므로 기본 습관이 중요합니다.',
    how: '매직링으로 시작해 짧은뜨기를 원형으로 뜨고, 일정한 위치에서 코를 늘리거나 줄여 공 모양을 만듭니다. 코 마커로 단 시작점을 표시하고, 솜은 한 번에 많이 넣기보다 조금씩 나눠 넣습니다.',
    pitfalls: '실을 너무 느슨하게 뜨면 솜이 비쳐 보이고, 너무 단단하게 뜨면 손이 아프고 형태가 딱딱해집니다. 인형용은 권장 바늘보다 조금 작은 바늘을 쓰면 조직이 촘촘해집니다.',
    checklist: ['면사 또는 아크릴 실', '권장보다 약간 작은 코바늘', '솜', '안전눈 또는 자수실', '돗바늘과 코 마커'],
    faq: [
      ['처음 만들기 좋은 모양은 무엇인가요?', '공, 작은 동물 얼굴, 키링처럼 부품이 적은 도안이 좋습니다.'],
      ['안전눈은 언제 끼우나요?', '머리 부분을 닫기 전에 위치를 확인하고 끼워야 합니다.'],
      ['솜은 얼마나 넣어야 하나요?', '겉면이 울지 않고 손으로 눌렀을 때 탄성이 느껴질 정도가 적당합니다.']
    ],
    related: ['crochet-basics', 'yarn-fiber-guide', 'reading-patterns']
  },
  {
    slug: 'needle-types-guide',
    date: '2026-04-05',
    category: '실과 도구',
    title: '뜨개 바늘 종류 완전 정리',
    description: '대바늘, 줄바늘, 장갑바늘, 코바늘의 형태와 나무, 금속, 대나무, 플라스틱 소재별 특징을 비교했습니다.',
    intro: '바늘은 단순한 도구처럼 보이지만 소재와 형태에 따라 손의 피로, 코의 미끄러짐, 완성 속도가 달라집니다. 자신에게 맞는 바늘을 찾으면 뜨개 시간이 훨씬 편해집니다.',
    why: '같은 실을 사용해도 금속 바늘은 빠르게 미끄러지고, 나무 바늘은 코를 잡아주며, 대나무 바늘은 가볍고 부드럽습니다. 초보자는 코가 쉽게 빠지지 않는 소재가 안정적입니다.',
    how: '평면 머플러는 단바늘이나 줄바늘 모두 가능하지만, 큰 작품은 무게가 분산되는 줄바늘이 편합니다. 양말이나 소매처럼 작은 원통은 장갑바늘 또는 짧은 줄바늘을 사용합니다. 코바늘은 손잡이 모양과 목 길이가 손에 맞는지 확인하세요.',
    pitfalls: '처음부터 모든 호수 세트를 구매하면 쓰지 않는 바늘이 많아질 수 있습니다. 가장 자주 쓰는 4mm, 4.5mm, 5mm 안팎을 먼저 써보고 손에 맞는 소재를 정하는 것이 좋습니다.',
    checklist: ['자주 쓰는 바늘 호수 확인', '나무와 금속 소재 비교', '줄바늘 케이블 유연성 확인', '손잡이 그립감 확인', '보관 케이스 준비'],
    faq: [
      ['초보자에게 금속 바늘은 어렵나요?', '실이 너무 잘 미끄러질 수 있어 처음에는 나무나 대나무가 편한 경우가 많습니다.'],
      ['줄바늘은 평면 뜨기도 가능한가요?', '가능합니다. 코가 빠질 위험이 적고 무게가 분산되어 편합니다.'],
      ['코바늘 손잡이는 꼭 필요하나요?', '오래 뜰수록 손잡이가 있는 바늘이 손목 부담을 줄여줄 수 있습니다.']
    ],
    related: ['beginners-guide', 'knitting-tools-accessories', 'yarn-weight-guide']
  },
  {
    slug: 'yarn-fiber-guide',
    date: '2026-04-08',
    category: '실과 도구',
    title: '실 소재별 특성 완전 가이드',
    description: '울, 메리노, 알파카, 면, 리넨, 아크릴, 나일론 혼방 등 뜨개실 소재의 장단점과 프로젝트별 추천을 정리했습니다.',
    intro: '실을 고를 때 굵기만큼 중요한 것이 소재입니다. 울과 면은 같은 굵기라도 탄성, 무게, 보온성, 세탁 방법이 완전히 다릅니다.',
    why: '소재를 잘못 고르면 도안은 맞아도 착용감이 달라질 수 있습니다. 여름 옷에 보온성이 높은 울을 쓰거나, 형태 유지가 중요한 모자에 탄성이 낮은 면을 쓰면 원하는 결과가 나오기 어렵습니다.',
    how: '울은 탄성이 좋아 의류와 모자에 적합하고, 메리노는 피부에 닿는 작품에 좋습니다. 알파카는 부드럽고 따뜻하지만 늘어질 수 있어 혼방이 안정적입니다. 면과 리넨은 여름 소품과 가방에 좋고, 아크릴은 세탁이 쉬워 선물용으로 실용적입니다.',
    pitfalls: '고급 소재가 항상 좋은 선택은 아닙니다. 자주 세탁해야 하는 아이 용품은 관리 쉬운 혼방이나 아크릴이 낫고, 늘어짐이 걱정되는 큰 의류는 알파카 단독보다 울 혼방이 안전합니다.',
    checklist: ['착용 계절 확인', '피부에 닿는지 확인', '세탁 빈도 확인', '탄성 필요 여부 확인', '실 라벨의 혼용률 확인'],
    faq: [
      ['민감한 피부에는 어떤 실이 좋나요?', '메리노, 면, 부드러운 아크릴처럼 자극이 적은 소재를 먼저 고려하세요.'],
      ['가방에는 어떤 실이 좋나요?', '면, 리넨, 탄탄한 혼방처럼 늘어짐이 적은 소재가 좋습니다.'],
      ['양말실에 나일론이 들어가는 이유는 무엇인가요?', '뒤꿈치와 발끝의 마모를 견디도록 내구성을 높이기 위해서입니다.']
    ],
    related: ['yarn-weight-guide', 'winter-yarn-guide', 'yarn-care-guide']
  },
  {
    slug: 'blocking-guide',
    date: '2026-04-14',
    category: '마무리',
    title: '블로킹이란? 완성도를 높이는 뜨개 마무리 기술',
    description: '습식 블로킹, 분무 블로킹, 스팀 블로킹의 차이와 소재별 주의사항, 도구, 단계별 방법을 설명합니다.',
    intro: '블로킹은 완성한 편물을 물, 습기, 열, 고정핀으로 정리해 모양과 치수를 안정시키는 과정입니다. 같은 작품도 블로킹을 거치면 무늬가 열리고 가장자리가 정돈됩니다.',
    why: '레이스 숄, 가디건 조각, 모티프 연결 작품은 블로킹 전후 차이가 큽니다. 코의 불균형이 완화되고 도안에서 의도한 치수에 가까워져 마감 품질이 좋아집니다.',
    how: '습식 블로킹은 물에 담갔다가 수건으로 물기를 제거하고 핀으로 고정해 말립니다. 분무 블로킹은 물을 뿌려 형태를 잡는 방식이고, 스팀 블로킹은 열과 수증기로 빠르게 정리합니다. 소재에 따라 열에 약한 실은 스팀을 피해야 합니다.',
    pitfalls: '아크릴은 높은 열에 녹거나 형태가 영구 변형될 수 있습니다. 울도 강하게 비비면 펠팅이 생길 수 있으므로 조심스럽게 눌러 물기를 빼세요. 핀은 녹슬지 않는 제품을 사용해야 얼룩이 남지 않습니다.',
    checklist: ['세탁 가능한 소재인지 확인', '블로킹 매트 준비', '스테인리스 핀 사용', '완성 치수 확인', '완전히 마른 뒤 핀 제거'],
    faq: [
      ['모든 작품에 블로킹이 필요한가요?', '수세미 같은 실용 소품은 생략해도 되지만, 의류와 레이스는 권장합니다.'],
      ['스팀 블로킹은 안전한가요?', '울에는 조심스럽게 가능하지만 아크릴은 열 변형 위험이 있어 주의해야 합니다.'],
      ['블로킹 후 다시 세탁하면 모양이 풀리나요?', '일부는 풀릴 수 있어 세탁 후 다시 가볍게 형태를 잡아 말리는 것이 좋습니다.']
    ],
    related: ['gauge-swatch-guide', 'yarn-care-guide', 'yarn-fiber-guide']
  },
  {
    slug: 'knitting-abbreviations',
    date: '2026-04-17',
    category: '기법',
    title: '뜨개 약어 완전 정리: 코바늘, 대바늘, 일본식 기호',
    description: '영문 뜨개 도안에서 자주 쓰는 대바늘과 코바늘 약어, 반복 기호, 일본식 차트 해석 기준을 정리했습니다.',
    intro: '뜨개 도안은 지면을 줄이고 반복을 명확히 하기 위해 약어를 많이 사용합니다. 약어를 외우기보다 자주 쓰이는 구조를 이해하면 새로운 도안도 쉽게 읽을 수 있습니다.',
    why: 'k, p, sc, dc처럼 기본 약어는 거의 모든 도안에 등장합니다. 반대로 특수 기법은 도안마다 정의가 다를 수 있으므로 해당 도안의 약어표를 먼저 확인하는 습관이 필요합니다.',
    how: '대바늘은 k, p, yo, k2tog, ssk, pm, sm, RS, WS를 먼저 익히세요. 코바늘은 ch, sc, hdc, dc, tr, sl st, inc, dec, MR, FO가 핵심입니다. 별표와 괄호는 반복 범위를 뜻하므로 코 수 계산에 직접 영향을 줍니다.',
    pitfalls: '미국식과 영국식 코바늘 용어는 같은 이름이 다른 높이를 의미할 수 있습니다. 예를 들어 UK double crochet은 US single crochet과 대응합니다. 해외 도안을 사용할 때는 표기 체계를 확인하세요.',
    checklist: ['도안의 약어표 먼저 읽기', 'US/UK 표기 확인', '반복 구간 표시', '특수 기법 영상 확인', '완성 전 코 수 검산'],
    faq: [
      ['약어를 모두 외워야 하나요?', '자주 쓰는 10개 정도만 익히고 나머지는 도안 옆에 표를 두면 충분합니다.'],
      ['일본식 차트는 어떻게 읽나요?', '기호 범례를 먼저 보고, 원형인지 평면인지에 따라 읽는 방향을 확인합니다.'],
      ['BO와 bind off는 같은 뜻인가요?', '네. 대바늘에서 코를 마감하는 작업을 뜻합니다.']
    ],
    related: ['reading-patterns', 'crochet-basics', 'colorwork-basics']
  },
  {
    slug: 'colorwork-basics',
    date: '2026-04-20',
    category: '기법',
    title: '컬러워크 기초: 페어아일과 인타르시아 차이',
    description: '배색 뜨개의 대표 기법인 페어아일과 인타르시아의 차이, 실 관리, 장력 유지, 도안 선택 기준을 설명합니다.',
    intro: '컬러워크는 여러 색의 실로 무늬를 만드는 뜨개 기법입니다. 작은 반복 무늬에는 페어아일, 큰 색상 면에는 인타르시아가 주로 사용됩니다.',
    why: '두 기법을 구분하지 않으면 뒷면 실이 너무 길게 떠 있거나, 색 경계에 구멍이 생기거나, 편물이 심하게 오그라들 수 있습니다. 도안의 무늬 크기와 구조에 따라 적절한 기법을 골라야 합니다.',
    how: '페어아일은 사용하지 않는 실을 뒷면에 띄워가며 함께 진행합니다. 5~7코 이상 같은 색이 이어질 때는 중간에 실을 걸어 길게 늘어지지 않게 합니다. 인타르시아는 색 구역마다 작은 실타래를 사용하고 경계에서 실을 교차해 구멍을 막습니다.',
    pitfalls: '컬러워크의 핵심은 장력입니다. 뒷실을 너무 조이면 편물이 오그라들고, 너무 느슨하면 걸림이 생깁니다. 처음에는 두 색 대비가 분명한 작은 샘플로 연습하세요.',
    checklist: ['색 대비 확인', '작은 샘플 뜨기', '뒷실 길이 관리', '색 경계 교차 확인', '블로킹 후 무늬 확인'],
    faq: [
      ['페어아일은 몇 색까지 가능한가요?', '한 단에 두 색이 가장 안정적입니다. 세 색 이상은 장력이 어려워집니다.'],
      ['인타르시아를 원형으로 뜰 수 있나요?', '가능하지만 실 관리가 복잡해 초보자는 평면 작업부터 권장합니다.'],
      ['픽셀 도안은 어떤 기법이 좋나요?', '작은 반복 무늬는 페어아일, 큰 면 분할은 인타르시아가 잘 맞습니다.']
    ],
    related: ['reading-patterns', 'pattern', 'knitting-abbreviations']
  },
  {
    slug: 'yarn-care-guide',
    date: '2026-04-02',
    category: '관리',
    title: '뜨개 완성품 세탁과 보관 가이드',
    description: '울, 면, 아크릴, 알파카 등 소재별 세탁법과 건조, 보관, 보풀 관리 방법을 정리했습니다.',
    intro: '뜨개 작품은 만드는 시간만큼 관리도 중요합니다. 잘못 세탁하면 줄어들거나 늘어나고, 보관을 잘못하면 형태가 무너지거나 냄새가 밸 수 있습니다.',
    why: '손뜨개는 기성복보다 조직이 느슨하고 소재 특성이 크게 드러납니다. 특히 울은 마찰과 온도 변화에 약하고, 면은 물을 머금으면 무거워져 늘어질 수 있습니다.',
    how: '울과 알파카는 미지근한 물에 전용 세제를 풀어 눌러 세탁하고, 비비거나 비틀지 않습니다. 면과 아크릴은 비교적 관리가 쉽지만, 큰 작품은 눕혀 말려 형태를 유지하세요. 보관 전에는 완전히 건조하고 통풍되는 곳에 접어 보관합니다.',
    pitfalls: '옷걸이에 걸어두면 어깨가 늘어날 수 있습니다. 습한 상태로 접어두면 냄새나 곰팡이가 생길 수 있습니다. 보풀 제거기는 너무 강하게 사용하지 말고 표면을 가볍게 정리하세요.',
    checklist: ['실 라벨 세탁 기호 확인', '미지근한 물 사용', '비틀어 짜지 않기', '눕혀 말리기', '완전 건조 후 보관'],
    faq: [
      ['세탁기에 넣어도 되나요?', '슈퍼워시 울이나 아크릴처럼 라벨에 허용된 경우만 세탁망을 사용해 약하게 세탁하세요.'],
      ['뜨개 옷은 왜 눕혀 말리나요?', '젖은 편물은 무거워져 걸면 길게 늘어질 수 있기 때문입니다.'],
      ['보풀은 어떻게 관리하나요?', '손으로 뜯지 말고 보풀 제거기나 작은 가위로 표면만 조심스럽게 정리하세요.']
    ],
    related: ['yarn-fiber-guide', 'blocking-guide', 'winter-yarn-guide']
  },
  {
    slug: 'winter-yarn-guide',
    date: '2026-04-20',
    category: '실과 도구',
    title: '겨울 뜨개를 위한 실 선택 가이드',
    description: '메리노, 알파카, 캐시미어, 모헤어 등 겨울용 실의 보온성, 착용감, 관리법을 비교했습니다.',
    intro: '겨울 뜨개는 따뜻함뿐 아니라 착용감과 관리 편의성도 중요합니다. 목도리처럼 피부에 닿는 작품과 아우터 위에 입는 조끼는 필요한 실의 성격이 다릅니다.',
    why: '보온성이 높아도 피부에 거칠면 자주 입지 않게 됩니다. 반대로 너무 부드럽지만 내구성이 낮은 실은 자주 마찰되는 소품에 맞지 않을 수 있습니다.',
    how: '메리노는 부드럽고 탄성이 좋아 모자, 장갑, 스웨터에 잘 맞습니다. 알파카는 가볍고 따뜻하지만 늘어질 수 있어 숄과 루즈핏 가디건에 좋습니다. 모헤어는 얇은 실과 합사해 분위기를 더하고, 캐시미어는 작은 머플러나 선물용 소품에 적합합니다.',
    pitfalls: '털이 긴 실은 무늬가 흐려질 수 있으므로 복잡한 케이블보다 단순한 조직에 잘 맞습니다. 알파카나 캐시미어는 세탁과 마찰에 주의하고, 착용 빈도가 높은 소품은 내구성 있는 혼방을 선택하세요.',
    checklist: ['피부 접촉 여부 확인', '보온성과 무게 비교', '무늬 선명도 확인', '세탁 방법 확인', '혼방률 확인'],
    faq: [
      ['가장 따뜻한 실은 무엇인가요?', '알파카, 캐시미어, 울 계열이 따뜻합니다. 다만 작품 구조와 두께도 함께 영향을 줍니다.'],
      ['목도리는 어떤 소재가 좋나요?', '피부에 닿으므로 부드러운 메리노, 캐시미어 혼방, 고급 아크릴을 추천합니다.'],
      ['모헤어는 초보자에게 어렵나요?', '실이 엉키기 쉬워 푸르기 어렵습니다. 단순한 도안부터 시작하세요.']
    ],
    related: ['yarn-fiber-guide', 'yarn-care-guide', 'yarn-weight-guide']
  },
  {
    slug: 'knitting-tools-accessories',
    date: '2026-04-20',
    category: '실과 도구',
    title: '뜨개 소품과 도구 완전 정리',
    description: '가위, 돗바늘, 코 마커, 단수 카운터, 게이지 자, 실 와인더 등 뜨개 도구의 쓰임과 구매 우선순위를 정리했습니다.',
    intro: '뜨개 도구는 작품을 더 빠르고 정확하게 완성하도록 돕습니다. 하지만 처음부터 모든 도구를 살 필요는 없습니다. 자주 쓰는 필수품부터 하나씩 갖추면 됩니다.',
    why: '작은 도구 하나가 실수를 줄여줍니다. 코 마커는 반복 구간을 표시하고, 단수 카운터는 도안 위치를 잃지 않게 하며, 게이지 자는 완성 치수를 확인하게 해줍니다.',
    how: '입문 단계에서는 가위, 돗바늘, 코 마커, 줄자만 있어도 충분합니다. 의류를 뜨기 시작하면 게이지 자, 단수 카운터, 스티치 홀더가 유용합니다. 실을 많이 보관하거나 콘사를 쓴다면 실 와인더와 우산 실패도 고려할 수 있습니다.',
    pitfalls: '도구가 많아도 정리되지 않으면 찾느라 시간이 낭비됩니다. 작은 파우치나 케이스에 자주 쓰는 도구만 모아 프로젝트 백에 넣어두는 습관을 들이세요.',
    checklist: ['가위', '돗바늘', '코 마커', '줄자', '단수 카운터', '게이지 자'],
    faq: [
      ['단수 카운터가 꼭 필요한가요?', '필수는 아니지만 반복 무늬나 소매처럼 양쪽을 맞춰야 할 때 매우 유용합니다.'],
      ['코 마커 대신 다른 것을 써도 되나요?', '작은 링, 실 조각, 안전핀으로 대체할 수 있습니다.'],
      ['실 와인더는 언제 사면 좋나요?', '행크 실을 자주 사거나 여러 색을 많이 쓰기 시작할 때 구매해도 늦지 않습니다.']
    ],
    related: ['needle-types-guide', 'toolkit', 'beginners-guide']
  },
  {
    slug: '2026-knitting-trends',
    date: '2026-04-02',
    category: '트렌드',
    title: '2026 뜨개 트렌드 정리',
    description: '2026년에 주목할 뜨개 색감, 소재, 실루엣, 핸드메이드 소비 흐름과 실전 적용 아이디어를 정리했습니다.',
    intro: '2026년 뜨개 트렌드는 과장된 장식보다 오래 입을 수 있는 실루엣, 자연스러운 색감, 손맛이 느껴지는 텍스처에 초점이 맞춰져 있습니다.',
    why: '핸드메이드 작품은 빠르게 소비되는 패션과 달리 만드는 시간과 개인 취향이 반영됩니다. 그래서 유행을 그대로 따라가기보다 자신의 생활에 맞게 해석하는 것이 중요합니다.',
    how: '올해는 뉴트럴 색상에 포인트 컬러를 더한 배색, 모헤어 합사, 짧은 조끼와 루즈한 가디건, 텍스처가 있는 스카프가 활용도가 높습니다. 작은 소품으로 먼저 시도하면 부담이 적습니다.',
    pitfalls: '트렌디한 실만 보고 구매하면 실제 착용 빈도가 낮을 수 있습니다. 관리 방법, 피부 자극, 기존 옷과의 조합을 먼저 확인하세요.',
    checklist: ['자주 입는 색상 분석', '관리 가능한 소재 선택', '작은 소품으로 테스트', '기존 옷과 코디 확인', '무늬보다 착용감 우선'],
    faq: [
      ['올해 처음 시도하기 좋은 트렌드는 무엇인가요?', '모헤어 합사 스카프나 배색 비니처럼 작은 소품이 좋습니다.'],
      ['유행색을 꼭 써야 하나요?', '아닙니다. 오래 입을 수 있는 기본색에 작은 포인트만 더해도 충분합니다.'],
      ['트렌드 도안은 어디에 적용하면 좋나요?', '기존 기본 도안에 색상, 길이, 소매 폭만 바꿔도 새롭게 보입니다.']
    ],
    related: ['colorwork-basics', 'winter-yarn-guide', 'sustainable-knitting-slow-fashion']
  },
  {
    slug: '2026-crochet-fashion-trends',
    date: '2026-03-20',
    category: '트렌드',
    title: '2026년 크로셰 패션 트렌드 분석',
    description: '런웨이와 일상 패션에서 주목받는 크로셰 트렌드, 소재, 스타일링, 직접 만들 때의 팁을 정리했습니다.',
    intro: '크로셰는 여름 비치웨어를 넘어 사계절 스타일링에 쓰이는 수공예 텍스처로 확장되고 있습니다. 손으로 만든 듯한 불규칙성과 입체감이 패션의 포인트가 됩니다.',
    why: '크로셰는 기계 편직과 다른 구멍감, 두께, 모티프 연결 구조를 갖습니다. 그래서 같은 색상이라도 빛이 통과하며 독특한 질감을 보여줍니다.',
    how: '일상에서는 크로셰 가방, 베스트, 오픈워크 카디건처럼 한 가지 아이템만 포인트로 사용하는 것이 쉽습니다. 소재는 면과 리넨 혼방이 여름에 좋고, 울 혼방은 겨울 레이어드에 어울립니다.',
    pitfalls: '성긴 무늬는 늘어짐이 생길 수 있으므로 어깨끈이나 가방 손잡이는 단단한 조직으로 보강해야 합니다. 의류는 안감이나 이너와의 조합도 함께 생각해야 합니다.',
    checklist: ['착용 계절 정하기', '구멍감과 이너 고려', '늘어짐 보강', '모티프 연결 방식 확인', '세탁 후 형태 확인'],
    faq: [
      ['크로셰 의류는 초보자도 만들 수 있나요?', '간단한 베스트나 사각 모티프 조끼부터 시작하면 가능합니다.'],
      ['가방은 어떤 실이 좋나요?', '면, 리넨, 폴리에스터 혼방처럼 탄탄한 실이 좋습니다.'],
      ['런웨이 느낌을 일상에 적용하려면?', '큰 의류보다 작은 가방이나 모자 같은 포인트 소품이 쉽습니다.']
    ],
    related: ['crochet-basics', '2026-knitting-trends', 'sustainable-knitting-slow-fashion']
  },
  {
    slug: 'sustainable-knitting-slow-fashion',
    date: '2026-03-30',
    category: '라이프',
    title: '지속 가능한 패션과 뜨개질',
    description: '슬로우 패션 관점에서 손뜨개의 가치, 오래 입는 소재 선택, 수선과 리폼, 책임 있는 소비 방법을 다룹니다.',
    intro: '뜨개질은 옷을 빠르게 사서 버리는 방식과 다른 시간을 제안합니다. 실을 고르고, 게이지를 맞추고, 한 단씩 쌓아가는 과정에서 소비자는 제작자가 됩니다.',
    why: '직접 만든 옷은 제작 시간을 알기 때문에 쉽게 버리기 어렵습니다. 좋은 소재와 관리 방법을 선택하면 한 작품을 오래 입고 고쳐 쓰는 습관이 생깁니다.',
    how: '지속 가능성을 생각한다면 필요한 작품만 계획하고, 오래 입을 색과 형태를 고르세요. 남은 실은 모티프, 줄무늬, 수선용으로 보관하고, 낡은 니트는 단추 교체나 길이 수정으로 새롭게 사용할 수 있습니다.',
    pitfalls: '천연 소재가 항상 지속 가능한 것은 아닙니다. 생산 방식, 염색, 이동 거리, 관리 수명까지 함께 고려해야 합니다. 오래 입을 수 없다면 어떤 소재든 낭비가 될 수 있습니다.',
    checklist: ['정말 필요한 작품인지 확인', '오래 입을 디자인 선택', '남은 실 사용 계획', '세탁과 보관 방법 확인', '수선 가능성 고려'],
    faq: [
      ['아크릴은 지속 가능하지 않나요?', '석유 기반이지만 오래 사용하고 자주 세탁해야 하는 용도라면 실용적 선택이 될 수 있습니다.'],
      ['남은 실은 어떻게 쓰나요?', '모티프, 양말 뒤꿈치 보강, 배색 줄무늬, 선물 포장 장식에 활용할 수 있습니다.'],
      ['슬로우 패션의 핵심은 무엇인가요?', '적게 만들고 오래 쓰며, 수선 가능한 방식으로 관리하는 것입니다.']
    ],
    related: ['yarn-fiber-guide', 'yarn-care-guide', '2026-knitting-trends']
  },
  {
    slug: 'knitting-mental-health',
    date: '2026-03-30',
    category: '라이프',
    title: '뜨개질과 마음 건강',
    description: '반복적인 손동작이 주는 안정감, 집중 루틴, 성취감, 무리하지 않는 취미 생활을 위한 팁을 정리했습니다.',
    intro: '뜨개질은 결과물뿐 아니라 과정 자체가 주는 안정감이 큰 취미입니다. 반복적인 손동작과 눈에 보이는 진행은 바쁜 일상 속에서 작은 리듬을 만들어줍니다.',
    why: '한 코씩 쌓아가는 작업은 생각을 정리하고 호흡을 느리게 만드는 데 도움이 될 수 있습니다. 완성품이 생긴다는 점도 자기 효능감을 높이는 요소입니다.',
    how: '마음이 지친 날에는 복잡한 도안보다 단순한 가터뜨기, 짧은뜨기, 반복 무늬처럼 손이 기억하는 작업을 고르세요. 하루 10분만 정해도 루틴이 생기고, 작은 소품은 빠른 성취감을 줍니다.',
    pitfalls: '취미가 부담이 되면 오히려 스트레스가 됩니다. 완성 속도를 비교하거나 어려운 도안을 억지로 붙잡기보다, 현재 컨디션에 맞는 난이도를 선택하세요.',
    checklist: ['짧은 작업 시간 정하기', '단순한 반복 도안 준비', '편한 자세 유지', '손목 휴식 넣기', '완성보다 과정에 집중'],
    faq: [
      ['뜨개질이 정말 마음 안정에 도움이 되나요?', '사람마다 다르지만 반복 작업과 집중 루틴이 안정감을 주는 경우가 많습니다.'],
      ['초보자는 오히려 스트레스받지 않나요?', '처음에는 쉬운 도안과 굵은 실을 선택하면 부담을 줄일 수 있습니다.'],
      ['손목이 아프면 어떻게 하나요?', '작업을 멈추고 스트레칭하세요. 통증이 반복되면 도구와 자세를 바꿔야 합니다.']
    ],
    related: ['beginners-guide', 'knitting-tools-accessories', 'yarn-care-guide']
  },
  {
    slug: 'science-of-knitting-physics',
    date: '2026-03-30',
    category: '뜨개 과학',
    title: '뜨개질의 물리: 왜 니트는 잘 늘어날까?',
    description: '뜨개 조직의 루프 구조, 탄성, 드레이프, 실 소재와 게이지가 편물의 물성에 미치는 영향을 설명합니다.',
    intro: '니트가 직물보다 잘 늘어나는 이유는 실 자체가 고무처럼 늘어나서가 아니라, 루프 구조가 움직일 여지를 갖고 있기 때문입니다.',
    why: '뜨개 조직은 코들이 서로 걸려 있는 구조입니다. 힘이 가해지면 루프가 조금씩 재배치되며 길이와 폭이 변하고, 힘이 사라지면 실의 탄성과 구조가 원래 형태로 돌아가려 합니다.',
    how: '게이지가 느슨하면 루프 사이 공간이 커져 더 잘 늘어나고 드레이프가 생깁니다. 게이지가 촘촘하면 안정적이지만 뻣뻣할 수 있습니다. 울은 탄성이 좋아 회복력이 좋고, 면은 탄성이 낮아 늘어진 뒤 돌아오는 힘이 약합니다.',
    pitfalls: '같은 도안도 실과 바늘이 바뀌면 물성이 달라집니다. 가방처럼 형태 유지가 중요하면 촘촘한 게이지와 탄탄한 소재가 필요하고, 숄처럼 흐르는 느낌이 중요하면 드레이프가 좋은 소재가 어울립니다.',
    checklist: ['루프 구조 이해', '게이지 밀도 확인', '소재 탄성 확인', '완성품 용도 고려', '스와치로 늘어짐 테스트'],
    faq: [
      ['니트가 세탁 후 늘어나는 이유는 무엇인가요?', '물에 젖으면 실이 무거워지고 루프가 재배치되기 때문입니다.'],
      ['촘촘하게 뜨면 항상 좋은가요?', '형태는 안정적이지만 너무 뻣뻣해질 수 있어 용도에 맞춰야 합니다.'],
      ['블로킹은 물리적으로 무엇을 하나요?', '루프 위치를 정리하고 건조 과정에서 새로운 형태로 안정시키는 작업입니다.']
    ],
    related: ['gauge-swatch-guide', 'blocking-guide', 'yarn-fiber-guide']
  },
  {
    slug: 'knitting-history-spy',
    date: '2026-03-30',
    category: '뜨개 역사',
    title: '전쟁터의 스파이와 뜨개질 암호',
    description: '뜨개질이 역사 속에서 기록, 신호, 공동체 활동으로 사용된 이야기와 손작업 문화의 의미를 소개합니다.',
    intro: '뜨개질은 오랫동안 생활 기술이자 공동체 활동이었습니다. 전쟁과 사회 변화의 시기에는 단순한 취미를 넘어 물자를 만들고 정보를 나누는 행위로도 해석되었습니다.',
    why: '손작업은 조용하고 반복적이어서 겉으로는 평범해 보입니다. 그래서 역사 속 이야기에서는 뜨개 무늬나 작업 모임이 기록과 신호의 은유로 등장하기도 합니다.',
    how: '실제 역사 자료를 볼 때는 낭만적인 전설과 확인 가능한 사실을 구분해야 합니다. 군인을 위한 양말과 장갑 제작, 지역 여성들의 모금과 봉사, 손작업 모임의 사회적 역할은 비교적 분명하게 기록된 영역입니다.',
    pitfalls: '스파이 암호 이야기는 흥미롭지만 모든 사례가 검증된 것은 아닙니다. 역사 글을 읽을 때는 출처와 시대적 맥락을 확인하는 태도가 필요합니다.',
    checklist: ['생활 기술로서의 뜨개 이해', '전쟁 물자 제작 맥락 확인', '전설과 기록 구분', '공동체 활동 관점 보기', '현대 손뜨개 문화와 연결'],
    faq: [
      ['뜨개질이 실제로 전쟁에 쓰였나요?', '군인을 위한 양말, 장갑, 스웨터 제작처럼 물자 지원에는 널리 쓰였습니다.'],
      ['암호로 쓰였다는 이야기는 모두 사실인가요?', '일부 이야기는 전승에 가깝습니다. 확인 가능한 자료와 구분해서 보는 것이 좋습니다.'],
      ['역사 글이 뜨개인에게 왜 유용한가요?', '내가 하는 손작업이 어떤 문화와 연결되어 있는지 이해하게 해줍니다.']
    ],
    related: ['sustainable-knitting-slow-fashion', 'knitting-mental-health', 'aran-knitting-symbols']
  },
  {
    slug: 'aran-knitting-symbols',
    date: '2026-03-30',
    category: '뜨개 역사',
    title: '아란 무늬의 상징과 케이블 니트 이야기',
    description: '아란 니트의 대표 무늬, 케이블과 다이아몬드 패턴의 상징성, 현대적으로 활용하는 방법을 정리했습니다.',
    intro: '아란 니트는 굵은 케이블과 입체 무늬가 특징인 전통적인 니트 스타일입니다. 따뜻하고 튼튼한 조직감 덕분에 겨울 뜨개의 대표 이미지로 자리 잡았습니다.',
    why: '케이블, 다이아몬드, 벌집무늬는 시각적으로 풍성하고 보온성도 좋습니다. 무늬가 겹치며 원단이 두꺼워져 스웨터, 모자, 머플러에 깊이 있는 질감을 줍니다.',
    how: '초보자는 전체 케이블 스웨터보다 작은 머플러나 모자에서 4코 또는 6코 케이블을 연습하는 것이 좋습니다. 케이블 바늘을 사용하거나 코를 잠시 앞뒤로 보류해 교차를 만듭니다.',
    pitfalls: '케이블은 일반 메리야스보다 폭이 좁아지는 경향이 있습니다. 도안을 대체할 때는 반드시 게이지를 확인하고, 너무 복잡한 무늬는 실 색이 어두우면 잘 보이지 않을 수 있습니다.',
    checklist: ['밝은색 실 선택', '간단한 케이블부터 연습', '게이지 수축 확인', '케이블 바늘 준비', '블로킹으로 무늬 정리'],
    faq: [
      ['케이블 바늘이 꼭 필요한가요?', '초보자는 사용하는 편이 안전합니다. 익숙해지면 바늘 없이도 가능합니다.'],
      ['아란 무늬는 어떤 실이 좋나요?', '탄성이 있는 울 계열 중간 굵기 이상이 무늬를 선명하게 보여줍니다.'],
      ['코바늘로도 아란 느낌을 낼 수 있나요?', '프런트 포스트 기법 등으로 입체적인 케이블 느낌을 만들 수 있습니다.']
    ],
    related: ['needle-types-guide', 'winter-yarn-guide', 'reading-patterns']
  }
];

const articleMap = new Map(articles.map((article) => [article.slug, article]));

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function relatedLinks(article) {
  return article.related
    .map((slug) => {
      const related = articleMap.get(slug);
      if (!related) {
        const label = slug === 'toolkit' ? '게이지 계산기' : slug === 'pattern' ? '도안 생성기' : slug;
        return `<a href="/${slug}.html">${escapeHtml(label)}</a>`;
      }
      return `<a href="/magazine/${related.slug}.html">${escapeHtml(related.title)}</a>`;
    })
    .join('\n          ');
}

function renderExtra(article) {
  if (!article.extra) return '<!-- No extra article sections. -->';

  return article.extra.map((section) => {
    const body = section.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n        ');
    const table = section.table ? `
        <div class="article-table-wrap">
          <table class="article-table">
            <thead><tr>${section.table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
            <tbody>
              ${section.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('\n              ')}
            </tbody>
          </table>
        </div>` : '';

    return `<h2>${escapeHtml(section.title)}</h2>
        ${body}${table}`;
  }).join('\n\n        ');
}

function articleHtml(article) {
  const canonical = `${site}/magazine/${article.slug}.html`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    inLanguage: 'ko-KR',
    author: { '@type': 'Organization', name: publisher },
    publisher: { '@type': 'Organization', name: publisher, url: `${site}/` },
    datePublished: article.date,
    dateModified: today,
    mainEntityOfPage: canonical,
    url: canonical
  };

  return `<!doctype html>
<html lang="ko">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-KSBJ5J8N4K"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-KSBJ5J8N4K');
  </script>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/favicon.png" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="canonical" href="${canonical}" />
  <title>${escapeHtml(article.title)} | SSUESSUE KNITS 매거진</title>
  <meta name="description" content="${escapeHtml(article.description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${escapeHtml(article.title)}">
  <meta property="og:description" content="${escapeHtml(article.description)}">
  <meta property="og:image" content="${site}/og-image.png">
  <meta property="article:published_time" content="${article.date}">
  <meta property="article:modified_time" content="${today}">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <link rel="preload" href="/fonts/GmarketSansTTFBold.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/GmarketSansTTFMedium.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/GmarketSansTTFLight.woff2" as="font" type="font/woff2" crossorigin>
  <link href="/style.css?v=13" rel="stylesheet">
  <style>
    .article-wrap { max-width: 820px; margin: 0 auto; padding: 2.75rem 1.25rem 4.5rem; }
    .article-hero { border-bottom: 2px solid #111; padding-bottom: 1.35rem; margin-bottom: 2.25rem; }
    .article-category { display: inline-block; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; border: 1.5px solid #111; padding: 0.22rem 0.62rem; margin-bottom: 0.85rem; }
    .article-title { font-family: 'GmarketSans', sans-serif; font-size: clamp(1.65rem, 4vw, 2.35rem); line-height: 1.35; font-weight: 900; margin: 0 0 0.85rem; letter-spacing: 0; word-break: keep-all; }
    .article-meta { color: #666; font-size: 0.86rem; margin: 0; }
    .article-body { color: #303030; font-size: 1rem; line-height: 1.95; word-break: keep-all; }
    .article-body h2 { font-family: 'GmarketSans', sans-serif; color: #111; font-size: 1.22rem; line-height: 1.45; margin: 2.5rem 0 0.8rem; padding-bottom: 0.45rem; border-bottom: 1px solid #ddd; }
    .article-body p { margin: 0 0 1rem; }
    .article-body ul { margin: 0 0 1.2rem; padding-left: 1.2rem; }
    .article-body li { margin-bottom: 0.38rem; }
    .info-box { border: 1.5px solid #111; padding: 1rem 1.15rem; margin: 1.5rem 0; background: #fafafa; }
    .info-box strong { display: block; margin-bottom: 0.45rem; color: #111; }
    .article-table-wrap { overflow-x: auto; margin: 1.25rem 0 1.6rem; }
    .article-table { width: 100%; border-collapse: collapse; min-width: 560px; font-size: 0.92rem; }
    .article-table th { background: #111; color: #fff; text-align: left; padding: 0.7rem 0.85rem; }
    .article-table td { border-bottom: 1px solid #e5e5e5; padding: 0.72rem 0.85rem; vertical-align: top; }
    .article-table tr:last-child td { border-bottom: 1px solid #111; }
    .faq-item { border-top: 1px solid #e5e5e5; padding: 1rem 0; }
    .faq-item:last-child { border-bottom: 1px solid #e5e5e5; }
    .faq-item h3 { font-size: 0.98rem; color: #111; margin: 0 0 0.35rem; }
    .faq-item p { margin: 0; color: #555; }
    .related-links { display: grid; gap: 0.5rem; margin-top: 1rem; }
    .related-links a { color: #111; font-weight: 800; text-decoration: none; border-bottom: 1px solid #ddd; padding-bottom: 0.45rem; }
    .related-links a:hover { text-decoration: underline; }
    .article-nav { display: flex; justify-content: space-between; gap: 1rem; margin-top: 3rem; padding-top: 1.5rem; border-top: 2px solid #111; }
    .article-nav a { color: #111; font-weight: 800; text-decoration: none; }
    .article-nav a:hover { text-decoration: underline; }
    @media (max-width: 640px) {
      .article-wrap { padding-inline: 1rem; }
      .article-body { font-size: 0.95rem; line-height: 1.9; }
      .article-nav { flex-direction: column; }
    }
  </style>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2930322697184296" crossorigin="anonymous"></script>
  <meta name="google-adsense-account" content="ca-pub-2930322697184296">
  <script>
    window.addEventListener("load", function() {
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window,document,"clarity","script","vsvc6kadap");
    });
  </script>
</head>
<body>
  <script type="module" src="/js/header.js?v=11"></script>
  <main class="article-wrap">
    <article>
      <header class="article-hero">
        <span class="article-category">${escapeHtml(article.category)}</span>
        <h1 class="article-title">${escapeHtml(article.title)}</h1>
        <p class="article-meta">${article.date.replace(/-/g, '.')} · SSUESSUE KNITS 편집팀</p>
      </header>
      <div class="article-body">
        <p>${escapeHtml(article.intro)}</p>

        <h2>왜 중요한가요?</h2>
        <p>${escapeHtml(article.why)}</p>

        <h2>실전 적용 방법</h2>
        <p>${escapeHtml(article.how)}</p>

        <h2>초보자가 자주 놓치는 부분</h2>
        <p>${escapeHtml(article.pitfalls)}</p>

        ${renderExtra(article)}

        <div class="info-box">
          <strong>작업 전 체크리스트</strong>
          <ul>
            ${article.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n            ')}
          </ul>
        </div>

        <h2>자주 묻는 질문</h2>
        ${article.faq.map(([question, answer]) => `<div class="faq-item"><h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p></div>`).join('\n        ')}

        <h2>관련해서 읽으면 좋은 글</h2>
        <div class="related-links">
          ${relatedLinks(article)}
        </div>
      </div>
    </article>
    <nav class="article-nav" aria-label="Article navigation">
      <a href="/magazine.html">매거진 목록</a>
      <a href="/">SSUESSUE KNITS 홈</a>
    </nav>
  </main>
  <footer class="site-footer">
    <div class="footer-inner">
      <span class="footer-brand">SSUESSUE KNITS</span>
      <nav class="footer-nav">
        <a href="/about.html">소개</a>
        <a href="/guide.html">이용안내</a>
        <a href="/terms.html">이용약관</a>
        <a href="/privacy.html">개인정보처리방침</a>
      </nav>
    </div>
    <p class="copyright">&copy; 2026 SSUESSUE KNITS. All rights reserved.</p>
  </footer>
  <script type="module" src="/js/cookie-consent.js"></script>
  <script src="/js/scroll-top.js"></script>
</body>
</html>
`;
}

for (const article of articles) {
  fs.writeFileSync(path.join(magazineDir, `${article.slug}.html`), articleHtml(article), 'utf8');
}

console.log(`Generated ${articles.length} magazine articles.`);
