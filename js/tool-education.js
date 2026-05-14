const guideContent = {
  pattern: {
    title: '사진을 뜨개 도안으로 바꾸기 전에 알아둘 점',
    intro: '도안 생성기는 이미지를 바로 코와 단의 격자로 바꿔주지만, 좋은 결과를 얻으려면 원본 사진, 색상 수, 게이지를 함께 조정해야 합니다. 특히 인물 사진이나 복잡한 풍경은 색이 많고 경계가 흐려서 그대로 변환하면 실제 뜨개 작업에서 구분하기 어려울 수 있습니다.',
    tips: [
      '처음에는 배경이 단순하고 명암 대비가 분명한 이미지를 선택하세요.',
      '사용할 실 색상 수를 4~8색 정도로 제한하면 실제 작업 난이도가 낮아집니다.',
      '완성 크기를 정한 뒤 게이지를 입력해야 코 수와 단 수가 현실적인 범위로 계산됩니다.',
      '작은 소품은 세부 묘사를 줄이고, 큰 담요나 월행잉은 더 많은 칸을 사용할 수 있습니다.'
    ],
    links: [
      ['/magazine/colorwork-basics.html', '컬러워크 기초: 페어아일과 인타르시아 차이'],
      ['/magazine/reading-patterns.html', '뜨개 도안 읽는 법'],
      ['/magazine/gauge-swatch-guide.html', '게이지 스와치 완벽 가이드']
    ]
  },
  toolkit: {
    title: '게이지 계산과 단수 기록을 함께 써야 하는 이유',
    intro: '뜨개 프로젝트에서 가장 자주 생기는 문제는 완성 크기가 도안과 달라지는 일입니다. 게이지 계산기는 내 손의 장력에 맞춰 코 수와 단 수를 보정하고, 단수 카운터는 작업 중 위치를 잃지 않도록 도와줍니다. 두 도구를 함께 쓰면 도안 준비와 실제 작업 사이의 오차를 줄일 수 있습니다.',
    tips: [
      '스와치는 도안과 같은 실, 같은 바늘, 같은 기법으로 15cm 이상 떠서 측정하세요.',
      '의류는 코 수뿐 아니라 단 수도 기록해야 총장, 소매 길이, 암홀 위치가 맞습니다.',
      '반복 무늬가 있는 도안은 계산된 코 수를 반복 단위에 맞춰 조정하세요.',
      '작업을 멈출 때마다 현재 단과 반복 위치를 기록하면 다시 시작하기 쉽습니다.'
    ],
    links: [
      ['/magazine/gauge-swatch-guide.html', '게이지 스와치 완벽 가이드'],
      ['/magazine/blocking-guide.html', '블로킹이란? 완성도를 높이는 마무리 기술'],
      ['/magazine/knitting-tools-accessories.html', '뜨개 소품과 도구 완전 정리']
    ]
  },
  palette: {
    title: '배색을 고를 때 확인해야 할 기준',
    intro: '배색은 예쁜 색을 많이 고르는 것보다 서로 구분되는 색을 고르는 일이 더 중요합니다. 실제 뜨개에서는 실의 털, 조직의 그림자, 조명 때문에 화면에서 보던 색 대비가 약해질 수 있습니다. 배색 도우미는 색 조합을 미리 비교하고 컬러워크 도안에 맞는 팔레트를 정리하는 데 사용할 수 있습니다.',
    tips: [
      '무늬 색과 배경 색의 명도 차이가 충분한지 먼저 확인하세요.',
      '처음 컬러워크를 한다면 한 단에 두 색만 사용하는 조합이 안정적입니다.',
      '털이 긴 실은 무늬 경계가 흐려질 수 있어 단순한 배색에 잘 맞습니다.',
      '실제 실을 쓰기 전 작은 샘플을 떠서 색이 겹쳐 보이지 않는지 확인하세요.'
    ],
    links: [
      ['/magazine/colorwork-basics.html', '컬러워크 기초: 페어아일과 인타르시아 차이'],
      ['/magazine/yarn-fiber-guide.html', '실 소재별 특성 완전 가이드'],
      ['/magazine/2026-knitting-trends.html', '2026 뜨개 트렌드 정리']
    ]
  },
  tools: {
    title: 'SSUESSUE KNITS 도구를 활용하는 추천 순서',
    intro: '뜨개 도구는 각각 따로 쓰기보다 프로젝트 흐름에 맞춰 함께 사용할 때 효과가 큽니다. 먼저 만들고 싶은 작품의 실과 크기를 정하고, 게이지를 계산한 뒤, 필요한 경우 색상과 도안을 조정하고, 실제 작업에서는 단수와 반복 위치를 기록하세요.',
    tips: [
      '입문자는 매거진의 기본 글을 먼저 읽고 작은 소품부터 시작하는 것이 좋습니다.',
      '도안 생성 전에는 실 굵기와 완성 크기를 정해야 결과가 현실적입니다.',
      '게이지 계산 결과는 프로젝트 메모에 남겨 다음 작품에도 참고하세요.',
      '도구 사용 중 막히는 부분은 관련 가이드를 함께 읽으면 원리를 이해하기 쉽습니다.'
    ],
    links: [
      ['/magazine/beginners-guide.html', '뜨개질 입문 완전 가이드'],
      ['/magazine/yarn-weight-guide.html', '실 굵기 완벽 가이드'],
      ['/magazine/reading-patterns.html', '뜨개 도안 읽는 법']
    ]
  }
};

const pageType = document.currentScript?.dataset.page;
const data = guideContent[pageType];

if (data) {
  const main = document.querySelector('main');
  if (main) {
    const section = document.createElement('section');
    section.className = 'tool-education';
    section.innerHTML = `
      <div class="tool-education-inner">
        <div>
          <p class="tool-education-kicker">Knitting Guide</p>
          <h2>${data.title}</h2>
          <p>${data.intro}</p>
        </div>
        <div class="tool-education-grid">
          <div class="tool-education-box">
            <h3>사용 전 체크포인트</h3>
            <ul>${data.tips.map((tip) => `<li>${tip}</li>`).join('')}</ul>
          </div>
          <div class="tool-education-box">
            <h3>함께 읽으면 좋은 글</h3>
            <div class="tool-education-links">
              ${data.links.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    main.appendChild(section);
  }
}
